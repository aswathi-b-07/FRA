const blockchainService = require('../services/blockchainService');
const supabase = require('../utils/supabaseClient');

const blockchainController = {
  // Mint NFT for a record
  mintNFT: async (req, res) => {
    try {
      const { recordId, metadata } = req.body;

      if (!recordId) {
        return res.status(400).json({ error: 'Record ID is required' });
      }

      // Get record details
      const { data: record, error: recordError } = await supabase
        .from('records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (recordError || !record) {
        return res.status(404).json({ error: 'Record not found' });
      }

      // Check if NFT already exists
      if (record.blockchain_token_id) {
        return res.status(409).json({ 
          error: 'NFT already exists for this record',
          tokenId: record.blockchain_token_id
        });
      }

      // Prepare metadata
      const nftMetadata = metadata || {
        name: `FRA Land Title - ${record.patta_id}`,
        description: `Forest Rights Act land title for ${record.name}`,
        attributes: [
          { trait_type: 'Patta ID', value: record.patta_id },
          { trait_type: 'Owner', value: record.name },
          { trait_type: 'Village', value: record.village },
          { trait_type: 'District', value: record.district },
          { trait_type: 'State', value: record.state },
          { trait_type: 'Land Area', value: record.land_area?.toString() || 'N/A' },
          { trait_type: 'Land Type', value: record.land_type || 'N/A' }
        ],
        coordinates: record.coordinates
      };

      // Mint NFT
      const tokenId = await blockchainService.mintNFT(recordId, nftMetadata);

      // Update record with token ID
      const { error: updateError } = await supabase
        .from('records')
        .update({ blockchain_token_id: tokenId })
        .eq('id', recordId);

      if (updateError) {
        console.error('Failed to update record with token ID:', updateError);
        // NFT is minted but record update failed - log this for manual resolution
      }

      res.json({
        success: true,
        message: 'NFT minted successfully',
        tokenId: tokenId,
        transactionHash: tokenId, // In a real implementation, you'd return the actual tx hash
        metadata: nftMetadata
      });

    } catch (error) {
      console.error('Mint NFT error:', error);
      res.status(500).json({ 
        error: 'Failed to mint NFT',
        details: error.message 
      });
    }
  },

  // Get NFT details by token ID
  getNFTDetails: async (req, res) => {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      // Get NFT details from blockchain
      const nftDetails = await blockchainService.getNFTDetails(tokenId);

      if (!nftDetails) {
        return res.status(404).json({ error: 'NFT not found' });
      }

      // Get associated record
      const { data: record, error: recordError } = await supabase
        .from('records')
        .select('*')
        .eq('blockchain_token_id', tokenId)
        .single();

      res.json({
        success: true,
        nft: nftDetails,
        record: record || null,
        recordError: recordError?.message || null
      });

    } catch (error) {
      console.error('Get NFT details error:', error);
      res.status(500).json({ 
        error: 'Failed to get NFT details',
        details: error.message 
      });
    }
  },

  // Verify NFT ownership
  verifyOwnership: async (req, res) => {
    try {
      const { tokenId, ownerAddress } = req.body;

      if (!tokenId || !ownerAddress) {
        return res.status(400).json({ 
          error: 'Token ID and owner address are required' 
        });
      }

      const isOwner = await blockchainService.verifyOwnership(tokenId, ownerAddress);

      res.json({
        success: true,
        isOwner: isOwner,
        tokenId: tokenId,
        ownerAddress: ownerAddress
      });

    } catch (error) {
      console.error('Verify ownership error:', error);
      res.status(500).json({ 
        error: 'Failed to verify ownership',
        details: error.message 
      });
    }
  },

  // Get blockchain statistics
  getBlockchainStats: async (req, res) => {
    try {
      // Count records with blockchain tokens
      const { data: withTokens, error: withTokensError } = await supabase
        .from('records')
        .select('id', { count: 'exact' })
        .not('blockchain_token_id', 'is', null);

      // Count total records
      const { data: totalRecords, error: totalError } = await supabase
        .from('records')
        .select('id', { count: 'exact' });

      if (withTokensError || totalError) {
        return res.status(500).json({ error: 'Failed to get statistics' });
      }

      const withTokensCount = withTokens?.length || 0;
      const totalCount = totalRecords?.length || 0;
      const withoutTokensCount = totalCount - withTokensCount;

      // Get contract info (mock for now)
      const contractInfo = await blockchainService.getContractInfo();

      res.json({
        totalRecords: totalCount,
        recordsWithNFTs: withTokensCount,
        recordsWithoutNFTs: withoutTokensCount,
        blockchainCoverage: totalCount > 0 ? (withTokensCount / totalCount * 100).toFixed(2) : 0,
        contractInfo: contractInfo
      });

    } catch (error) {
      console.error('Get blockchain stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get blockchain statistics',
        details: error.message 
      });
    }
  },

  // Transfer NFT (for ownership changes)
  transferNFT: async (req, res) => {
    try {
      const { tokenId, fromAddress, toAddress } = req.body;

      if (!tokenId || !fromAddress || !toAddress) {
        return res.status(400).json({ 
          error: 'Token ID, from address, and to address are required' 
        });
      }

      const transactionHash = await blockchainService.transferNFT(
        tokenId, 
        fromAddress, 
        toAddress
      );

      res.json({
        success: true,
        message: 'NFT transferred successfully',
        tokenId: tokenId,
        transactionHash: transactionHash,
        fromAddress: fromAddress,
        toAddress: toAddress
      });

    } catch (error) {
      console.error('Transfer NFT error:', error);
      res.status(500).json({ 
        error: 'Failed to transfer NFT',
        details: error.message 
      });
    }
  }
};

module.exports = blockchainController;
