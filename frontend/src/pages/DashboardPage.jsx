import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { dbService } from '../services/supabaseService'
import LoadingSpinner from '../components/LoadingSpinner'

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalRecords: 0,
    recordsWithFaces: 0,
    recordsWithNFTs: 0,
    fraudAlerts: 0,
    recentRecords: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load basic records stats
      const { data: records, error: recordsError } = await dbService.records.getAll({ limit: 5 })
      if (recordsError) throw recordsError

      // Load additional stats from API
      const [faceStats, blockchainStats, fraudAlerts] = await Promise.all([
        apiService.face.getStats().catch(() => ({ recordsWithFaces: 0, totalRecords: 0 })),
        apiService.blockchain.getStats().catch(() => ({ recordsWithNFTs: 0 })),
        dbService.fraudAlerts.getAll().catch(() => ({ data: [] }))
      ])

      setStats({
        totalRecords: records?.length || 0,
        recordsWithFaces: faceStats.recordsWithFaces || 0,
        recordsWithNFTs: blockchainStats.recordsWithNFTs || 0,
        fraudAlerts: fraudAlerts.data?.length || 0,
        recentRecords: records || []
      })

    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="alert alert-danger">
          <p>{error}</p>
          <button 
            onClick={loadDashboardData}
            className="btn btn-secondary mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of Forest Rights Act implementation monitoring
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Records"
          value={stats.totalRecords}
          icon="📊"
          color="bg-blue-500"
          link="/records"
        />
        <StatCard
          title="Face Recognition"
          value={stats.recordsWithFaces}
          icon="👤"
          color="bg-green-500"
          link="/verification"
        />
        <StatCard
          title="Blockchain NFTs"
          value={stats.recordsWithNFTs}
          icon="🔗"
          color="bg-purple-500"
          link="/blockchain"
        />
        <StatCard
          title="Fraud Alerts"
          value={stats.fraudAlerts}
          icon="⚠️"
          color="bg-red-500"
          link="/fraud-detection"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <QuickActions />
        <RecentRecords records={stats.recentRecords} />
      </div>

      {/* Feature Overview */}
      <FeatureOverview />
    </div>
  )
}

const StatCard = ({ title, value, icon, color, link }) => (
  <Link to={link} className="block">
    <div className="card hover:shadow-lg transition-shadow cursor-pointer">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-white text-xl`}>
            {icon}
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    </div>
  </Link>
)

const QuickActions = () => (
  <div className="card">
    <div className="card-header">
      <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
    </div>
    <div className="card-body">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/digitize"
          className="flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white">
            📄
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Digitize Records</p>
            <p className="text-xs text-gray-600">Process legacy documents</p>
          </div>
        </Link>

        <Link
          to="/add-record"
          className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
            ➕
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Add New Record</p>
            <p className="text-xs text-gray-600">Create new FRA record</p>
          </div>
        </Link>

        <Link
          to="/verification"
          className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
            🔍
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Face Verification</p>
            <p className="text-xs text-gray-600">Verify identity</p>
          </div>
        </Link>

        <Link
          to="/map"
          className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">
            🗺️
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Map View</p>
            <p className="text-xs text-gray-600">Explore FRA areas</p>
          </div>
        </Link>
      </div>
    </div>
  </div>
)

const RecentRecords = ({ records }) => (
  <div className="card">
    <div className="card-header">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Recent Records</h3>
        <Link to="/records" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
          View all
        </Link>
      </div>
    </div>
    <div className="card-body">
      {records.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No records found</p>
      ) : (
        <div className="space-y-3">
          {records.slice(0, 5).map((record) => (
            <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{record.name}</p>
                <p className="text-xs text-gray-600">
                  {record.patta_id} • {record.village}, {record.district}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(record.created_at).toLocaleDateString()}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  record.verification_status === 'verified' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {record.verification_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)

const FeatureOverview = () => (
  <div className="card">
    <div className="card-header">
      <h3 className="text-lg font-medium text-gray-900">System Features</h3>
    </div>
    <div className="card-body">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="AI-Powered OCR"
          description="Extract text from scanned documents using advanced OCR technology"
          icon="🤖"
          link="/digitize"
        />
        <FeatureCard
          title="Face Recognition"
          description="Biometric verification using face recognition technology"
          icon="👁️"
          link="/verification"
        />
        <FeatureCard
          title="Blockchain Integration"
          description="Secure land title verification using NFTs on Avalanche"
          icon="⛓️"
          link="/blockchain"
        />
        <FeatureCard
          title="WebGIS Mapping"
          description="Interactive maps showing FRA areas and land records"
          icon="🗺️"
          link="/map"
        />
        <FeatureCard
          title="Policy Recommendations"
          description="AI-generated policy suggestions and funding schemes"
          icon="📋"
          link="/policy"
        />
        <FeatureCard
          title="Conflict Resolution"
          description="AI-powered analysis and resolution of land disputes"
          icon="⚖️"
          link="/conflicts"
        />
      </div>
    </div>
  </div>
)

const FeatureCard = ({ title, description, icon, link }) => (
  <Link to={link} className="block group">
    <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
        {title}
      </h4>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
    </div>
  </Link>
)

export default DashboardPage
