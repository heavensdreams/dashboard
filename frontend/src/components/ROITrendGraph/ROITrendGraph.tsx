import { useMemo } from 'react'
import { eachDayOfInterval, startOfYear, endOfYear, format, isWithinInterval } from 'date-fns'
import type { Apartment, Booking } from '@/utils/apartmentHelpers'

interface ROITrendGraphProps {
  properties: Apartment[]
  allBookings: Booking[]
}

export function ROITrendGraph({ properties, allBookings }: ROITrendGraphProps) {
  const graphData = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const yearStart = startOfYear(new Date(currentYear, 0, 1))
    const yearEnd = endOfYear(new Date(currentYear, 11, 31))
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd })
    
    const totalRooms = properties.length
    
    // Calculate daily occupancy and cumulative profit
    let cumulativeProfit = 0
    const dataPoints: { date: Date; profit: number; occupancy: number }[] = []
    
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
      
      // Calculate profit increment based on occupancy rate
      // Full occupancy (all rooms booked) = steep rise (e.g., +3)
      // Partial occupancy (some rooms booked) = small rise (e.g., +1)
      // No bookings = flat (0)
      
      let profitIncrement = 0
      if (bookedRooms === totalRooms && totalRooms > 0) {
        // All rooms booked - steep rise
        profitIncrement = 3
      } else if (bookedRooms > 0) {
        // Some rooms booked - small rise
        profitIncrement = 1
      }
      // No bookings = 0 (flat)
      
      cumulativeProfit += profitIncrement
      
      dataPoints.push({
        date: day,
        profit: cumulativeProfit,
        occupancy: occupancyRate
      })
    })
    
    return dataPoints
  }, [properties, allBookings])
  
  // Calculate graph dimensions
  const width = 800
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom
  
  // Find min/max for scaling
  const maxProfit = Math.max(...graphData.map(d => d.profit), 1)
  const minProfit = 0
  
  // Generate SVG path for the line
  const pathData = graphData.map((point, index) => {
    const x = padding.left + (index / (graphData.length - 1)) * graphWidth
    const y = padding.top + graphHeight - ((point.profit - minProfit) / (maxProfit - minProfit || 1)) * graphHeight
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
  
  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; x: number }[] = []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    months.forEach((month, index) => {
      const monthStart = new Date(new Date().getFullYear(), index, 1)
      const dayIndex = graphData.findIndex(d => 
        format(d.date, 'yyyy-MM') === format(monthStart, 'yyyy-MM')
      )
      if (dayIndex >= 0) {
        labels.push({
          month,
          x: padding.left + (dayIndex / (graphData.length - 1)) * graphWidth
        })
      }
    })
    
    return labels
  }, [graphData, graphWidth])
  
  const currentYear = new Date().getFullYear()
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="text-center mb-4">
          <h3 className="text-lg sm:text-xl font-light text-[#2C3E1F]">
            {currentYear}
          </h3>
        </div>
        <svg width={width} height={height} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + graphHeight * (1 - ratio)
            return (
              <line
                key={ratio}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )
          })}
          
          {/* Profit line */}
          <path
            d={pathData}
            fill="none"
            stroke="#D4AF37"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Area under curve */}
          <path
            d={`${pathData} L ${padding.left + graphWidth} ${padding.top + graphHeight} L ${padding.left} ${padding.top + graphHeight} Z`}
            fill="url(#gradient)"
            opacity={0.2}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          {/* Month labels */}
          {monthLabels.map((label, index) => (
            <text
              key={index}
              x={label.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {label.month}
            </text>
          ))}
          
          {/* Y-axis label */}
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-xs fill-gray-600"
          >
            Cumulative Profit Trend
          </text>
        </svg>
      </div>
    </div>
  )
}
