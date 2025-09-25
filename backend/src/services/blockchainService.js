const { ethers } = require('ethers');

// Simple ERC721 ABI for NFT operations
const NFT_ABI = [
  "function mint(address to, uint256 tokenId, string memory tokenURI) public",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function transferFrom(address from, address to, uint256 tokenId) public",
  "function totalSupply() public view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(
        process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
      );

      // Initialize wallet (if private key is provided)
      if (process.env.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      }

      // Initialize contract (if contract address is provided)
      if (process.env.CONTRACT_ADDRESS && this.wallet) {
        this.contract = new ethers.Contract(
          process.env.CONTRACT_ADDRESS,
          NFT_ABI,
          this.wallet
        );
      }

      this.initialized = true;
      console.log('Blockchain service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      // Continue without blockchain functionality
    }
  }

  async mintNFT(recordId, metadata) {
    await this.initialize();

    // If no contract or wallet, return mock token ID
    if (!this.contract || !this.wallet) {
      console.warn('Blockchain not configured, returning mock token ID');
      return this.generateMockTokenId(recordId);
    }

    try {
      // Generate unique token ID based on record ID
      const tokenId = this.generateTokenId(recordId);

      // Create metadata URI (in production, this would be uploaded to IPFS)
      const metadataUri = this.createMetadataUri(metadata);

      // Mint NFT
      const transaction = await this.contract.mint(
        this.wallet.address,
        tokenId,
        metadataUri
      );

      await transaction.wait();

      console.log(`NFT minted successfully: Token ID ${tokenId}, TX: ${transaction.hash}`);
      return tokenId.toString();

    } catch (error) {
      console.error('NFT minting failed:', error);
      // Return mock token ID as fallback
      return this.generateMockTokenId(recordId);
    }
  }

  async getNFTDetails(tokenId) {
    await this.initialize();

    if (!this.contract) {
      return this.getMockNFTDetails(tokenId);
    }

    try {
      const owner = await this.contract.ownerOf(tokenId);
      const tokenURI = await this.contract.tokenURI(tokenId);

      return {
        tokenId: tokenId,
        owner: owner,
        tokenURI: tokenURI,
        metadata: this.parseMetadataUri(tokenURI),
        network: 'Avalanche Testnet'
      };

    } catch (error) {
      console.error('Failed to get NFT details:', error);
      return this.getMockNFTDetails(tokenId);
    }
  }

  async verifyOwnership(tokenId, ownerAddress) {
    await this.initialize();

    if (!this.contract) {
      return true; // Mock verification
    }

    try {
      const actualOwner = await this.contract.ownerOf(tokenId);
      return actualOwner.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      console.error('Ownership verification failed:', error);
      return false;
    }
  }

  async transferNFT(tokenId, fromAddress, toAddress) {
    await this.initialize();

    if (!this.contract || !this.wallet) {
      return this.generateMockTransactionHash();
    }

    try {
      const transaction = await this.contract.transferFrom(
        fromAddress,
        toAddress,
        tokenId
      );

      await transaction.wait();
      return transaction.hash;

    } catch (error) {
      console.error('NFT transfer failed:', error);
      throw error;
    }
  }

  async getContractInfo() {
    await this.initialize();

    if (!this.contract) {
      return {
        address: 'Mock Contract',
        network: 'Avalanche Testnet',
        totalSupply: '50',
        status: 'Mock Mode'
      };
    }

    try {
      const totalSupply = await this.contract.totalSupply();

      return {
        address: process.env.CONTRACT_ADDRESS,
        network: 'Avalanche Testnet',
        totalSupply: totalSupply.toString(),
        status: 'Connected'
      };

    } catch (error) {
      console.error('Failed to get contract info:', error);
      return {
        address: process.env.CONTRACT_ADDRESS,
        network: 'Avalanche Testnet',
        totalSupply: 'Unknown',
        status: 'Error'
      };
    }
  }

  // Helper methods
  generateTokenId(recordId) {
    // Convert record UUID to a number for token ID
    const hash = ethers.keccak256(ethers.toUtf8Bytes(recordId));
    return ethers.toBigInt(hash);
  }

  generateMockTokenId(recordId) {
    // Generate a mock token ID based on record ID
    return `MOCK_${recordId.slice(-8)}`;
  }

  createMetadataUri(metadata) {
    // In production, this would upload to IPFS and return the hash
    // For now, return a mock URI
    return `https://api.fra-atlas.com/metadata/${metadata.name.replace(/\s+/g, '_')}`;
  }

  parseMetadataUri(uri) {
    // Mock metadata parsing
    return {
      name: 'FRA Land Title',
      description: 'Forest Rights Act land title NFT',
      image: 'https://api.fra-atlas.com/images/land-title.png'
    };
  }

  getMockNFTDetails(tokenId) {
    return {
      tokenId: tokenId,
      owner: '0x742d35Cc6634C0532925a3b8D4D8F8a4e0b1234567',
      tokenURI: `https://api.fra-atlas.com/metadata/${tokenId}`,
      metadata: {
        name: `FRA Land Title #${tokenId}`,
        description: 'Forest Rights Act land title NFT',
        image: 'https://api.fra-atlas.com/images/land-title.png',
        attributes: [
          { trait_type: 'Network', value: 'Avalanche Testnet' },
          { trait_type: 'Type', value: 'Land Title' }
        ]
      },
      network: 'Avalanche Testnet (Mock)'
    };
  }

  generateMockTransactionHash() {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

module.exports = new BlockchainService();
