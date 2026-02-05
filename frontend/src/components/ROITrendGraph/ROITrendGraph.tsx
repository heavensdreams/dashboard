import { useMemo } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWithinInterval } from 'date-fns'
import type { Apartment, Booking } from '@/utils/apartmentHelpers'

interface ROITrendGraphProps {
  properties: Apartment[]
  allBookings: Booking[]
}

export function ROITrendGraph({ properties, allBookings }: ROITrendGraphProps) {
  const graphData = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const totalRooms = properties.length
    const months: { month: string; occupancy: number }[] = []
    
    // Calculate monthly occupancy rates
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthStart = startOfMonth(new Date(currentYear, monthIndex, 1))
      const monthEnd = endOfMonth(new Date(currentYear, monthIndex, 1))
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
      
      // Calculate average occupancy for the month
      let totalOccupancy = 0
      let dayCount = 0
      
      days.forEach(day => {
        // Count how many properties (rooms) are booked on this day
        const bookedRooms = properties.filter(property => {
          const propertyBookings = allBookings.filter(booking => 
            booking.property_id === property.id
          )
          return propertyBookings.some(booking => {
            const start = new Date(booking.start_date)
            const end = new Date(booking.end_date)
            return isWithinInterval(day, { start, end })
          })
        }).length
        
        const occupancyRate = totalRooms > 0 ? bookedRooms / totalRooms : 0
        totalOccupancy += occupancyRate
        dayCount++
      })
      
      const avgOccupancy = dayCount > 0 ? totalOccupancy / dayCount : 0
      months.push({
        month: format(monthStart, 'MMM'),
        occupancy: avgOccupancy * 100 // Convert to percentage
      })
    }
    
    return months
  }, [properties, allBookings])
  
  // Calculate graph dimensions
  const width = 800
  const height = 300
  const padding = { top: 20, right: 40, bottom: 50, left: 60 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom
  const barWidth = graphWidth / graphData.length * 0.7 // 70% of available space for bars
  
  const currentYear = new Date().getFullYear()
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="text-center mb-4">
          <h3 className="text-lg sm:text-xl font-light text-[#2C3E1F]">
            Occupancy Rate ({currentYear})
          </h3>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#D4AF37] opacity-70 rounded"></div>
            <span className="text-xs sm:text-sm text-[#4A5D23] font-light">Occupancy Rate (%)</span>
          </div>
        </div>
        <svg width={width} height={height} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = padding.top + graphHeight - (value / 100) * graphHeight
            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                {/* Y-axis labels */}
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {value}%
                </text>
              </g>
            )
          })}
          
          {/* Occupancy bars */}
          {graphData.map((data, index) => {
            const barHeight = (data.occupancy / 100) * graphHeight
            const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length - barWidth) / 2
            const y = padding.top + graphHeight - barHeight
            
            return (
              <g key={index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#D4AF37"
                  opacity={0.7}
                  rx={2}
                />
                {/* Value label on top of bar */}
                {data.occupancy > 5 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="text-xs fill-[#4A5D23] font-medium"
                  >
                    {Math.round(data.occupancy)}%
                  </text>
                )}
              </g>
            )
          })}
          
          {/* Month labels */}
          {graphData.map((data, index) => {
            const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length) / 2
            return (
              <text
                key={index}
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {data.month}
              </text>
            )
          })}
          
          {/* Y-axis label */}
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-xs fill-gray-600"
          >
            Occupancy Rate (%)
          </text>
        </svg>
      </div>
    </div>
  )
}
