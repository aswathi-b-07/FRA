-- Fix Row Level Security Policies for FRA Database

-- Enable RLS on records table (if not already enabled)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert records" ON records;
DROP POLICY IF EXISTS "Users can view records" ON records;
DROP POLICY IF EXISTS "Users can update records" ON records;
DROP POLICY IF EXISTS "Users can delete records" ON records;

-- Create permissive policies for authenticated users
CREATE POLICY "Users can insert records" ON records
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Users can view records" ON records
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Users can update records" ON records
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can delete records" ON records
    FOR DELETE 
    TO authenticated 
    USING (true);

-- Also enable RLS and create policies for other tables
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage conflicts" ON conflicts
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fraud alerts" ON fraud_alerts
    FOR SELECT 
    TO authenticated 
    USING (true);

ALTER TABLE gram_sabha_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage gram sabha sessions" ON gram_sabha_sessions
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

ALTER TABLE policy_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage policy recommendations" ON policy_recommendations
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Create storage bucket for face images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('face-images', 'face-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for face images bucket
CREATE POLICY "Users can upload face images" ON storage.objects
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'face-images');

CREATE POLICY "Anyone can view face images" ON storage.objects
    FOR SELECT 
    TO public 
    USING (bucket_id = 'face-images');

CREATE POLICY "Users can update face images" ON storage.objects
    FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'face-images')
    WITH CHECK (bucket_id = 'face-images');

CREATE POLICY "Users can delete face images" ON storage.objects
    FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'face-images');
