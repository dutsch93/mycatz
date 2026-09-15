import { RadialBar, RadialBarChart, PolarAngleAxis } from 'recharts'
import { ampelColor } from '../shared/AmpelDot'

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

  const data = [
    { name: 'Futter', value: Math.min(foodPercent, 100), fill: ampelColor(foodPercent) },
    { name: 'Spiel', value: Math.min(playPercent, 100), fill: 'var(--color-apricot)' },
  ]

  return (
    <div className="relative w-full flex justify-center">
      <RadialBarChart
        width={220}
        height={220}
        innerRadius="60%"
        outerRadius="100%"
        barSize={16}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background dataKey="value" cornerRadius={8} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[22px] font-medium text-text-primary">{foodPercent}%</p>
        <p className="text-[13px] text-text-secondary">
          {foodCurrentG}/{foodTargetG}g
        </p>
        <div className="flex items-center gap-3 mt-2 text-[13px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sage inline-block" /> Futter
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-apricot inline-block" /> Spiel
          </span>
        </div>
      </div>
    </div>
  )
}
