import { Calendar } from '@/components/Calendar/Calendar'

export function CustomerCalendar() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white">
      <div className="space-y-6 sm:space-y-8 lg:space-y-12">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20">
          <div className="bg-gradient-to-r from-[#4A5D23]/10 via-[#D4AF37]/10 to-[#8B7355]/10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 border-b-2 border-[#D4AF37]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-64 lg:h-64 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-[#2C3E1F] mb-2 tracking-wide gold-text-gradient">
                Calendar
              </h1>
              <p className="text-sm sm:text-base text-[#6B7C4A] font-light">
                View availability and bookings for your properties
              </p>
            </div>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <Calendar />
          </div>
        </div>
      </div>

      {/* Custom CSS for gold text gradient */}
      <style>{`
        .gold-text-gradient {
          background: linear-gradient(135deg, #2C3E1F 0%, #4A5D23 40%, #D4AF37 60%, #F4D03F 80%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  )
}
