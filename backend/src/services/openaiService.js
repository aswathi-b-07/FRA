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
        You are an AI policy expert for FRA implementation. Analyze inputs and produce a HIGH-QUALITY, INPUT-SPECIFIC recommendation focused ONLY on the TOP 3 government schemes.

        Inputs:
        - Target Demographic: ${targetDemographic}
        - State: ${state || 'Not specified'}
        - District: ${district || 'Not specified'}
        - Land Data: ${JSON.stringify(landData)}
        - Guidelines: ${JSON.stringify(guidelines)}

        Output Requirements (strict):
        1) Begin with a one-paragraph summary of the context.
        2) Then list EXACTLY three schemes, numbered 1..3, each block including:
           - Scheme Name (official)
           - Why this scheme fits THESE inputs (tie back to forest cover, land area, livelihoods, irrigation, housing, tribal focus, etc.)
           - What to implement (3-5 concrete steps with stakeholders)
           - Expected outcomes and 2-3 measurable indicators
           - Risks and mitigations
        3) Close with a short execution plan (phased timeline).

        Only propose schemes that realistically match the inputs (e.g., MGNREGA, PM-KISAN, PMAY-G, NRLM/SHGs, PMKSY (irrigation), Van Dhan Vikas Yojana (NTFP), CAMPA, PM-JAY for health, etc.).
        Do not exceed three schemes. Avoid generic text.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      });

      const content = response.choices[0].message.content;

      const schemes = this.extractFundingSchemes(content);
      return {
        recommendations: content,
        fundingSchemes: schemes.slice(0, 3),
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
      const normalizedType = this._normalizeConflictType(String(conflictType || ''));
      // Define conflict type specific analysis patterns
      const conflictPatterns = {
        'boundary': {
          focus: 'spatial analysis, historical usage patterns, community rights',
          legal: ['Section 3(1)(i)', 'Section 4(2)(d)', 'Rule 12(3)'],
          approach: 'participatory mapping and joint verification'
        },
        'individual_vs_community': {
          focus: 'balancing individual and collective rights, traditional practices',
          legal: ['Section 3(1)(a)', 'Section 3(1)(c)', 'Section 4(1)(e)'],
          approach: 'community consultation and rights harmonization'
        },
        'inheritance': {
          focus: 'succession rights, family dynamics, gender equity',
          legal: ['Section 4(4)', 'Section 2(g)', 'Rule 12(4)'],
          approach: 'family mediation and documentation verification'
        },
        'interdepartmental': {
          focus: 'jurisdictional clarity, administrative coordination',
          legal: ['Section 3(2)', 'Section 5', 'Rule 9'],
          approach: 'inter-departmental coordination committee'
        },
        'resource_use': {
          focus: 'sustainable use, access rights, benefit sharing',
          legal: ['Section 3(1)(c)', 'Section 3(1)(i)', 'Section 5'],
          approach: 'resource management planning and usage agreements'
        }
      };

      // Get the specific pattern for this conflict type
      const pattern = conflictPatterns[normalizedType] || {
        focus: 'general rights and responsibilities under FRA',
        legal: ['Section 3', 'Section 4', 'Rule 11'],
        approach: 'standard dispute resolution'
      };

      const prompt = `
        As an AI conflict resolution specialist for Forest Rights Act disputes, provide a detailed, context-specific analysis of the following conflict:

        Conflict Type: ${normalizedType}
        Description: ${description}
        Parties Involved: ${JSON.stringify(partiesInvolved)}
        Record Context: ${recordContext ? JSON.stringify(recordContext) : 'Not available'}
        Supporting Documents: ${documents ? JSON.stringify(documents) : 'None provided'}

        Focus Areas for Analysis:
        - ${pattern.focus}
        - Relevant FRA Sections: ${pattern.legal.join(', ')}
        - Recommended Approach: ${pattern.approach}

        Please provide a comprehensive analysis including:

        1. Detailed Conflict Analysis:
           - Root causes and contributing factors
           - Historical context and patterns
           - Power dynamics and interests
           - Impact on different stakeholders
           - Environmental and social implications

        2. Legal Framework Analysis:
           - Applicable FRA provisions
           - Relevant case precedents
           - Constitutional safeguards
           - State-specific rules
           - Procedural requirements

        3. Stakeholder-Specific Impact:
           - Rights and responsibilities
           - Current challenges
           - Potential losses/gains
           - Long-term implications

        4. Resolution Framework:
           - Immediate actions needed
           - Medium-term interventions
           - Long-term solutions
           - Role of different authorities
           - Community participation mechanisms

        5. Fairness Assessment:
           - Rights protection score (0-1)
           - Procedural fairness score (0-1)
           - Outcome equity score (0-1)
           - Implementation feasibility score (0-1)
           - Overall fairness score (weighted average)

        6. Detailed Recommendations:
           - Step-by-step resolution process
           - Timeline with milestones
           - Risk mitigation strategies
           - Monitoring mechanisms
           - Success indicators

        7. Post-Resolution Framework:
           - Documentation requirements
           - Implementation monitoring
           - Grievance mechanisms
           - Review process
           - Learning documentation

        Ensure all recommendations are:
        - Legally compliant with FRA
        - Practically implementable
        - Culturally sensitive
        - Environmentally sustainable
        - Socially equitable
        - Economically viable
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6
      });

      const content = this._tailorByKeywords(response.choices[0].message.content, normalizedType, description, partiesInvolved);
      
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
    const { targetDemographic = '', landData = {}, guidelines = {}, state, district } = params || {};
    const ctx = this._buildContextForScoring(targetDemographic, landData, guidelines, state, district);
    const scored = this._scoreSchemes(ctx).sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);

    const content = this._renderTop3Recommendation(top3, ctx);
    const implScore = Math.min(1, top3.reduce((s, x) => s + x.score, 0) / (top3.length * 10) + (guidelines?.priority === 'high' ? 0.05 : 0));

    return {
      recommendations: content,
      fundingSchemes: top3.map(s => s.name),
      implementationScore: Number(implScore.toFixed(2)),
      generatedAt: new Date().toISOString()
    };
  }

  getMockConflictAnalysis(params) {
    const { conflictType = '', description = '', partiesInvolved = {} } = params;
    const normalizedType = this._normalizeConflictType(String(conflictType || ''));
    
    // Define conflict type specific patterns for mock responses
    const mockPatterns = {
      'boundary': {
        rootCauses: [
          'Unclear historical boundaries between villages',
          'Overlapping traditional use areas',
          'Seasonal variation in resource use patterns',
          'Missing or outdated land records'
        ],
        resolution: [
          'Participatory mapping with both communities',
          'Documentation of seasonal use patterns',
          'Joint resource management planning',
          'Clear boundary demarcation with natural markers'
        ],
        legal: [
          'Section 3(1)(i) on habitat rights',
          'Section 4(2)(d) on boundary determination',
          'Rule 12(3) on resolution of overlapping claims'
        ],
        fairnessComponents: {
          rightsProtection: 0.85,
          proceduralFairness: 0.90,
          outcomeEquity: 0.80,
          implementationFeasibility: 0.75
        }
      },
      'individual_vs_community': {
        rootCauses: [
          'Competing claims over forest resources',
          'Misunderstanding of individual vs community rights',
          'Historical inequities in resource access',
          'Changes in traditional use patterns'
        ],
        resolution: [
          'Rights awareness workshops',
          'Community-led resource mapping',
          'Development of shared use guidelines',
          'Documentation of traditional practices'
        ],
        legal: [
          'Section 3(1)(a) on individual rights',
          'Section 3(1)(c) on community rights',
          'Section 4(1)(e) on rights recognition process'
        ],
        fairnessComponents: {
          rightsProtection: 0.80,
          proceduralFairness: 0.85,
          outcomeEquity: 0.75,
          implementationFeasibility: 0.80
        }
      },
      'inheritance': {
        rootCauses: [
          'Unclear succession documentation',
          'Multiple claimants to rights',
          'Gender-based discrimination',
          'Inter-generational disputes'
        ],
        resolution: [
          'Family tree verification',
          'Gender-sensitive mediation',
          'Documentation of succession rights',
          'Joint rights recognition where applicable'
        ],
        legal: [
          'Section 4(4) on inheritance',
          'Section 2(g) on family definition',
          'Rule 12(4) on succession procedures'
        ],
        fairnessComponents: {
          rightsProtection: 0.90,
          proceduralFairness: 0.85,
          outcomeEquity: 0.85,
          implementationFeasibility: 0.80
        }
      },
      'resource_use': {
        rootCauses: [
          'Unsustainable resource extraction',
          'Inequitable benefit sharing',
          'Seasonal resource scarcity',
          'Market pressures on forest products'
        ],
        resolution: [
          'Sustainable harvesting guidelines',
          'Equitable benefit sharing mechanism',
          'Community monitoring system',
          'Value addition training'
        ],
        legal: [
          'Section 3(1)(c) on NTFP rights',
          'Section 3(1)(i) on sustainable use',
          'Section 5 on conservation duties'
        ],
        fairnessComponents: {
          rightsProtection: 0.85,
          proceduralFairness: 0.80,
          outcomeEquity: 0.85,
          implementationFeasibility: 0.75
        }
      }
    };

    // Get pattern based on conflict type or use default
    const pattern = mockPatterns[normalizedType] || {
      rootCauses: [
        'Unclear rights and responsibilities',
        'Documentation gaps',
        'Communication barriers',
        'Process delays'
      ],
      resolution: [
        'Stakeholder consultation',
        'Documentation review',
        'Mediated discussion',
        'Action plan development'
      ],
      legal: [
        'Section 3 on forest rights',
        'Section 4 on recognition process',
        'Rule 11 on dispute resolution'
      ],
      fairnessComponents: {
        rightsProtection: 0.75,
        proceduralFairness: 0.75,
        outcomeEquity: 0.75,
        implementationFeasibility: 0.75
      }
    };

    // Calculate overall fairness score using the same weights as the real analysis
    const weights = {
      rightsProtection: 0.35,
      outcomeEquity: 0.30,
      proceduralFairness: 0.20,
      implementationFeasibility: 0.15
    };

    const fairnessScore = Object.entries(weights).reduce((score, [component, weight]) => {
      return score + (pattern.fairnessComponents[component] * weight);
    }, 0);

    // Tailored dynamic insights based on keywords in description
    const keywordSignals = this._extractKeywordSignals(description);

    const analysis = `Conflict Analysis for ${normalizedType}:

**1. Detailed Conflict Analysis**
Root Causes and Contributing Factors:
${pattern.rootCauses.map(cause => `- ${cause}`).join('\n')}
${keywordSignals.additionalRootCause ? `- ${keywordSignals.additionalRootCause}` : ''}

Impact Assessment:
- Direct stakeholders affected: ${Object.keys(partiesInvolved).length || 'Multiple'}
- Environmental implications: ${description.toLowerCase().includes('environment') ? 'Significant' : 'Moderate'}
- Social dynamics: Complex interactions between ${Object.keys(partiesInvolved).join(' and ')}
${keywordSignals.migrationMention ? '- Migration pressures identified due to seasonal livelihood gaps' : ''}
${keywordSignals.illegalLogging ? '- Pressure from illegal logging/encroachment noted in the vicinity' : ''}

**2. Legal Framework**
Applicable Provisions:
${pattern.legal.map(law => `- ${law}`).join('\n')}
${keywordSignals.stateRule ? `- State-specific rule: ${keywordSignals.stateRule}` : ''}

**3. Resolution Framework**
Recommended Steps:
${pattern.resolution.map((step, i) => `${i + 1}. ${step}`).join('\n')}
${keywordSignals.addResolution ? `${pattern.resolution.length + 1}. ${keywordSignals.addResolution}` : ''}

**4. Fairness Assessment**
- Rights Protection Score: ${pattern.fairnessComponents.rightsProtection}
- Procedural Fairness Score: ${pattern.fairnessComponents.proceduralFairness}
- Outcome Equity Score: ${pattern.fairnessComponents.outcomeEquity}
- Implementation Feasibility Score: ${pattern.fairnessComponents.implementationFeasibility}
- Overall Fairness Score: ${fairnessScore.toFixed(2)}

**5. Implementation Timeline**
- Documentation and Preparation: ${keywordSignals.urgent ? '7-14 days' : '15-30 days'}
- Stakeholder Consultations: ${keywordSignals.urgent ? '10-20 days' : '20-30 days'}
- Resolution Process: ${keywordSignals.legalCase ? '45-90 days (if litigation pending)' : '30-45 days'}
- Implementation and Monitoring: Ongoing

**6. Success Indicators**
- Agreement by all parties
- Clear documentation of resolution
- Sustainable implementation plan
- Established monitoring mechanism`;

    return {
      analysis: this._tailorByKeywords(analysis, normalizedType, description, partiesInvolved),
      recommendedApproach: pattern.resolution[0],
      fairnessScore,
      timeline: keywordSignals.urgent ? '45-75 days' : '60-90 days',
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
    const catalogNames = [
      'PM-KISAN', 'MGNREGA', 'PMAY-G', 'NRLM', 'PMKSY', 'PM-JAY', 'CAMPA',
      'Van Dhan Vikas Yojana', 'NTFP', 'Kisan Credit Card', 'PMGSY',
      'Samagra Shiksha', 'Mission LiFE', 'PMFME', 'FPO Formation'
    ];
    const found = [];
    const lc = content.toLowerCase();
    for (const name of catalogNames) {
      if (lc.includes(name.toLowerCase())) found.push(name);
    }
    return found;
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
    // Extract individual fairness component scores
    const rightsProtection = this._extractScore(content, /rights protection score.*?(\d+\.?\d*)/i) || 0.7;
    const proceduralFairness = this._extractScore(content, /procedural fairness score.*?(\d+\.?\d*)/i) || 0.7;
    const outcomeEquity = this._extractScore(content, /outcome equity score.*?(\d+\.?\d*)/i) || 0.7;
    const implementationFeasibility = this._extractScore(content, /implementation feasibility score.*?(\d+\.?\d*)/i) || 0.7;

    // Calculate weighted average with emphasis on rights protection and outcome equity
    const weights = {
      rightsProtection: 0.35,      // Highest weight as it's core to FRA
      outcomeEquity: 0.30,         // Second highest as it affects long-term success
      proceduralFairness: 0.20,    // Important but can be improved during implementation
      implementationFeasibility: 0.15  // Lowest as it can be enhanced with support
    };

    const weightedScore = (
      rightsProtection * weights.rightsProtection +
      outcomeEquity * weights.outcomeEquity +
      proceduralFairness * weights.proceduralFairness +
      implementationFeasibility * weights.implementationFeasibility
    );

    return Math.min(Math.max(weightedScore, 0), 1);
  }

  _extractScore(content, pattern) {
    const match = content.match(pattern);
    return match ? Math.min(Math.max(parseFloat(match[1]), 0), 1) : null;
  }

  extractTimeline(content) {
    const match = content.match(/(\d+[-–]\d+|\d+)\s*(days?|weeks?|months?)/i);
    return match ? match[0] : '30-60 days';
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

  // ------- MOCK RECOMMENDER ENGINE (Heuristic) -------
  _buildContextForScoring(targetDemographic, landData, guidelines, state, district) {
    const td = String(targetDemographic || '').toLowerCase();
    const focus = String(guidelines?.focusArea || '').toLowerCase();
    const priority = String(guidelines?.priority || '').toLowerCase();
    const land = {
      totalArea: Number(landData?.totalArea || 0),
      forestCover: Number(landData?.forestCover || 0),
      agri: Number(landData?.agriculturalLand || 0),
      population: Number(landData?.population || 0)
    };
    const flags = {
      isTribal: /(tribal|adivasi|forest dependent|st).*(com|people)/.test(td) || td.includes('tribal') || td.includes('adivasi') || td.includes('forest'),
      isSmallFarmer: td.includes('small') || td.includes('marginal') || td.includes('farmer'),
      isWomenSHG: td.includes('women') || td.includes('shg') || td.includes('self help') || td.includes('nrlm'),
      wantsHousing: td.includes('housing') || focus.includes('infrastructure'),
      wantsLivelihood: focus.includes('livelihood'),
      wantsHealthcare: focus.includes('health'),
      wantsEducation: focus.includes('education'),
      wantsIrrigation: td.includes('irrigation') || focus.includes('irrigation'),
      conservationFocus: focus.includes('conservation') || land.forestCover >= 40
    };
    return { td, focus, priority, land, flags, state, district };
  }

  _schemeCatalog() {
    return [
      { name: 'MGNREGA', tags: ['livelihood', 'rural', 'works'], score: (c) => (c.flags.wantsLivelihood ? 4 : 0) + (c.land.population > 0 ? 2 : 0) + 2 },
      { name: 'PM-KISAN', tags: ['farmer', 'income-support'], score: (c) => (c.flags.isSmallFarmer ? 5 : 0) + (c.land.agri >= 30 ? 2 : 0) },
      { name: 'PMKSY', tags: ['irrigation', 'water'], score: (c) => (c.flags.wantsIrrigation ? 5 : 0) + (c.land.agri >= 30 ? 2 : 0) },
      { name: 'PMAY-G', tags: ['housing'], score: (c) => (c.flags.wantsHousing ? 5 : 0) + (c.flags.isTribal ? 2 : 0) },
      { name: 'NRLM', tags: ['women', 'shg', 'livelihood'], score: (c) => (c.flags.isWomenSHG ? 5 : 0) + (c.flags.wantsLivelihood ? 2 : 0) },
      { name: 'Van Dhan Vikas Yojana', tags: ['tribal', 'ntfp'], score: (c) => (c.flags.isTribal ? 5 : 0) + (c.land.forestCover >= 30 ? 3 : 0) },
      { name: 'CAMPA', tags: ['afforestation', 'conservation'], score: (c) => (c.conservationFocus ? 5 : 0) + (c.land.forestCover >= 40 ? 3 : 0) },
      { name: 'PM-JAY', tags: ['health'], score: (c) => (c.flags.wantsHealthcare ? 5 : 0) },
      { name: 'Samagra Shiksha', tags: ['education'], score: (c) => (c.flags.wantsEducation ? 5 : 0) },
      { name: 'Kisan Credit Card', tags: ['credit'], score: (c) => (c.flags.isSmallFarmer ? 3 : 0) },
      { name: 'PMGSY', tags: ['roads', 'infra'], score: (c) => (c.focus.includes('infrastructure') ? 3 : 0) },
      { name: 'NTFP', tags: ['forest', 'livelihood'], score: (c) => (c.flags.isTribal ? 3 : 0) + (c.land.forestCover >= 30 ? 2 : 0) }
    ];
  }

  _scoreSchemes(ctx) {
    const list = this._schemeCatalog();
    return list.map(s => ({ name: s.name, baseTags: s.tags, score: Math.min(10, Math.max(0, Number(s.score(ctx) || 0))), ctx }));
  }

  _renderTop3Recommendation(top3, ctx) {
    const header = `Context: Target = ${ctx.td || 'N/A'}, State = ${ctx.state || 'N/A'}, District = ${ctx.district || 'N/A'}, Land = ${JSON.stringify(ctx.land)}. Priority: ${ctx.priority || 'N/A'}.`;

    const blocks = top3.map((s, i) => {
      const why = this._whyForScheme(s.name, ctx);
      const steps = this._stepsForScheme(s.name, ctx);
      const outcomes = this._outcomesForScheme(s.name, ctx);
      const risks = this._risksForScheme(s.name, ctx);
      return `${i + 1}. ${s.name}\nWhy it fits: ${why}\nWhat to implement:\n- ${steps.join('\n- ')}\nExpected outcomes & indicators:\n- ${outcomes.join('\n- ')}\nRisks & mitigations:\n- ${risks.join('\n- ')}`;
    }).join('\n\n');

    const plan = `Phased plan: 0-3 months (mobilization, targeting, approvals); 3-6 months (rollout & disbursement); 6-12 months (convergence & monitoring); 12+ months (scaling).`;

    return `${header}\n\n${blocks}\n\n${plan}`;
  }

  _whyForScheme(name, c) {
    switch (name) {
      case 'MGNREGA':
        return 'Provides guaranteed wage employment; ideal for immediate income support, land development, water conservation works in rural FRA geographies.';
      case 'PM-KISAN':
        return 'Direct income support to small/marginal farmers; aligns with agricultural dependence and low, stable cashflows.';
      case 'PMKSY':
        return 'Improves irrigation efficiency and water access; crucial when agricultural share is high or irrigation is a constraint.';
      case 'PMAY-G':
        return 'Supports pucca housing in rural areas; relevant for vulnerable FRA beneficiaries lacking adequate housing.';
      case 'NRLM':
        return 'Empowers women SHGs with credit and livelihoods; strong fit where women/SHGs are a focus and livelihood diversification is needed.';
      case 'Van Dhan Vikas Yojana':
        return 'Targets tribal NTFP value-add & market linkages; high forest cover and tribal dependence make this a strong match.';
      case 'CAMPA':
        return 'Funds afforestation & ecosystem restoration; suitable where conservation and high forest cover are priorities.';
      case 'PM-JAY':
        return 'Provides secondary/tertiary care coverage; relevant where healthcare access is a priority.';
      case 'Samagra Shiksha':
        return 'Systemic school education support; appropriate for education-focus contexts.';
      case 'Kisan Credit Card':
        return 'Flexible, low-cost credit for farm inputs; complements income support in smallholder contexts.';
      case 'PMGSY':
        return 'All-weather road connectivity; boosts market access and service delivery in remote FRA villages.';
      case 'NTFP':
        return 'Boosts incomes from forest produce; pragmatic where forest dependency and access to NTFP exist.';
      default:
        return 'High alignment with stated needs and constraints.';
    }
  }

  _stepsForScheme(name, c) {
    const common = [
      'Identify eligible households with Gram Sabha validation',
      'Create beneficiary lists and digitize records in MIS',
      'Conduct awareness and grievance redressal camps'
    ];
    switch (name) {
      case 'MGNREGA':
        return [...common, 'Prepare shelf of works: water harvesting, land leveling, plantation', 'Issue job cards; schedule works pre-monsoon', 'Converge with PMKSY/CAMPA for eco-works'];
      case 'PM-KISAN':
        return [...common, 'Verify land records; seed bank account & Aadhaar', 'Onboard beneficiaries on PM-KISAN portal', 'Track DBT status and resolve rejections'];
      case 'PMKSY':
        return [...common, 'Baseline irrigation gaps; micro-irrigation DPRs', 'Mobilize drip/sprinkler subsidies; demo plots', 'Train farmers on water-use efficiency'];
      case 'PMAY-G':
        return [...common, 'Geo-tag eligible homes; prioritize vulnerable', 'Facilitate sanctions and convergences (toilets, LPG)', 'Enable community monitoring of construction'];
      case 'NRLM':
        return [...common, 'Form/strengthen SHGs; initiate savings/credit', 'Skilling for local value chains', 'Credit linkage via bank/SHG federations'];
      case 'Van Dhan Vikas Yojana':
        return [...common, 'Map NTFP species & seasonality; identify clusters', 'Set up Van Dhan Vikas Kendras; processing units', 'Market linkage with TRIFED/private buyers'];
      case 'CAMPA':
        return [...common, 'Select degraded sites; native species plan', 'Community-led plantation and protection', 'Create eco-restoration jobs with MGNREGA support'];
      case 'PM-JAY':
        return [...common, 'E-KYC and card issuance drives', 'Empanel district hospitals; referral protocols', 'Health literacy & fraud mitigation campaigns'];
      case 'Samagra Shiksha':
        return [...common, 'Identify infrastructure and learning gaps', 'Deploy bridge courses & teacher support', 'Community-led school management strengthening'];
      case 'Kisan Credit Card':
        return [...common, 'Household KCC camps with banks', 'Digitize land records & KYC', 'Bundle crop insurance and PMFBY awareness'];
      case 'PMGSY':
        return [...common, 'Prioritize habitations; prepare DPRs', 'Secure forest clearances where needed', 'Community monitoring of works quality'];
      case 'NTFP':
        return [...common, 'Train on sustainable harvest & grading', 'Create storage/processing micro-units', 'Link to e-markets and MSP schemes'];
      default:
        return common;
    }
  }

  _outcomesForScheme(name, c) {
    switch (name) {
      case 'MGNREGA': return ['150–200 person-days per HH', 'Water storage + soil moisture improved', 'Reduction in distress migration'];
      case 'PM-KISAN': return ['Stable seasonal cashflows (INR 6k/year)', 'Higher input uptake; yield gains', 'Lower informal debt'];
      case 'PMKSY': return ['Irrigated area expanded', 'Water-use efficiency > 30%', 'Yield increase 10–20%'];
      case 'PMAY-G': return ['Pucca housing coverage increased', 'Improved health & safety', 'Higher asset security'];
      case 'NRLM': return ['Increased SHG incomes', 'Higher credit access', 'Women’s participation in governance'];
      case 'Van Dhan Vikas Yojana': return ['NTFP value-add margins 20–40%', 'SHG/VDVK enterprise formation', 'Better market price realization'];
      case 'CAMPA': return ['Tree cover added', 'Biodiversity restored', 'Ecosystem jobs created'];
      case 'PM-JAY': return ['Reduced OOP health expenses', 'Higher hospitalization coverage', 'Better treatment continuity'];
      case 'Samagra Shiksha': return ['Improved attendance & learning', 'Reduced dropouts', 'Infra gaps closed'];
      case 'Kisan Credit Card': return ['Lower borrowing costs', 'Timely input purchase', 'Debt-cycle reduction'];
      case 'PMGSY': return ['All-weather connectivity', 'Market access time reduced', 'Service utilization increased'];
      case 'NTFP': return ['Higher seasonal incomes', 'Sustainable resource use', 'Local enterprise growth'];
      default: return ['Improved outcomes aligned to scheme objectives'];
    }
  }

  _risksForScheme(name, c) {
    switch (name) {
      case 'MGNREGA': return ['Delayed payments → Use PFMS monitoring', 'Leakages → Social audits'];
      case 'PM-KISAN': return ['Record mismatches → Land record drives', 'Exclusion errors → Helpdesks'];
      case 'PMKSY': return ['Asset maintenance lapses → Farmer groups MoUs', 'Low adoption → Demo plots'];
      case 'PMAY-G': return ['Construction delays → Milestone-based tracking', 'Quality issues → Community oversight'];
      case 'NRLM': return ['Credit risk → Phased limits, mentoring', 'Market risk → Diversification'];
      case 'Van Dhan Vikas Yojana': return ['Market volatility → MSP/Buy-back MoUs', 'Overharvest → Community bylaws'];
      case 'CAMPA': return ['Survival rates → Species mix & aftercare', 'Conflict → Participatory site selection'];
      case 'PM-JAY': return ['Fraud/overuse → Audits & empanelment norms', 'Low awareness → IEC campaigns'];
      case 'Samagra Shiksha': return ['Teacher shortage → Contract hiring', 'Low community buy-in → SMC training'];
      case 'Kisan Credit Card': return ['Over-indebtedness → Credit counseling', 'NPA risk → Insurance linkages'];
      case 'PMGSY': return ['Clearance delays → Early approvals', 'Cost overruns → Third-party QC'];
      case 'NTFP': return ['Price crashes → Aggregation & storage', 'Quality gaps → Training & standards'];
      default: return ['Operational delays → Tight governance'];
    }
  }

  // ---------- Tailoring Helpers ----------
  _normalizeConflictType(rawType) {
    const t = rawType.toLowerCase().trim();
    if (/bound|demarc|map|border/.test(t)) return 'boundary';
    if (/community.*individual|individual.*community|cfr.*ifr|ifr.*cfr/.test(t)) return 'individual_vs_community';
    if (/inherit|succession|heir|widow|daughter|son/.test(t)) return 'inheritance';
    if (/resource|ntfp|collection|grazing|firewood|timber/.test(t)) return 'resource_use';
    if (/dept|forest.*revenue|revenue.*forest|inter.?department/.test(t)) return 'interdepartmental';
    return t || 'general';
  }

  _extractKeywordSignals(description) {
    const d = String(description || '').toLowerCase();
    return {
      migrationMention: /migration|seasonal work|distress/.test(d),
      illegalLogging: /illegal (logging|felling)|encroach/.test(d),
      urgent: /violence|threat|evict|eviction|demolition|court stay/.test(d),
      legalCase: /court|case|litigation|writ|appeal/.test(d),
      stateRule: (/maharashtra/.test(d) ? 'Maharashtra FRA Rules 2014' : (/odisha|orissa/.test(d) ? 'Odisha FRA Rules' : null)),
      additionalRootCause: (/survey|old map|no gps|chain survey/.test(d) ? 'Inaccurate or outdated cadastral/survey data' : null),
      addResolution: (/gps|gis|map/.test(d) ? 'Use GPS/GIS-based participatory mapping with third-party facilitation' : null)
    };
  }

  _tailorByKeywords(text, normalizedType, description, partiesInvolved) {
    const signals = this._extractKeywordSignals(description);
    let tailored = text;
    // Add a short preface highlighting key signals if not already present
    const preface = [];
    if (signals.urgent) preface.push('Urgency: Immediate risk mitigation recommended.');
    if (signals.legalCase) preface.push('Note: Ongoing/likely litigation detected; align mediation with legal timelines.');
    if (signals.illegalLogging) preface.push('Enforcement: Address illegal extraction/encroachment with joint inspections.');
    if (signals.migrationMention) preface.push('Livelihoods: Consider seasonal livelihood support to reduce conflict drivers.');
    if (preface.length > 0 && !/Urgency:|Note:|Enforcement:|Livelihoods:/i.test(tailored)) {
      tailored = `${preface.join(' ')}\n\n${tailored}`;
    }
    // Ensure the conflict type header is normalized
    tailored = tailored.replace(/Conflict Type:\s*.*/i, `Conflict Type: ${normalizedType}`);
    return tailored;
  }
}

module.exports = new OpenAIService();
