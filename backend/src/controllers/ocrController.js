const Tesseract = require('tesseract.js');
const axios = require('axios');
const nerService = require('../services/nerService');

const ocrController = {
  // Process document with OCR and NER
  processDocument: async (req, res) => {
    try {
      if (!req.files || !req.files.document) {
        return res.status(400).json({ error: 'No document file provided' });
      }

      const documentFile = req.files.document;
      const useGoogleVision = req.body.useGoogleVision === 'true';

      let extractedText = '';

      if (useGoogleVision && process.env.GOOGLE_VISION_API_KEY) {
        // Use Google Cloud Vision API
        try {
          extractedText = await processWithGoogleVision(documentFile.data);
        } catch (visionError) {
          console.error('Google Vision error, falling back to Tesseract:', visionError);
          extractedText = await processWithTesseract(documentFile.data);
        }
      } else {
        // Use Tesseract.js
        extractedText = await processWithTesseract(documentFile.data);
      }

      // Apply NER to extract entities
      const entities = await nerService.extractEntities(extractedText);

      // Parse extracted entities into structured data
      const structuredData = parseEntities(entities, extractedText);

      res.json({
        success: true,
        extractedText,
        entities,
        structuredData
      });

    } catch (error) {
      console.error('OCR processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process document',
        details: error.message 
      });
    }
  },

  // Process text only (no file upload)
  processText: async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }

      // Apply NER to extract entities
      const entities = await nerService.extractEntities(text);

      // Parse extracted entities into structured data
      const structuredData = parseEntities(entities, text);

      res.json({
        success: true,
        extractedText: text,
        entities,
        structuredData
      });

    } catch (error) {
      console.error('Text processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process text',
        details: error.message 
      });
    }
  }
};

// Helper function to process with Tesseract.js
async function processWithTesseract(imageBuffer) {
  const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
    logger: m => console.log(m)
  });
  return text;
}

// Helper function to process with Google Vision API
async function processWithGoogleVision(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');
  
  const response = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      requests: [{
        image: {
          content: base64Image
        },
        features: [{
          type: 'TEXT_DETECTION',
          maxResults: 1
        }]
      }]
    }
  );

  if (response.data.responses[0].textAnnotations) {
    return response.data.responses[0].textAnnotations[0].description;
  } else {
    throw new Error('No text found in image');
  }
}

// Helper function to parse entities into structured data
function parseEntities(entities, text) {
  const structuredData = {
    name: '',
    fatherName: '',
    village: '',
    district: '',
    state: '',
    pattaId: '',
    surveyNumber: '',
    landArea: '',
    coordinates: null
  };

  // Extract person names
  const persons = entities.filter(e => e.entity_group === 'PER' || e.entity === 'PERSON');
  if (persons.length > 0) {
    structuredData.name = persons[0].word;
    if (persons.length > 1) {
      structuredData.fatherName = persons[1].word;
    }
  }

  // Extract locations
  const locations = entities.filter(e => e.entity_group === 'LOC' || e.entity === 'LOCATION');
  if (locations.length > 0) {
    // Try to identify village, district, state from locations
    const locationTexts = locations.map(l => l.word);
    
    // Simple heuristic: last location might be state
    if (locationTexts.length >= 3) {
      structuredData.state = locationTexts[locationTexts.length - 1];
      structuredData.district = locationTexts[locationTexts.length - 2];
      structuredData.village = locationTexts[locationTexts.length - 3];
    } else if (locationTexts.length >= 2) {
      structuredData.district = locationTexts[locationTexts.length - 1];
      structuredData.village = locationTexts[locationTexts.length - 2];
    } else if (locationTexts.length >= 1) {
      structuredData.village = locationTexts[0];
    }
  }

  // Extract numbers that might be Patta ID or Survey Number
  const numbers = text.match(/\b\d+[\w\d]*\b/g) || [];
  if (numbers.length > 0) {
    // First number might be Patta ID
    structuredData.pattaId = numbers[0];
    if (numbers.length > 1) {
      structuredData.surveyNumber = numbers[1];
    }
  }

  // Extract land area (look for patterns like "2.5 acres", "3 hectares")
  const areaMatch = text.match(/(\d+\.?\d*)\s*(acre|hectare|ha)/i);
  if (areaMatch) {
    structuredData.landArea = areaMatch[1];
  }

  // Extract coordinates if present (look for lat/lng patterns)
  const coordMatch = text.match(/(\d+\.?\d*)[°\s]*[NS]?\s*[,\s]\s*(\d+\.?\d*)[°\s]*[EW]?/i);
  if (coordMatch) {
    structuredData.coordinates = {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2])
    };
  }

  return structuredData;
}

module.exports = ocrController;
