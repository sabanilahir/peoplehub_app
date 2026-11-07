'use client'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// Small donut showing what % of mandatory document types have an uploaded
// document — used on the Personal Document tab (both the HR admin view and
// ESS My Profile). Green at 100%, amber mid-way, red when barely started.
export default function DocCompletionDonut({ completed, total, size = 76 }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 100
  const color = pct === 100 ? '#1baf7a' : pct >= 50 ? '#eda100' : '#e34948'
  const data = total > 0
    ? [{ value: completed, fill: color }, { value: Math.max(total - completed, 0), fill: '#eceae3' }]
    : [{ value: 1, fill: '#1baf7a' }]

  return (
    <div className='relative shrink-0' style={{ width: size, height: size }}>
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          {/* Animation off: re-renders on store ticks restart recharts'
              entry animation, which can leave sectors unpainted. */}
          <Pie data={data} dataKey='value' isAnimationActive={false}
            innerRadius='72%' outerRadius='100%' startAngle={90} endAngle={-270} stroke='none'>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className='absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800'>
        {pct}%
      </div>
    </div>
  )
}
