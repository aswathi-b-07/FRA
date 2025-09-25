const axios = require('axios');

class NERService {
  constructor() {
    this.huggingFaceApiUrl = 'https://api-inference.huggingface.co/models/dbmdz/bert-large-cased-finetuned-conll03-english';
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    if (process.env.HUGGINGFACE_API_KEY) {
      console.log('Hugging Face NER service initialized');
    } else {
      console.warn('Hugging Face API key not provided, using mock NER responses');
    }
    
    this.initialized = true;
  }

  async extractEntities(text) {
    this.initialize();

    if (!text || typeof text !== 'string') {
      return [];
    }

    // If no API key, return mock entities
    if (!process.env.HUGGINGFACE_API_KEY) {
      return this.getMockEntities(text);
    }

    try {
      const response = await axios.post(
        this.huggingFaceApiUrl,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && Array.isArray(response.data)) {
        return this.processHuggingFaceEntities(response.data);
      } else {
        console.warn('Unexpected Hugging Face response format, using mock entities');
        return this.getMockEntities(text);
      }

    } catch (error) {
      console.error('Hugging Face NER API error:', error.message);
      // Fallback to mock entities
      return this.getMockEntities(text);
    }
  }

  processHuggingFaceEntities(entities) {
    // Group consecutive entities of the same type
    const processedEntities = [];
    let currentEntity = null;

    for (const entity of entities) {
      const entityType = entity.entity_group || entity.entity;
      const word = entity.word;
      const confidence = entity.score;

      if (currentEntity && 
          currentEntity.entity_group === entityType && 
          entity.start === currentEntity.end) {
        // Continue the current entity
        currentEntity.word += word.startsWith('##') ? word.slice(2) : ` ${word}`;
        currentEntity.end = entity.end;
        currentEntity.confidence = Math.min(currentEntity.confidence, confidence);
      } else {
        // Start a new entity
        if (currentEntity) {
          processedEntities.push(currentEntity);
        }
        currentEntity = {
          entity_group: entityType,
          word: word.startsWith('##') ? word.slice(2) : word,
          start: entity.start,
          end: entity.end,
          confidence: confidence
        };
      }
    }

    if (currentEntity) {
      processedEntities.push(currentEntity);
    }

    // Filter entities with confidence above threshold
    return processedEntities.filter(entity => entity.confidence > 0.5);
  }

