import { DeviceTable } from './components/DeviceTable/DeviceTable'
import { Scanner } from './components/Scanner/Scanner'
import { Header } from './components/Layout/Header'
import { StatsCards } from './components/Layout/StatsCards'
import { useDevices } from './hooks/useDevices'

function App() {
  const { devices, addDevice, clearDevices, stats } = useDevices()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <StatsCards stats={stats} devices={devices} />

        {/* Scanner Section */}
        <Scanner onDeviceAdded={addDevice} />

        {/* Results Table */}
        <DeviceTable devices={devices} onClearAll={clearDevices} />
      </div>
    </div>
  )
}

export default App
