-- Enhanced schema for secure face embedding storage
-- This extends the existing database.sql with secure embedding storage

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create face embeddings table with security features
CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES records(id) ON DELETE CASCADE,
    
    -- Encrypted embedding storage (using pgcrypto)
    embedding_encrypted BYTEA, -- Encrypted 128D vector
    embedding_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for quick lookup
    
    -- Vector storage for similarity search (optional, for search performance)
    embedding_vector vector(128), -- Unencrypted for pgvector similarity search
    
    -- Metadata
    extraction_method VARCHAR(50) DEFAULT 'face-api.js',
    quality_score DECIMAL(3,2), -- 0.0-1.0 quality assessment
    detection_confidence DECIMAL(3,2), -- Detection confidence
    
    -- Security and audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Privacy flags
    consent_given BOOLEAN DEFAULT FALSE,
    retention_expires TIMESTAMP WITH TIME ZONE,
    anonymized BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_quality_score CHECK (quality_score >= 0 AND quality_score <= 1),
    CONSTRAINT valid_confidence CHECK (detection_confidence >= 0 AND detection_confidence <= 1),
    CONSTRAINT unique_record_embedding UNIQUE(record_id, embedding_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS face_embeddings_record_idx ON face_embeddings (record_id);
CREATE INDEX IF NOT EXISTS face_embeddings_hash_idx ON face_embeddings (embedding_hash);
CREATE INDEX IF NOT EXISTS face_embeddings_created_idx ON face_embeddings (created_at);

-- Vector similarity index (for fast similarity search)
CREATE INDEX IF NOT EXISTS face_embeddings_vector_idx ON face_embeddings 
USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Audit table for tracking access
CREATE TABLE IF NOT EXISTS face_embedding_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    embedding_id UUID REFERENCES face_embeddings(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES auth.users(id),
    access_type VARCHAR(20), -- 'search', 'verify', 'update', 'delete'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_embedding_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own embeddings
CREATE POLICY "Users can access own embeddings" ON face_embeddings
    FOR ALL USING (created_by = auth.uid());

-- Policy: Admin users can access all embeddings
CREATE POLICY "Admin full access" ON face_embeddings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Service role can access for system operations
CREATE POLICY "Service role access" ON face_embeddings
    FOR ALL USING (auth.role() = 'service_role');

-- Access log policies
CREATE POLICY "Users can view own access logs" ON face_embedding_access_log
    FOR SELECT USING (accessed_by = auth.uid());

CREATE POLICY "System can insert access logs" ON face_embedding_access_log
    FOR INSERT WITH CHECK (true);

-- Function to encrypt embeddings
CREATE OR REPLACE FUNCTION encrypt_embedding(
    embedding_array FLOAT[],
    encryption_key TEXT DEFAULT NULL
) RETURNS BYTEA AS $$
DECLARE
    key_to_use TEXT;
    embedding_json TEXT;
BEGIN
    -- Use provided key or generate from app secret
    key_to_use := COALESCE(encryption_key, encode(digest('face_embedding_key' || current_setting('app.jwt_secret', true), 'sha256'), 'hex'));
    
    -- Convert array to JSON string
    embedding_json := array_to_json(embedding_array)::TEXT;
    
    -- Encrypt using AES
    RETURN pgp_sym_encrypt(embedding_json, key_to_use);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt embeddings
CREATE OR REPLACE FUNCTION decrypt_embedding(
    encrypted_data BYTEA,
    encryption_key TEXT DEFAULT NULL
) RETURNS FLOAT[] AS $$
DECLARE
    key_to_use TEXT;
    decrypted_json TEXT;
BEGIN
    -- Use provided key or generate from app secret
    key_to_use := COALESCE(encryption_key, encode(digest('face_embedding_key' || current_setting('app.jwt_secret', true), 'sha256'), 'hex'));
    
    -- Decrypt
    decrypted_json := pgp_sym_decrypt(encrypted_data, key_to_use);
    
    -- Convert back to array
    RETURN ARRAY(SELECT json_array_elements_text(decrypted_json::json)::FLOAT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to securely store embedding
CREATE OR REPLACE FUNCTION store_face_embedding(
    p_record_id UUID,
    p_embedding FLOAT[],
    p_quality_score DECIMAL DEFAULT NULL,
    p_detection_confidence DECIMAL DEFAULT NULL,
    p_consent_given BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    embedding_id UUID;
    embedding_hash VARCHAR(64);
BEGIN
    -- Generate hash for the embedding
    embedding_hash := encode(digest(array_to_string(p_embedding, ','), 'sha256'), 'hex');
    
    -- Insert with encryption
    INSERT INTO face_embeddings (
        record_id,
        embedding_encrypted,
        embedding_hash,
        embedding_vector,
        quality_score,
        detection_confidence,
        consent_given,
        created_by,
        retention_expires
    ) VALUES (
        p_record_id,
        encrypt_embedding(p_embedding),
        embedding_hash,
        p_embedding::vector(128), -- Store unencrypted for similarity search
        p_quality_score,
        p_detection_confidence,
        p_consent_given,
        auth.uid(),
        NOW() + INTERVAL '7 years' -- Default retention period
    ) RETURNING id INTO embedding_id;
    
    RETURN embedding_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for similarity search with audit logging
CREATE OR REPLACE FUNCTION find_similar_faces(
    p_query_embedding FLOAT[],
    p_similarity_threshold DECIMAL DEFAULT 0.8,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    record_id UUID,
    similarity_score DECIMAL,
    embedding_id UUID,
    quality_score DECIMAL
) AS $$
BEGIN
    -- Log the search
    INSERT INTO face_embedding_access_log (
        embedding_id, accessed_by, access_type, success
    ) SELECT 
        fe.id, auth.uid(), 'search', true
    FROM face_embeddings fe 
    WHERE fe.embedding_vector <=> p_query_embedding::vector(128) < (1 - p_similarity_threshold)
    LIMIT p_limit;
    
    -- Return similar faces
    RETURN QUERY
    SELECT 
        fe.record_id,
        (1 - (fe.embedding_vector <=> p_query_embedding::vector(128)))::DECIMAL as similarity_score,
        fe.id as embedding_id,
        fe.quality_score
    FROM face_embeddings fe
    WHERE fe.embedding_vector <=> p_query_embedding::vector(128) < (1 - p_similarity_threshold)
        AND fe.consent_given = true
        AND (fe.retention_expires IS NULL OR fe.retention_expires > NOW())
        AND fe.anonymized = false
    ORDER BY fe.embedding_vector <=> p_query_embedding::vector(128)
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired embeddings (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_embeddings() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM face_embeddings 
    WHERE retention_expires IS NOT NULL 
        AND retention_expires < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update access tracking
CREATE OR REPLACE FUNCTION update_embedding_access() RETURNS TRIGGER AS $$
BEGIN
    UPDATE face_embeddings 
    SET 
        last_accessed = NOW(),
        access_count = access_count + 1
    WHERE id = NEW.embedding_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER embedding_access_trigger
    AFTER INSERT ON face_embedding_access_log
    FOR EACH ROW
    EXECUTE FUNCTION update_embedding_access();

-- Create scheduled job to clean expired embeddings (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-embeddings', '0 2 * * *', 'SELECT cleanup_expired_embeddings();');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON face_embeddings TO authenticated;
GRANT SELECT, INSERT ON face_embedding_access_log TO authenticated;
GRANT EXECUTE ON FUNCTION store_face_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_faces TO authenticated;
