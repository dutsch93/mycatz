import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="py-6">
      <h2>Home</h2>
      <Link to="/onboarding" className="text-apricot underline">
        Onboarding starten
      </Link>
    </div>
  )
}
