export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-page">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-input" />
        <h1 className="text-text-primary">MyCatz</h1>
      </div>
      <button
        className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary"
        aria-label="Profil"
      >
        👤
      </button>
    </header>
  )
}
