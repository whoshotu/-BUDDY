import { useState } from 'react'
import { 
  Activity, 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  User, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield
} from 'lucide-react'
import { mockPatient, mockConversations, mockAlerts } from '../mocks/data'
import { formatDistanceToNow, format } from 'date-fns'
import type { Alert, Conversation } from '../types'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'alerts'>('overview')
  const patient = mockPatient
  const conversations = mockConversations
  const alerts = mockAlerts

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged)
  const lastConversation = conversations[0]
  const emergencyAlerts = alerts.filter(a => a.level === 2)
  const concerningAlerts = alerts.filter(a => a.level === 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Buddy Dashboard</h1>
                <p className="text-sm text-gray-500">Caregiver Monitoring Center</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {unacknowledgedAlerts.length > 0 && (
                <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {unacknowledgedAlerts.length} Unacknowledged Alerts
                  </span>
                </div>
              )}
              <div className="text-sm text-gray-500">
                Welcome back, Caregiver
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Overview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{patient.preferredName}</h2>
                <p className="text-gray-600">{patient.fullName}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {patient.dementiaStage} dementia
                  </span>
                  <span className="text-sm text-gray-500">
                    DOB: {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Last Conversation</div>
              <div className="flex items-center space-x-2 text-gray-900">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {lastConversation ? formatDistanceToNow(new Date(lastConversation.timestamp)) + ' ago' : 'No conversations'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Total Conversations</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Emergency Alerts</span>
              </div>
              <div className="text-2xl font-bold text-red-700">{emergencyAlerts.length}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-600 mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-sm">Concerning Alerts</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">{concerningAlerts.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-600 mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Status</span>
              </div>
              <div className="text-2xl font-bold text-green-700">Active</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', count: null },
              { id: 'conversations', label: 'Conversations', count: conversations.length },
              { id: 'alerts', label: 'Alerts', count: unacknowledgedAlerts.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full
                    ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Safety Profile */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Safety Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Emergency Contacts</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">Caregiver: {patient.safetyProfile.caregiverPhone}</span>
                    </div>
                    {patient.safetyProfile.emergencyContacts.map((contact, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{contact}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Medical Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Conditions</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {patient.safetyProfile.medicalConditions.map((condition, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Allergies</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {patient.safetyProfile.allergies.map((allergy, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {conversations.slice(0, 3).map((conv, idx) => (
                  <ConversationItem key={idx} conversation={conv} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Conversation History</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {conversations.map((conv, idx) => (
                <ConversationItem key={idx} conversation={conv} detailed />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Safety Alerts</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ConversationItem({ conversation, detailed = false }: { conversation: Conversation; detailed?: boolean }) {
  return (
    <div className={`p-4 ${detailed ? 'hover:bg-gray-50' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {conversation.intent}
          </span>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(conversation.timestamp))} ago
          </span>
        </div>
        {conversation.escalationLevel > 0 && (
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            conversation.escalationLevel === 2 
              ? 'bg-red-100 text-red-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            Level {conversation.escalationLevel}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <div className="h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-3 w-3 text-primary-600" />
          </div>
          <p className="text-sm text-gray-900">"{conversation.userUtterance}"</p>
        </div>
        <div className="flex items-start space-x-2 pl-8">
          <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-3 w-3 text-gray-600" />
          </div>
          <p className="text-sm text-gray-600">{conversation.assistantResponse}</p>
        </div>
      </div>
      {conversation.caregiverNotified && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-yellow-600">
          <AlertCircle className="h-3 w-3" />
          <span>Caregiver notified</span>
        </div>
      )}
    </div>
  )
}

function AlertItem({ alert }: { alert: Alert }) {
  return (
    <div className={`p-4 hover:bg-gray-50 ${!alert.acknowledged ? 'bg-yellow-50/50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            alert.level === 2 ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {alert.level === 2 ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Activity className="h-5 w-5 text-yellow-600" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                alert.level === 2 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                Level {alert.level}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(alert.timestamp))} ago
              </span>
            </div>
            <p className="text-sm text-gray-900">{alert.message}</p>
            <div className="mt-2 flex items-center space-x-2">
              {alert.acknowledged ? (
                <span className="inline-flex items-center space-x-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Acknowledged</span>
                </span>
              ) : (
                <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Acknowledge Alert
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
