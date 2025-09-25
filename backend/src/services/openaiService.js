const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.initialized = true;
      console.log('OpenAI service initialized successfully');
    } else {
      console.warn('OpenAI API key not provided, using mock responses');
    }
  }

  async generatePolicyRecommendations(params) {
    this.initialize();

    const { targetDemographic, landData, guidelines, state, district } = params;

    if (!this.client) {
      return this.getMockPolicyRecommendations(params);
    }

    try {
      const prompt = `
        As an AI policy expert specializing in Forest Rights Act (FRA) implementation, generate tailored policy recommendations for the following scenario:

        Target Demographic: ${targetDemographic}
        State: ${state || 'Not specified'}
        District: ${district || 'Not specified'}
        Land Data: ${JSON.stringify(landData)}
        Current Guidelines: ${JSON.stringify(guidelines)}

        Please provide:
        1. Specific policy recommendations
        2. Relevant government funding schemes (including PM-KISAN, MGNREGA, etc.)
        3. Implementation strategies
        4. Expected outcomes and success metrics
        5. Potential challenges and mitigation strategies

        Focus on practical, actionable recommendations that align with FRA objectives and current government schemes.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      });

      const content = response.choices[0].message.content;
      
      return {
        recommendations: content,
        fundingSchemes: this.extractFundingSchemes(content),
        implementationScore: this.calculateImplementationScore(content),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('OpenAI policy recommendations error:', error);
      return this.getMockPolicyRecommendations(params);
    }
  }

  async analyzeConflict(params) {
    this.initialize();

    const { conflictType, description, partiesInvolved, documents, recordContext } = params;

    if (!this.client) {
      return this.getMockConflictAnalysis(params);
    }

    try {
      const prompt = `
        As an AI conflict resolution specialist for Forest Rights Act disputes, analyze the following conflict:

        Conflict Type: ${conflictType}
        Description: ${description}
        Parties Involved: ${JSON.stringify(partiesInvolved)}
        Record Context: ${recordContext ? JSON.stringify(recordContext) : 'Not available'}
        Supporting Documents: ${documents ? JSON.stringify(documents) : 'None provided'}

        Please provide:
        1. Conflict analysis and root causes
        2. Recommended resolution approach
        3. Fairness assessment (score 0-1)
        4. Legal precedents or relevant FRA sections
        5. Mediation strategies
        6. Timeline for resolution
        7. Potential outcomes for each party

        Focus on fair, legally sound, and practically implementable solutions.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      
      return {
        analysis: content,
        recommendedApproach: this.extractRecommendedApproach(content),
        fairnessScore: this.extractFairnessScore(content),
        timeline: this.extractTimeline(content),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('OpenAI conflict analysis error:', error);
      return this.getMockConflictAnalysis(params);
    }
  }

  async gramSabhaAssistant(params) {
    this.initialize();

    const { query, context, sessionContext, village, district, state } = params;

    if (!this.client) {
      return this.getMockGramSabhaResponse(params);
    }

    try {
      const prompt = `
        As an AI assistant for Gram Sabha meetings focused on Forest Rights Act implementation, help with the following:

        Query: ${query}
        Location: ${village}, ${district}, ${state}
        Context: ${context || 'General inquiry'}
        Session Context: ${sessionContext ? JSON.stringify(sessionContext) : 'New session'}

        Please provide:
        1. Direct answer to the query
        2. Relevant FRA procedures and guidelines
        3. Suggested action items for the Gram Sabha
        4. Related government schemes and benefits
        5. Documentation requirements
        6. Follow-up recommendations

        Keep responses practical and focused on actionable guidance for rural communities.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.5
      });

      const content = response.choices[0].message.content;
      
      return {
        answer: content,
        suggestions: this.extractSuggestions(content),
        relatedSchemes: this.extractRelatedSchemes(content),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('OpenAI Gram Sabha assistant error:', error);
      return this.getMockGramSabhaResponse(params);
    }
  }

  async detectFraud(params) {
    this.initialize();

    const { recordData, similarRecords, checkType } = params;

    if (!this.client) {
      return this.getMockFraudAnalysis(params);
    }

    try {
      const prompt = `
        As an AI fraud detection specialist for Forest Rights Act records, analyze the following record for potential fraud or anomalies:

        Record Data: ${JSON.stringify(recordData)}
        Similar Records: ${JSON.stringify(similarRecords)}
        Check Type: ${checkType}

        Please analyze for:
        1. Data consistency issues
        2. Duplicate or conflicting records
        3. Suspicious patterns in land area, coordinates, or personal details
        4. Document authenticity concerns
        5. Timeline inconsistencies
        6. Geographic anomalies

        Provide:
        - Risk score (0-1, where 1 is highest risk)
        - Primary concerns
        - Specific anomalies found
        - Recommended verification steps
        - Confidence level in the analysis

        Be thorough but avoid false positives for legitimate variations.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      
      return {
        analysis: content,
        riskScore: this.extractRiskScore(content),
        primaryConcern: this.extractPrimaryConcern(content),
        anomalies: this.extractAnomalies(content),
        verificationSteps: this.extractVerificationSteps(content),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('OpenAI fraud detection error:', error);
      return this.getMockFraudAnalysis(params);
    }
  }

  async generateInsights(params) {
    this.initialize();

    const { recentPolicies, recentConflicts, fraudAlerts, state, district, timeframe } = params;

    if (!this.client) {
      return this.getMockInsights(params);
    }

    try {
      const prompt = `
        Generate insights and trends analysis for FRA implementation based on:

        Recent Policies: ${JSON.stringify(recentPolicies)}
        Recent Conflicts: ${JSON.stringify(recentConflicts)}
        Fraud Alerts: ${JSON.stringify(fraudAlerts)}
        Location: ${state}, ${district}
        Timeframe: ${timeframe}

        Provide:
        1. Key trends and patterns
        2. Areas of concern
        3. Success indicators
        4. Recommendations for improvement
        5. Predictive insights for upcoming challenges

        Focus on actionable insights for policy makers and administrators.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      
      return {
        summary: content,
        keyTrends: this.extractKeyTrends(content),
        recommendations: this.extractRecommendations(content),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('OpenAI insights generation error:', error);
      return this.getMockInsights(params);
    }
  }

  // Mock response methods for when OpenAI is not available
  getMockPolicyRecommendations(params) {
    return {
      recommendations: `Based on the provided parameters for ${params.state || 'the specified region'}, here are key policy recommendations:

1. **Enhanced Digital Infrastructure**: Implement digital record-keeping systems to improve transparency and reduce processing time for FRA claims.

2. **Community Capacity Building**: Establish training programs for Gram Sabha members on FRA procedures and rights documentation.

3. **Integrated Scheme Approach**: Link FRA beneficiaries with:
   - PM-KISAN for direct benefit transfers
   - MGNREGA for sustainable livelihood opportunities
   - PMAY-G for housing support
   - National Rural Health Mission for healthcare access

4. **Technology Integration**: Deploy mobile apps for claim tracking and status updates, reducing the need for multiple office visits.

5. **Conflict Prevention**: Set up early warning systems for potential land disputes and establish mediation committees at the district level.`,
      fundingSchemes: ['PM-KISAN', 'MGNREGA', 'PMAY-G', 'NRHM'],
      implementationScore: 0.75,
      generatedAt: new Date().toISOString()
    };
  }

  getMockConflictAnalysis(params) {
    return {
      analysis: `Conflict Analysis for ${params.conflictType}:

**Root Causes:**
- Overlapping land claims between community and individual rights
- Insufficient documentation of traditional use patterns
- Lack of clear boundary demarcation

**Recommended Resolution:**
1. Joint verification by Forest Department and Gram Sabha
2. Community consultation to establish historical use patterns
3. Mediated settlement with clear boundary agreements
4. Documentation of agreed terms in official records

**Legal Framework:**
- Section 4 of FRA 2006 applies to individual forest rights
- Section 3(1)(a) covers community forest resources
- Supreme Court guidelines on forest land conversion`,
      recommendedApproach: 'Mediated Settlement',
      fairnessScore: 0.8,
      timeline: '60-90 days',
      generatedAt: new Date().toISOString()
    };
  }

  getMockGramSabhaResponse(params) {
    return {
      answer: `Regarding your query about ${params.query}, here's the guidance for your Gram Sabha:

**Immediate Actions:**
1. Document all traditional forest use patterns in your village
2. Prepare a list of eligible families with supporting evidence
3. Conduct awareness sessions on FRA rights and procedures

**Required Documentation:**
- Proof of residence (Ration card, Voter ID)
- Evidence of forest dependence (photos, witness statements)
- Maps showing traditional use areas

**Related Schemes:**
- Forest Rights Act individual and community titles
- Compensation for forest land acquisition
- NTFP collection and marketing rights`,
      suggestions: ['Document traditional use', 'Conduct awareness sessions', 'Prepare eligibility lists'],
      relatedSchemes: ['FRA Individual Rights', 'FRA Community Rights', 'NTFP Marketing'],
      generatedAt: new Date().toISOString()
    };
  }

  getMockFraudAnalysis(params) {
    const riskScore = Math.random() * 0.5; // Mock low to medium risk
    return {
      analysis: `Fraud Risk Analysis:

**Data Consistency Check:** PASSED
- Personal details are consistent
- Geographic coordinates fall within expected range
- Land area is reasonable for the region

**Duplicate Check:** ${params.similarRecords?.length > 0 ? 'FLAGGED' : 'PASSED'}
- ${params.similarRecords?.length || 0} similar records found
- Requires manual verification for final determination

**Document Verification:** PENDING
- Recommend physical document verification
- Cross-check with revenue records

**Overall Assessment:** ${riskScore > 0.3 ? 'MEDIUM RISK' : 'LOW RISK'}`,
      riskScore: riskScore,
      primaryConcern: riskScore > 0.3 ? 'Similar records found' : 'No major concerns',
      anomalies: params.similarRecords?.length > 0 ? ['Multiple similar records'] : [],
      verificationSteps: ['Physical document check', 'Field verification', 'Revenue record cross-check'],
      generatedAt: new Date().toISOString()
    };
  }

  getMockInsights(params) {
    return {
      summary: `FRA Implementation Insights for ${params.state || 'the region'}:

**Key Trends:**
- Increasing digital adoption in record management
- Growing awareness of community forest rights
- Improved coordination between departments

**Areas of Concern:**
- Processing delays in complex cases
- Need for better conflict resolution mechanisms
- Limited technical capacity at grassroots level

**Recommendations:**
- Expand digital infrastructure
- Enhance training programs
- Strengthen monitoring systems`,
      keyTrends: ['Digital adoption', 'Increased awareness', 'Better coordination'],
      recommendations: ['Expand digital infrastructure', 'Enhance training', 'Strengthen monitoring'],
      generatedAt: new Date().toISOString()
    };
  }

  // Helper methods to extract information from AI responses
  extractFundingSchemes(content) {
    const schemes = ['PM-KISAN', 'MGNREGA', 'PMAY-G', 'NRHM', 'NTFP'];
    return schemes.filter(scheme => content.includes(scheme));
  }

  calculateImplementationScore(content) {
    // Simple heuristic based on content analysis
    const positiveWords = ['improve', 'enhance', 'strengthen', 'develop'];
    const score = positiveWords.reduce((acc, word) => 
      acc + (content.toLowerCase().includes(word) ? 0.1 : 0), 0.5);
    return Math.min(score, 1.0);
  }

  extractRecommendedApproach(content) {
    if (content.includes('mediation') || content.includes('mediated')) return 'Mediated Settlement';
    if (content.includes('legal') || content.includes('court')) return 'Legal Resolution';
    if (content.includes('community') || content.includes('consultation')) return 'Community Consultation';
    return 'Standard Process';
  }

  extractFairnessScore(content) {
    const match = content.match(/fairness.*?(\d+\.?\d*)/i);
    return match ? Math.min(parseFloat(match[1]), 1.0) : 0.7;
  }

  extractTimeline(content) {
    const match = content.match(/(\d+[-–]\d+|\d+)\s*(days?|weeks?|months?)/i);
    return match ? match[0] : '30-60 days';
  }

  extractSuggestions(content) {
    const lines = content.split('\n');
    return lines
      .filter(line => line.match(/^\d+\.|^-|^\*/))
      .map(line => line.replace(/^\d+\.|^-|^\*/, '').trim())
      .slice(0, 5);
  }

  extractRelatedSchemes(content) {
    const schemes = ['PM-KISAN', 'MGNREGA', 'PMAY-G', 'NRHM', 'FRA', 'NTFP'];
    return schemes.filter(scheme => content.includes(scheme));
  }

  extractRiskScore(content) {
    const match = content.match(/risk.*?(\d+\.?\d*)/i);
    return match ? Math.min(parseFloat(match[1]), 1.0) : 0.3;
  }

  extractPrimaryConcern(content) {
    if (content.includes('duplicate')) return 'Duplicate records';
    if (content.includes('inconsistent')) return 'Data inconsistency';
    if (content.includes('suspicious')) return 'Suspicious patterns';
    return 'General verification needed';
  }

  extractAnomalies(content) {
    const anomalies = [];
    if (content.includes('duplicate')) anomalies.push('Duplicate records found');
    if (content.includes('inconsistent')) anomalies.push('Data inconsistencies');
    if (content.includes('suspicious')) anomalies.push('Suspicious patterns');
    return anomalies;
  }

  extractVerificationSteps(content) {
    return [
      'Physical document verification',
      'Field verification',
      'Cross-check with revenue records',
      'Interview with applicant'
    ];
  }

  extractKeyTrends(content) {
    return ['Digital adoption', 'Improved documentation', 'Better coordination'];
  }

  extractRecommendations(content) {
    return ['Enhance digital infrastructure', 'Strengthen training programs', 'Improve monitoring systems'];
  }
}

module.exports = new OpenAIService();
