const openaiService = require('../services/openaiService');
const supabase = require('../utils/supabaseClient');

const aiController = {
  // Generate policy recommendations
  generatePolicyRecommendations: async (req, res) => {
    try {
      const { 
        targetDemographic, 
        landData, 
        guidelines, 
        state,
        district 
      } = req.body;

      if (!targetDemographic || !landData) {
        return res.status(400).json({ 
          error: 'Target demographic and land data are required' 
        });
      }

      const recommendations = await openaiService.generatePolicyRecommendations({
        targetDemographic,
        landData,
        guidelines,
        state,
        district
      });

      // Store recommendations in database
      const { data: savedRecommendation, error: saveError } = await supabase
        .from('policy_recommendations')
        .insert([{
          target_demographic: targetDemographic,
          land_data: landData,
          guidelines: guidelines || {},
          ai_recommendations: recommendations.recommendations,
          funding_schemes: recommendations.fundingSchemes,
          implementation_score: recommendations.implementationScore
        }])
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save recommendations:', saveError);
      }

      res.json({
        success: true,
        recommendations: recommendations,
        savedId: savedRecommendation?.id
      });

    } catch (error) {
      console.error('Generate policy recommendations error:', error);
      res.status(500).json({ 
        error: 'Failed to generate policy recommendations',
        details: error.message 
      });
    }
  },

  // AI-powered conflict resolution
  analyzeConflict: async (req, res) => {
    try {
      const { 
        recordId, 
        conflictType, 
        description, 
        partiesInvolved, 
        documents 
      } = req.body;

      if (!conflictType || !description) {
        return res.status(400).json({ 
          error: 'Conflict type and description are required' 
        });
      }

      // Get record details if recordId provided
      let recordContext = null;
      if (recordId) {
        const { data: record } = await supabase
          .from('records')
          .select('*')
          .eq('id', recordId)
          .single();
        recordContext = record;
      }

      const analysis = await openaiService.analyzeConflict({
        conflictType,
        description,
        partiesInvolved,
        documents,
        recordContext
      });

      // Store conflict analysis in database
      const { data: savedConflict, error: saveError } = await supabase
        .from('conflicts')
        .insert([{
          record_id: recordId,
          conflict_type: conflictType,
          description: description,
          parties_involved: partiesInvolved || {},
          documents: documents || {},
          ai_analysis: analysis,
          fairness_score: analysis.fairnessScore,
          resolution_status: 'pending'
        }])
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save conflict:', saveError);
      }

      res.json({
        success: true,
        analysis: analysis,
        conflictId: savedConflict?.id
      });

    } catch (error) {
      console.error('Analyze conflict error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze conflict',
        details: error.message 
      });
    }
  },


  // Fraud detection analysis
  detectFraud: async (req, res) => {
    try {
      const { recordData, checkType = 'comprehensive' } = req.body;

      if (!recordData) {
        return res.status(400).json({ error: 'Record data is required' });
      }

      // Get similar records for comparison
      const { data: similarRecords } = await supabase
        .from('records')
        .select('*')
        .or(`patta_id.eq.${recordData.patta_id},name.eq.${recordData.name}`)
        .neq('id', recordData.id || '');

      const fraudAnalysis = await openaiService.detectFraud({
        recordData,
        similarRecords,
        checkType
      });

      // If high fraud risk, create alert
      if (fraudAnalysis.riskScore >= 0.7) {
        const { error: alertError } = await supabase
          .from('fraud_alerts')
          .insert([{
            record_id: recordData.id,
            alert_type: fraudAnalysis.primaryConcern,
            confidence_score: fraudAnalysis.riskScore,
            anomaly_details: fraudAnalysis,
            investigation_status: 'pending'
          }]);

        if (alertError) {
          console.error('Failed to create fraud alert:', alertError);
        }
      }

      res.json({
        success: true,
        fraudAnalysis: fraudAnalysis,
        alertCreated: fraudAnalysis.riskScore >= 0.7
      });

    } catch (error) {
      console.error('Fraud detection error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze for fraud',
        details: error.message 
      });
    }
  },

  // Get AI insights dashboard
  getAIInsights: async (req, res) => {
    try {
      const { state, district, timeframe = '30d' } = req.query;

      // Get recent policy recommendations
      let policyQuery = supabase
        .from('policy_recommendations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent conflicts
      let conflictQuery = supabase
        .from('conflicts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get fraud alerts
      let fraudQuery = supabase
        .from('fraud_alerts')
        .select('*')
        .eq('investigation_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      const [
        { data: recentPolicies },
        { data: recentConflicts },
        { data: fraudAlerts }
      ] = await Promise.all([
        policyQuery,
        conflictQuery,
        fraudQuery
      ]);

      // Generate summary insights
      const insights = await openaiService.generateInsights({
        recentPolicies,
        recentConflicts,
        fraudAlerts,
        state,
        district,
        timeframe
      });

      res.json({
        success: true,
        insights: insights,
        data: {
          recentPolicies: recentPolicies || [],
          recentConflicts: recentConflicts || [],
          fraudAlerts: fraudAlerts || []
        }
      });

    } catch (error) {
      console.error('Get AI insights error:', error);
      res.status(500).json({ 
        error: 'Failed to get AI insights',
        details: error.message 
      });
    }
  }
};

module.exports = aiController;
