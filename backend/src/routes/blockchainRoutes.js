const express = require('express');
const blockchainController = require('../controllers/blockchainController');

const router = express.Router();

// Blockchain NFT routes
router.post('/mint', blockchainController.mintNFT);
router.get('/nft/:tokenId', blockchainController.getNFTDetails);
router.post('/verify-ownership', blockchainController.verifyOwnership);
router.post('/transfer', blockchainController.transferNFT);
router.get('/stats', blockchainController.getBlockchainStats);

module.exports = router;
