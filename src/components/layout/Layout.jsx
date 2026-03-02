import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="max-w-lg mx-auto pb-24 px-4 pt-safe">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
