import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DeviceTable } from './components/DeviceTable/DeviceTable'
import { Scanner } from './components/Scanner/Scanner'
import { Sidebar } from './components/Layout/Sidebar'
import { StatsCards } from './components/Layout/StatsCards'
import { Dashboard } from './components/Dashboard/Dashboard'
import { DebuggingPage } from './components/Debugging/DebuggingPage'
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

  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="min-h-screen flex">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(prev => !prev)}
      />

      <main className={`flex-1 ${sidebarExpanded ? 'ml-60' : 'ml-16'} transition-all duration-200`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/results" replace />} />

            <Route path="/results" element={
              <>
                <StatsCards stats={stats} devices={devices} />
                <Scanner
                  onAddAll={addAllDevices}
                  onSingleDevice={addSingleDevice}
                  loading={loading}
                />
                <DeviceTable devices={devices} onClearAll={clearDevices} />
              </>
            } />

            <Route path="/dashboard" element={<Dashboard devices={devices} />} />

            <Route path="/debugging" element={<DebuggingPage />} />
          </Routes>
        </div>
      </main>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

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
