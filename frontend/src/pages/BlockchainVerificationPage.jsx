import React, { useState, useEffect } from 'react'
import { apiService } from '../services/apiService'
import LoadingSpinner from '../components/LoadingSpinner'

const BlockchainVerificationPage = () => {
  const [tokenId, setTokenId] = useState('')
  const [nftDetails, setNftDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadBlockchainStats()
  }, [])

  const loadBlockchainStats = async () => {
    try {
      const result = await apiService.blockchain.getStats()
      setStats(result)
    } catch (err) {
      console.error('Stats loading error:', err)
    }
  }

  const handleVerifyToken = async (e) => {
    e.preventDefault()
    
    if (!tokenId.trim()) {
      setError('Please enter a token ID')
      return
    }

    try {
      setLoading(true)
      setError('')
      setNftDetails(null)

      const result = await apiService.blockchain.getNFTDetails(tokenId.trim())
      setNftDetails(result)

    } catch (err) {
      console.error('Token verification error:', err)
      setError('Failed to verify token. Please check the token ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    })
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Blockchain Verification</h1>
        <p className="mt-2 text-gray-600">
          Verify land title NFTs on the Avalanche blockchain for immutable record authentication
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Verification Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Verify NFT Token</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleVerifyToken} className="space-y-4">
                <div>
                  <label htmlFor="tokenId" className="form-label">
                    NFT Token ID
                  </label>
                  <input
                    type="text"
                    id="tokenId"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="form-input"
                    placeholder="Enter NFT token ID (e.g., MOCK_12345678)"
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    Enter the NFT token ID from a FRA record to verify its blockchain authenticity
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={loading || !tokenId.trim()}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" text="Verifying..." />
                  ) : (
                    'Verify Token'
                  )}
                </button>
              </form>

              {error && (
                <div className="mt-4 alert alert-danger">
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* NFT Details */}
          {nftDetails && (
            <div className="card mt-6">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">NFT Details</h3>
                  <div className="flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified on Blockchain
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* NFT Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">NFT Information</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Token ID</dt>
                        <dd className="text-sm text-gray-900 font-mono flex items-center">
                          {nftDetails.nft.tokenId}
                          <button
                            onClick={() => copyToClipboard(nftDetails.nft.tokenId)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Owner</dt>
                        <dd className="text-sm text-gray-900 font-mono">{nftDetails.nft.owner}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Network</dt>
                        <dd className="text-sm text-gray-900">{nftDetails.nft.network}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Token URI</dt>
                        <dd className="text-sm text-gray-900 break-all">{nftDetails.nft.tokenURI}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Metadata */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Metadata</h4>
                    {nftDetails.nft.metadata ? (
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.nft.metadata.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Description</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.nft.metadata.description}</dd>
                        </div>
                        {nftDetails.nft.metadata.attributes && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500">Attributes</dt>
                            <dd className="text-sm text-gray-900">
                              <div className="mt-1 space-y-1">
                                {nftDetails.nft.metadata.attributes.map((attr, index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{attr.trait_type}:</span>
                                    <span className="text-gray-900">{attr.value}</span>
                                  </div>
                                ))}
                              </div>
                            </dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-500">No metadata available</p>
                    )}
                  </div>
                </div>

                {/* Associated Record */}
                {nftDetails.record && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Associated FRA Record</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.record.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Patta ID</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.record.patta_id}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Village</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.record.village}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">District</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.record.district}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">State</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.record.state}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Land Area</dt>
                          <dd className="text-sm text-gray-900">{nftDetails.record.land_area || 'N/A'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Statistics */}
        <div className="space-y-6">
          {/* Blockchain Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Blockchain Statistics</h3>
            </div>
            <div className="card-body">
              {stats ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{stats.recordsWithNFTs}</div>
                    <div className="text-sm text-gray-600">Records with NFTs</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.totalRecords}</div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{stats.blockchainCoverage}%</div>
                    <div className="text-sm text-gray-600">Blockchain Coverage</div>
                  </div>

                  {stats.contractInfo && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Contract Info</h4>
                      <dl className="space-y-1 text-xs">
                        <div>
                          <dt className="text-gray-500">Network:</dt>
                          <dd className="text-gray-900">{stats.contractInfo.network}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Status:</dt>
                          <dd className="text-gray-900">{stats.contractInfo.status}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Total Supply:</dt>
                          <dd className="text-gray-900">{stats.contractInfo.totalSupply}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              ) : (
                <LoadingSpinner size="sm" text="Loading stats..." />
              )}
            </div>
          </div>

          {/* How it Works */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">How It Works</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-medium mr-3 mt-0.5">
                    1
                  </div>
                  <p>Each FRA record is automatically minted as an NFT on the Avalanche blockchain</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-medium mr-3 mt-0.5">
                    2
                  </div>
                  <p>The NFT contains immutable metadata about the land title and ownership</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-medium mr-3 mt-0.5">
                    3
                  </div>
                  <p>Token ID can be used to verify authenticity and prevent fraud</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-medium mr-3 mt-0.5">
                    4
                  </div>
                  <p>Blockchain provides transparent and tamper-proof record keeping</p>
                </div>
              </div>
            </div>
          </div>

          {/* Example Token IDs */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Sample Token IDs</h3>
            </div>
            <div className="card-body">
              <div className="space-y-2">
                {['MOCK_12345678', 'MOCK_87654321', 'MOCK_11223344'].map((sampleId) => (
                  <button
                    key={sampleId}
                    onClick={() => setTokenId(sampleId)}
                    className="w-full text-left p-2 text-sm font-mono bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    {sampleId}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Click on any sample token ID to test verification
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlockchainVerificationPage
