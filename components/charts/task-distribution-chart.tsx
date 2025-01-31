import { PieChart, Pie, Cell } from "recharts"

type TaskDistributionChartProps = {
  data: Array<{
    name: string
    value: number
    color: string
  }>
}

export default function TaskDistributionChart({ data }: TaskDistributionChartProps) {
  return (
    <PieChart width={100} height={80}>
      <Pie
        data={data}
        cx={50}
        cy={40}
        innerRadius={25}
        outerRadius={35}
        paddingAngle={2}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  )
} 