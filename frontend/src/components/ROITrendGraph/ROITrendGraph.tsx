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
  const width = 900
  const height = 400
  const padding = { top: 60, right: 50, bottom: 60, left: 70 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom
  const barWidth = graphWidth / graphData.length * 0.6
  
  const currentYear = new Date().getFullYear()
  
  // Find peak occupancy for annotation
  const peakData = useMemo(() => {
    let maxOccupancy = 0
    let peakIndex = 0
    graphData.forEach((data, index) => {
      if (data.occupancy > maxOccupancy) {
        maxOccupancy = data.occupancy
        peakIndex = index
      }
    })
    return { index: peakIndex, value: maxOccupancy, month: graphData[peakIndex]?.month }
  }, [graphData])
  
  // Generate trend line path
  const trendLinePath = useMemo(() => {
    return graphData.map((data, index) => {
      const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length) / 2
      const y = padding.top + graphHeight - (data.occupancy / 100) * graphHeight
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }, [graphData, graphWidth, graphHeight])
  
  // Get trend line points for dots
  const trendLinePoints = useMemo(() => {
    return graphData.map((data, index) => ({
      x: padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length) / 2,
      y: padding.top + graphHeight - (data.occupancy / 100) * graphHeight,
      occupancy: data.occupancy
    }))
  }, [graphData, graphWidth, graphHeight])
  
  // Low occupancy threshold at 40%
  const thresholdY = padding.top + graphHeight - (40 / 100) * graphHeight
  
  // Peak point for annotation
  const peakPoint = trendLinePoints[peakData.index]
  
  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <div className="min-w-[900px]">
        {/* Title */}
        <div className="text-center mb-2">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#2C3E1F]">
            Occupancy Trend ({currentYear})
          </h3>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mb-4 bg-white/80 py-2 px-4 rounded-lg inline-flex mx-auto" style={{ display: 'flex' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-4 bg-[#F5E6C8] border border-[#D4AF37]/50 rounded-sm"></div>
            <span className="text-sm text-gray-700">Occupancy Rate (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-[#4A5D23]"></div>
            <div className="w-2 h-2 bg-[#4A5D23] rounded-full -ml-3.5"></div>
            <span className="text-sm text-gray-700 ml-1">Occupancy Trend</span>
          </div>
        </div>
        
        {/* Chart with border */}
        <div className="border-2 border-gray-800 rounded-lg bg-white p-2">
          <svg width={width} height={height} className="w-full h-auto">
            {/* Chart background */}
            <rect
              x={padding.left}
              y={padding.top}
              width={graphWidth}
              height={graphHeight}
              fill="#FAFAFA"
            />
            
            {/* Grid lines */}
            {[0, 20, 40, 60, 80, 100].map((value) => {
              const y = padding.top + graphHeight - (value / 100) * graphHeight
              return (
                <g key={value}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + graphWidth}
                    y2={y}
                    stroke="#e0e0e0"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  {/* Y-axis labels */}
                  <text
                    x={padding.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={12}
                    fill="#666"
                  >
                    {value}
                  </text>
                </g>
              )
            })}
            
            {/* Low Occupancy Threshold line at 40% */}
            <line
              x1={padding.left}
              y1={thresholdY}
              x2={padding.left + graphWidth}
              y2={thresholdY}
              stroke="#DC2626"
              strokeWidth={2}
              strokeDasharray="8 4"
            />
            <text
              x={padding.left + 10}
              y={thresholdY - 8}
              fontSize={11}
              fill="#DC2626"
              fontWeight="500"
            >
              Low Occupancy Threshold
            </text>
            
            {/* Occupancy bars */}
            {graphData.map((data, index) => {
              const barHeight = (data.occupancy / 100) * graphHeight
              const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length - barWidth) / 2
              const y = padding.top + graphHeight - barHeight
              
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#F5E6C8"
                  stroke="#D4AF37"
                  strokeWidth={1}
                  opacity={0.9}
                />
              )
            })}
            
            {/* Trend line */}
            <path
              d={trendLinePath}
              fill="none"
              stroke="#4A5D23"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Trend line dots */}
            {trendLinePoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={6}
                fill="#4A5D23"
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
            
            {/* Peak annotation arrow and text */}
            {peakData.value > 0 && peakPoint && (
              <g>
                {/* Annotation box */}
                <rect
                  x={peakPoint.x - 70}
                  y={peakPoint.y - 75}
                  width={140}
                  height={36}
                  fill="white"
                  stroke="#333"
                  strokeWidth={1}
                  rx={3}
                />
                <text
                  x={peakPoint.x}
                  y={peakPoint.y - 58}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="600"
                  fill="#333"
                >
                  Peak Occupancy
                </text>
                <text
                  x={peakPoint.x}
                  y={peakPoint.y - 45}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#666"
                >
                  ({Math.round(peakData.value)}% in {peakData.month})
                </text>
                {/* Arrow line */}
                <line
                  x1={peakPoint.x}
                  y1={peakPoint.y - 38}
                  x2={peakPoint.x}
                  y2={peakPoint.y - 10}
                  stroke="#333"
                  strokeWidth={2}
                />
                {/* Arrow head */}
                <polygon
                  points={`${peakPoint.x},${peakPoint.y - 8} ${peakPoint.x - 5},${peakPoint.y - 15} ${peakPoint.x + 5},${peakPoint.y - 15}`}
                  fill="#333"
                />
              </g>
            )}
            
            {/* Month labels */}
            {graphData.map((data, index) => {
              const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length) / 2
              return (
                <text
                  key={index}
                  x={x}
                  y={height - padding.bottom + 25}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#666"
                >
                  {data.month}
                </text>
              )
            })}
            
            {/* Year label under month labels */}
            <text
              x={width / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize={13}
              fill="#666"
            >
              {currentYear}
            </text>
            
            {/* Y-axis label */}
            <text
              x={18}
              y={height / 2}
              textAnchor="middle"
              transform={`rotate(-90, 18, ${height / 2})`}
              fontSize={13}
              fill="#666"
            >
              Occupancy Rate (%)
            </text>
            
            {/* Axes */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + graphHeight}
              stroke="#333"
              strokeWidth={2}
            />
            <line
              x1={padding.left}
              y1={padding.top + graphHeight}
              x2={padding.left + graphWidth}
              y2={padding.top + graphHeight}
              stroke="#333"
              strokeWidth={2}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
