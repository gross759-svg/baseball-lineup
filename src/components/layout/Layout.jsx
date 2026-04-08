import BottomNav from './BottomNav.jsx'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
