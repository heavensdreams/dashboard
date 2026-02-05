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
    const months: { month: string; shortMonth: string; occupancy: number }[] = []
    
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
        shortMonth: format(monthStart, 'MMM').charAt(0), // Single letter for mobile
        occupancy: avgOccupancy * 100 // Convert to percentage
      })
    }
    
    return months
  }, [properties, allBookings])
  
  // Calculate graph dimensions - use viewBox for responsive scaling
  const width = 800
  const height = 380
  const padding = { top: 55, right: 30, bottom: 55, left: 55 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom
  const barWidth = graphWidth / graphData.length * 0.55
  
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
    <div className="w-full flex justify-center px-2 sm:px-4">
      <div className="w-full max-w-4xl">
        {/* Title */}
        <div className="text-center mb-2">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#2C3E1F]">
            Occupancy Trend ({currentYear})
          </h3>
        </div>
        
        {/* Legend - responsive layout */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-4 bg-white/80 py-2 px-3 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-4 sm:w-5 h-3 sm:h-4 bg-[#F5E6C8] border border-[#D4AF37]/50 rounded-sm"></div>
            <span className="text-xs sm:text-sm text-gray-700">Occupancy (%)</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-4 sm:w-5 h-0.5 bg-[#4A5D23]"></div>
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-[#4A5D23] rounded-full -ml-2.5 sm:-ml-3.5"></div>
            <span className="text-xs sm:text-sm text-gray-700 ml-0.5 sm:ml-1">Trend</span>
          </div>
        </div>
        
        {/* Chart with border - responsive with viewBox */}
        <div className="border-2 border-gray-800 rounded-lg bg-white p-1 sm:p-2">
          <svg 
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
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
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={10}
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
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <text
              x={padding.left + 8}
              y={thresholdY - 6}
              fontSize={10}
              fill="#DC2626"
              fontWeight="500"
            >
              Low Threshold (40%)
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
                r={5}
                fill="#4A5D23"
                stroke="#fff"
                strokeWidth={1.5}
              />
            ))}
            
            {/* Peak annotation arrow and text */}
            {peakData.value > 0 && peakPoint && (
              <g>
                {/* Calculate annotation position to stay within bounds */}
                {(() => {
                  const boxWidth = 110
                  const boxHeight = 30
                  let annotX = peakPoint.x
                  // Keep annotation box within chart bounds
                  if (annotX - boxWidth/2 < padding.left) {
                    annotX = padding.left + boxWidth/2 + 5
                  } else if (annotX + boxWidth/2 > padding.left + graphWidth) {
                    annotX = padding.left + graphWidth - boxWidth/2 - 5
                  }
                  return (
                    <>
                      {/* Annotation box */}
                      <rect
                        x={annotX - boxWidth/2}
                        y={peakPoint.y - 65}
                        width={boxWidth}
                        height={boxHeight}
                        fill="white"
                        stroke="#333"
                        strokeWidth={1}
                        rx={3}
                      />
                      <text
                        x={annotX}
                        y={peakPoint.y - 51}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="600"
                        fill="#333"
                      >
                        Peak: {Math.round(peakData.value)}%
                      </text>
                      <text
                        x={annotX}
                        y={peakPoint.y - 40}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#666"
                      >
                        ({peakData.month})
                      </text>
                      {/* Arrow line */}
                      <line
                        x1={peakPoint.x}
                        y1={peakPoint.y - 34}
                        x2={peakPoint.x}
                        y2={peakPoint.y - 8}
                        stroke="#333"
                        strokeWidth={1.5}
                      />
                      {/* Arrow head */}
                      <polygon
                        points={`${peakPoint.x},${peakPoint.y - 6} ${peakPoint.x - 4},${peakPoint.y - 12} ${peakPoint.x + 4},${peakPoint.y - 12}`}
                        fill="#333"
                      />
                    </>
                  )
                })()}
              </g>
            )}
            
            {/* Month labels */}
            {graphData.map((data, index) => {
              const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length) / 2
              return (
                <text
                  key={index}
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#666"
                >
                  {data.month}
                </text>
              )
            })}
            
            {/* Year label under month labels */}
            <text
              x={width / 2}
              y={height - 12}
              textAnchor="middle"
              fontSize={11}
              fill="#666"
            >
              {currentYear}
            </text>
            
            {/* Y-axis label */}
            <text
              x={14}
              y={height / 2}
              textAnchor="middle"
              transform={`rotate(-90, 14, ${height / 2})`}
              fontSize={11}
              fill="#666"
            >
              Occupancy (%)
            </text>
            
            {/* Axes */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + graphHeight}
              stroke="#333"
              strokeWidth={1.5}
            />
            <line
              x1={padding.left}
              y1={padding.top + graphHeight}
              x2={padding.left + graphWidth}
              y2={padding.top + graphHeight}
              stroke="#333"
              strokeWidth={1.5}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
