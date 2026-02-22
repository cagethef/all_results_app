import { useState } from 'react'
import { DeviceTable } from './components/DeviceTable/DeviceTable'
import { Scanner } from './components/Scanner/Scanner'
import { Sidebar } from './components/Layout/Sidebar'
import { StatsCards } from './components/Layout/StatsCards'
import { ToastContainer } from './components/Toast/ToastContainer'
import { WorkorderSelectModal } from './components/Scanner/WorkorderSelectModal'
import { useDevices } from './hooks/useDevices'
import { useToast } from './hooks/useToast'

function App() {
  const toast = useToast()
  const {
    devices,
    addAllDevices,
    addSingleDevice,
    clearDevices,
    stats,
    loading,
    pendingDisambiguation,
    resolveDisambiguation,
    cancelDisambiguation,
  } = useDevices(toast)

  const [activeSection, setActiveSection] = useState('consultar')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="min-h-screen flex">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(prev => !prev)}
      />

      <main className={`flex-1 ${sidebarExpanded ? 'ml-60' : 'ml-16'} transition-all duration-200`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Cards */}
          <StatsCards stats={stats} devices={devices} />

          {/* Scanner Section */}
          <Scanner
            onAddAll={addAllDevices}
            onSingleDevice={addSingleDevice}
            loading={loading}
          />

          {/* Results Table */}
          <DeviceTable devices={devices} onClearAll={clearDevices} />
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Workorder Disambiguation Modal */}
      {pendingDisambiguation && (
        <WorkorderSelectModal
          disambiguation={pendingDisambiguation}
          onConfirm={resolveDisambiguation}
          onCancel={cancelDisambiguation}
        />
      )}
    </div>
  )
}

export default App
