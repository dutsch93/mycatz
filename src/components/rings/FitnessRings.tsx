import { RadialBar, RadialBarChart, PolarAngleAxis } from 'recharts'

interface Props {
  foodCurrentG: number
  foodTargetG: number
  playCurrentMin: number
  playTargetMin: number
}

export default function FitnessRings({
  foodCurrentG,
  foodTargetG,
  playCurrentMin,
  playTargetMin,
}: Props) {
  const foodPercent = foodTargetG > 0 ? Math.round((foodCurrentG / foodTargetG) * 100) : 0
  const playPercent = playTargetMin > 0 ? Math.round((playCurrentMin / playTargetMin) * 100) : 0

  const foodColor = 'var(--color-sage)'
  const playColor = 'var(--color-apricot)'

  const data = [
    { name: 'Futter', value: Math.min(foodPercent, 100), fill: foodColor },
    { name: 'Spielen', value: Math.min(playPercent, 100), fill: playColor },
  ]

  // Gesamtwert in der Ringmitte: Durchschnitt aus beiden Tageszielen (je auf 100%
  // gedeckelt), damit eine einzelne Zahl den Tagesfortschritt zusammenfasst.
  const combinedPercent = Math.round((Math.min(foodPercent, 100) + Math.min(playPercent, 100)) / 2)

  return (
    <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2">
      <div className="flex flex-col items-center text-center min-w-0">
        <span className="text-[20px] font-medium leading-tight" style={{ color: foodColor }}>
          Futter
        </span>
        <p className="text-[13px] font-semibold text-text-primary">{foodPercent}%</p>
        <p className="text-[13px] text-text-secondary">
          {foodCurrentG}/{foodTargetG}g
        </p>
      </div>

      <div className="relative shrink-0">
        <RadialBarChart
          width={160}
          height={160}
          innerRadius="60%"
          outerRadius="100%"
          barSize={14}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={7} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[22px] font-medium text-text-primary leading-tight">
            {combinedPercent}%
          </p>
          <p className="text-[13px] text-text-secondary">Gesamt</p>
        </div>
      </div>

      <div className="flex flex-col items-center text-center min-w-0">
        <span className="text-[20px] font-medium leading-tight" style={{ color: playColor }}>
          Spielen
        </span>
        <p className="text-[13px] font-semibold text-text-primary">{playPercent}%</p>
        <p className="text-[13px] text-text-secondary">
          {playCurrentMin}/{playTargetMin}min
        </p>
      </div>
    </div>
  )
}
