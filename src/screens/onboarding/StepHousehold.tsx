import type { OnboardingDraft } from '../../lib/onboardingDraft'

interface Props {
  draft: OnboardingDraft
  onChange: (draft: OnboardingDraft) => void
}

export default function StepHousehold({ draft, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2>Euer Haushalt</h2>
        <p className="text-[13px] text-text-secondary mt-1">
          Wie soll euer Haushalt heißen und wer legt ihn an?
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-text-secondary">Haushaltsname</span>
        <input
          type="text"
          value={draft.householdName}
          onChange={(e) => onChange({ ...draft, householdName: e.target.value })}
          placeholder="z. B. Zuhause bei Luna & Milo"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-text-secondary">Dein Name</span>
        <input
          type="text"
          value={draft.ownerName}
          onChange={(e) => onChange({ ...draft, ownerName: e.target.value })}
          placeholder="z. B. Anh"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-text-secondary">Deine E-Mail</span>
        <input
          type="email"
          value={draft.ownerEmail}
          onChange={(e) => onChange({ ...draft, ownerEmail: e.target.value })}
          placeholder="du@beispiel.de"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
        <span className="text-[13px] text-text-secondary">
          Am Ende schicken wir dir einen Login-Link an diese Adresse.
        </span>
      </label>
    </div>
  )
}
