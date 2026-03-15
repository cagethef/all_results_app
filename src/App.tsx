import { Routes, Route, Navigate } from 'react-router-dom'
import { DeviceTable } from './components/DeviceTable/DeviceTable'
import { Scanner } from './components/Scanner/Scanner'
import { Sidebar } from './components/Layout/Sidebar'
import { StatsCards } from './components/Layout/StatsCards'
import { Dashboard } from './components/Dashboard/Dashboard'
import { DebuggingPage } from './components/Debugging/DebuggingPage'
import { JigManagementPage } from './components/JigManagement/JigManagementPage'
import { UsersPage } from './components/Admin/UsersPage'
import { RolesConfigPage } from './components/Admin/RolesConfigPage'
import { WorkorderPage } from './components/Admin/WorkorderPage'
import { ToastContainer } from './components/Toast/ToastContainer'
import { WorkorderSelectModal } from './components/Scanner/WorkorderSelectModal'
import { LoginPage } from './components/Auth/LoginPage'
import { TopBar } from './components/Layout/TopBar'
import { useDevices } from './hooks/useDevices'
import { useToast } from './hooks/useToast'
import { useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ToastProvider } from './contexts/ToastContext'
import { hasPermission } from './types'
import { Clock } from 'lucide-react'
import { useState } from 'react'

function PendingApproval() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aguardando aprovação</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Sua conta <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span> ainda não tem um cargo atribuído.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Solicite acesso a um administrador.
        </p>
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  )
}

function App() {
  const { user, role, permissions, roleLoading } = useAuth()
  const toast = useToast()
  const {
    devices, addAllDevices, addSingleDevice, clearDevices, stats,
    loading, pendingDisambiguation, resolveDisambiguation, cancelDisambiguation,
  } = useDevices(toast)

  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  if (!user) return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  if (roleLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!role) return <PendingApproval />

  if (!permissions) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(permissions, p)

  return (
    <ToastProvider>
    <NotificationProvider>
    <div className="min-h-screen flex">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(prev => !prev)}
      />

      <main className={`flex-1 ${sidebarExpanded ? 'ml-60' : 'ml-16'} transition-all duration-200 min-h-screen flex flex-col`}>
        <TopBar />
        <Routes>
          <Route path="/" element={<Navigate to="/results" replace />} />
          <Route path="/login" element={<Navigate to="/results" replace />} />

          <Route path="/results" element={
            can('view_results') ? (
              <div className="px-6 py-6 space-y-4">
                <StatsCards stats={stats} devices={devices} />
                <Scanner onAddAll={addAllDevices} onSingleDevice={addSingleDevice} loading={loading} />
                <DeviceTable devices={devices} onClearAll={clearDevices} />
              </div>
            ) : <Navigate to="/" replace />
          } />

          <Route path="/dashboard" element={
            can('view_dashboard') ? (
              <div className="px-6 py-6">
                <Dashboard devices={devices} />
              </div>
            ) : <Navigate to="/" replace />
          } />

          <Route path="/debugging" element={
            can('view_debugging') ? <DebuggingPage /> : <Navigate to="/results" replace />
          } />

          <Route path="/jig-management" element={
            can('view_jig_management') ? <JigManagementPage /> : <Navigate to="/results" replace />
          } />

          <Route path="/admin/users" element={
            can('manage_users') ? <UsersPage /> : <Navigate to="/results" replace />
          } />

          <Route path="/admin/roles" element={
            can('manage_users') ? <RolesConfigPage /> : <Navigate to="/results" replace />
          } />

          <Route path="/admin/wo-template" element={
            can('manage_users') ? <WorkorderPage /> : <Navigate to="/results" replace />
          } />
        </Routes>
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
    </NotificationProvider>
    </ToastProvider>
  )
}

export default App
