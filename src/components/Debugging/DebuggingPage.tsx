import { Bug } from 'lucide-react'

export function DebuggingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-400 dark:text-gray-600">
      <Bug size={48} />
      <p className="text-lg font-medium">Debugging</p>
      <p className="text-sm">Em construção</p>
    </div>
  )
}
