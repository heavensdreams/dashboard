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
  
  // Calculate graph dimensions - taller aspect ratio for mobile readability
  const width = 600
  const height = 450
  const padding = { top: 70, right: 25, bottom: 70, left: 50 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom
  const barWidth = graphWidth / graphData.length * 0.65
  
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
        {/* Title - larger for mobile */}
        <div className="text-center mb-3">
          <h3 className="text-xl sm:text-2xl font-bold text-[#2C3E1F]">
            Occupancy Trend ({currentYear})
          </h3>
        </div>
        
        {/* Legend - larger text for mobile readability */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-3 sm:mb-4 bg-white/80 py-2 px-4 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-4 bg-[#F5E6C8] border-2 border-[#D4AF37]/60 rounded-sm"></div>
            <span className="text-sm sm:text-base text-gray-700 font-medium">Occupancy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-1 bg-[#4A5D23] rounded"></div>
            <div className="w-2.5 h-2.5 bg-[#4A5D23] rounded-full -ml-4"></div>
            <span className="text-sm sm:text-base text-gray-700 font-medium ml-1">Trend</span>
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
            
            {/* Grid lines - simplified to 0, 50, 100 for readability */}
            {[0, 50, 100].map((value) => {
              const y = padding.top + graphHeight - (value / 100) * graphHeight
              return (
                <g key={value}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + graphWidth}
                    y2={y}
                    stroke="#d0d0d0"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                  {/* Y-axis labels - larger font */}
                  <text
                    x={padding.left - 10}
                    y={y + 5}
                    textAnchor="end"
                    fontSize={16}
                    fontWeight="500"
                    fill="#555"
                  >
                    {value}%
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
              fontSize={14}
              fill="#DC2626"
              fontWeight="600"
            >
              40% threshold
            </text>
            
            {/* Occupancy bars - thicker border for visibility */}
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
                  strokeWidth={2}
                  opacity={0.95}
                />
              )
            })}
            
            {/* Trend line - thicker for mobile visibility */}
            <path
              d={trendLinePath}
              fill="none"
              stroke="#4A5D23"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Trend line dots - larger */}
            {trendLinePoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={7}
                fill="#4A5D23"
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
            
            {/* Peak annotation arrow and text */}
            {peakData.value > 0 && peakPoint && (
              <g>
                {/* Calculate annotation position to stay within bounds */}
                {(() => {
                  const boxWidth = 130
                  const boxHeight = 38
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
                        y={peakPoint.y - 75}
                        width={boxWidth}
                        height={boxHeight}
                        fill="white"
                        stroke="#333"
                        strokeWidth={1.5}
                        rx={4}
                      />
                      <text
                        x={annotX}
                        y={peakPoint.y - 54}
                        textAnchor="middle"
                        fontSize={15}
                        fontWeight="700"
                        fill="#333"
                      >
                        Peak: {Math.round(peakData.value)}%
                      </text>
                      <text
                        x={annotX}
                        y={peakPoint.y - 42}
                        textAnchor="middle"
                        fontSize={12}
                        fill="#666"
                      >
                        ({peakData.month})
                      </text>
                      {/* Arrow line */}
                      <line
                        x1={peakPoint.x}
                        y1={peakPoint.y - 36}
                        x2={peakPoint.x}
                        y2={peakPoint.y - 10}
                        stroke="#333"
                        strokeWidth={2}
                      />
                      {/* Arrow head */}
                      <polygon
                        points={`${peakPoint.x},${peakPoint.y - 8} ${peakPoint.x - 6},${peakPoint.y - 16} ${peakPoint.x + 6},${peakPoint.y - 16}`}
                        fill="#333"
                      />
                    </>
                  )
                })()}
              </g>
            )}
            
            {/* Month labels - show every other month for readability */}
            {graphData.map((data, index) => {
              const x = padding.left + (index / graphData.length) * graphWidth + (graphWidth / graphData.length) / 2
              // Show every other month: Jan, Mar, May, Jul, Sep, Nov
              const showLabel = index % 2 === 0
              return showLabel ? (
                <text
                  key={index}
                  x={x}
                  y={height - padding.bottom + 25}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight="500"
                  fill="#555"
                >
                  {data.month}
                </text>
              ) : null
            })}
            
            {/* Year label under month labels */}
            <text
              x={width / 2}
              y={height - 15}
              textAnchor="middle"
              fontSize={16}
              fontWeight="600"
              fill="#555"
            >
              {currentYear}
            </text>
            
            {/* Y-axis label - removed for cleaner mobile look, values have % already */}
            
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
