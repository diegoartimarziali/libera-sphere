import { MemberSummaryCard } from "@/components/member-summary-card"
import { SubscriptionManagement } from "@/components/subscription-management"
import { EventBooking } from "@/components/event-booking"

export default function Dashboard() {
  return (
    <>
      <div className="lg:col-span-3">
        <MemberSummaryCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pt-4 pb-6">
        <div className="lg:col-span-1">
          <SubscriptionManagement />
        </div>
         <div className="lg:col-span-1">
          <EventBooking />
        </div>
      </div>
    </>
  )
}
