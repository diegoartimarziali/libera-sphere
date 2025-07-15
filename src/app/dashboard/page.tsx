import { MemberSummaryCard } from "@/components/member-summary-card"
import { MedicalCertificate } from "@/components/medical-certificate"
import { SubscriptionManagement } from "@/components/subscription-management"
import { EventBooking } from "@/components/event-booking"
import { ClassSelection } from "@/components/class-selection"

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
      <div className="lg:col-span-3">
        <MemberSummaryCard />
      </div>
      <div className="lg:col-span-1">
        <ClassSelection />
      </div>
      <div className="lg:col-span-1">
        <MedicalCertificate />
      </div>
      <div className="lg:col-span-1">
        <SubscriptionManagement />
      </div>
      <div className="lg:col-span-3">
        <EventBooking />
      </div>
    </div>
  )
}
