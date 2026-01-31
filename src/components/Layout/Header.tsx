import { BarChart3, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                All Results
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sistema de visualização de testes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              title={theme === 'light' ? 'Alternar para modo escuro' : 'Alternar para modo claro'}
            >
              {theme === 'light' ? (
                <Moon size={16} className="text-gray-600" />
              ) : (
                <Sun size={16} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
