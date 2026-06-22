import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { AmbientBackground } from '../ui/AmbientBackground'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#080b12] text-white">
      <AmbientBackground />
      <Sidebar />
      <main className="flex-1 min-w-0 md:pl-0 pl-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 pt-16 md:pt-10">
          {children}
        </div>
      </main>
    </div>
  )
}
