import { useLocation } from 'react-router-dom'

export default function CheckEmail() {
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-app w-full text-center flex flex-col gap-3">
        <div className="text-5xl">📬</div>
        <h2>Fast geschafft!</h2>
        <p className="text-text-secondary">
          Wir haben dir einen Login-Link geschickt{email ? <> an <strong>{email}</strong></> : null}.
          Öffne die E-Mail auf diesem Gerät und tippe auf den Link, um euren Haushalt
          fertig einzurichten.
        </p>
      </div>
    </div>
  )
}