  getMockEntities(text) {
    const entities = [];
    
    // Mock person name extraction
    const personPatterns = [
      /\b[A-Z][a-z]+ (?:Kumar|Singh|Devi|Lal|Reddy|Nair|Sharma|Gupta|Yadav)\b/g,
      /\b(?:Mr|Mrs|Ms)\.?\s+[A-Z][a-z]+ [A-Z][a-z]+\b/g
    ];

    personPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity_group: 'PER',
          word: match[0].trim(),
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85
        });
      }
    });

    // Mock location extraction
    const locationPatterns = [
      /\b(?:Madhya Pradesh|Tripura|Odisha|Telangana)\b/g,
      /\b(?:Bhopal|Indore|Gwalior|Jabalpur|Agartala|Udaipur|Bhubaneswar|Cuttack|Hyderabad|Warangal|Khammam)\b/g,
      /\b[A-Z][a-z]+(?:pur|bad|garh|nagar|gram|village)\b/g
    ];

    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity_group: 'LOC',
          word: match[0].trim(),
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.80
        });
      }
    });

    // Mock organization extraction
    const orgPatterns = [
      /\b(?:Forest Department|Revenue Department|Gram Sabha|Panchayat|District Collector)\b/g,
      /\b[A-Z][a-z]+ (?:Department|Office|Committee|Board)\b/g
    ];

    orgPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity_group: 'ORG',
          word: match[0].trim(),
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.75
        });
      }
    });

    // Mock miscellaneous entities (dates, numbers, etc.)
    const miscPatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, // Dates
      /\b\d+\.?\d*\s*(?:acre|hectare|ha)\b/gi,   // Land areas
      /\b[A-Z]{2,}\d+\b/g                        // Document numbers
    ];

    miscPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity_group: 'MISC',
          word: match[0].trim(),
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.70
        });
      }
    });

    // Sort entities by position in text
    return entities.sort((a, b) => a.start - b.start);
  }

  // Additional utility methods for FRA-specific entity extraction
  extractFRASpecificEntities(text) {
    const fraEntities = [];

    // Extract Patta IDs
    const pattaPattern = /\b(?:Patta|patta)\s*(?:No\.?|Number|ID)?\s*:?\s*([A-Z0-9\/\-]+)\b/gi;
    let match;
    while ((match = pattaPattern.exec(text)) !== null) {
      fraEntities.push({
        type: 'PATTA_ID',
        value: match[1],
        confidence: 0.9
      });
    }

    // Extract Survey Numbers
    const surveyPattern = /\b(?:Survey|survey)\s*(?:No\.?|Number)?\s*:?\s*([A-Z0-9\/\-]+)\b/gi;
    while ((match = surveyPattern.exec(text)) !== null) {
      fraEntities.push({
        type: 'SURVEY_NUMBER',
        value: match[1],
        confidence: 0.85
      });
    }

    // Extract Land Types
    const landTypePattern = /\b(agricultural|residential|forest|barren|cultivable|non-cultivable)\s*land\b/gi;
    while ((match = landTypePattern.exec(text)) !== null) {
      fraEntities.push({
        type: 'LAND_TYPE',
        value: match[1],
        confidence: 0.8
      });
    }

    // Extract Coordinates
    const coordPattern = /\b(\d+\.?\d*)[°\s]*[NS]?\s*[,\s]\s*(\d+\.?\d*)[°\s]*[EW]?\b/gi;
    while ((match = coordPattern.exec(text)) !== null) {
      fraEntities.push({
        type: 'COORDINATES',
        value: { lat: parseFloat(match[1]), lng: parseFloat(match[2]) },
        confidence: 0.75
      });
    }

    return fraEntities;
  }

  // Method to validate extracted entities against FRA context
  validateFRAEntities(entities) {
    const validatedEntities = [];

    entities.forEach(entity => {
      let isValid = true;
      let validationType = 'GENERAL';

      // Validate person names (should not be common words)
      if (entity.entity_group === 'PER') {
        const commonWords = ['forest', 'land', 'village', 'district', 'area'];
        if (commonWords.some(word => entity.word.toLowerCase().includes(word))) {
          isValid = false;
        } else {
          validationType = 'PERSON_NAME';
        }
      }

      // Validate locations (should be real places in target states)
      if (entity.entity_group === 'LOC') {
        const targetStates = ['madhya pradesh', 'tripura', 'odisha', 'telangana'];
        const knownPlaces = [
          'bhopal', 'indore', 'gwalior', 'jabalpur', 'ujjain',
          'agartala', 'udaipur', 'dharmanagar',
          'bhubaneswar', 'cuttack', 'puri', 'berhampur',
          'hyderabad', 'warangal', 'nizamabad', 'khammam'
        ];
        
        const entityLower = entity.word.toLowerCase();
        if (targetStates.includes(entityLower) || 
            knownPlaces.includes(entityLower) ||
            entityLower.includes('village') ||
            entityLower.includes('gram')) {
          validationType = 'LOCATION';
        }
      }

      // Validate organizations
      if (entity.entity_group === 'ORG') {
        const fraOrgs = ['forest department', 'revenue department', 'gram sabha', 'panchayat'];
        if (fraOrgs.some(org => entity.word.toLowerCase().includes(org))) {
          validationType = 'FRA_ORGANIZATION';
        }
      }

      if (isValid) {
        validatedEntities.push({
          ...entity,
          validation: validationType
        });
      }
    });

    return validatedEntities;
  }
}

module.exports = new NERService();
