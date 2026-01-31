import { Test } from '@/types'
import { getTestIcon } from '@/utils/iconMapping'
import { StatusIcon } from '../shared/StatusIcon'

interface TestTabsProps {
  tests: Test[]
  activeIndex: number
  onTabChange: (index: number) => void
}

export function TestTabs({ tests, activeIndex, onTabChange }: TestTabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414] px-6">
      <div className="flex gap-1 overflow-x-auto">
        {tests.map((test, index) => {
          const Icon = getTestIcon(test.testType)
          const isActive = index === activeIndex

          return (
            <button
              key={index}
              onClick={() => onTabChange(index)}
              className={`flex items-center gap-2.5 px-5 py-4 border-b-3 transition-all whitespace-nowrap relative group ${
                isActive
                  ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] font-medium'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-primary-600' : ''} />
              <span className="text-sm">{test.testName}</span>
              <div className="scale-90">
                <StatusIcon status={test.status} size={18} />
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
