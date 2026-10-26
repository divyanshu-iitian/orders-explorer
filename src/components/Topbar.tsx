import type { ReactNode } from 'react'

export function Topbar({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <h1 className="topbar__title">Orders Explorer</h1>
      {children}
    </header>
  )
}
