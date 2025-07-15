import { MemberSummaryCard } from "@/components/member-summary-card"
import { MedicalCertificate } from "@/components/medical-certificate"
import { SubscriptionManagement } from "@/components/subscription-management"
import { EventBooking } from "@/components/event-booking"
import { ClassSelection } from "@/components/class-selection"
import { AssociateCard } from "@/components/associate-card"
import { RegulationsAcceptance } from "@/components/regulations-acceptance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <>
      <div className="lg:col-span-3">
        <MemberSummaryCard />
      </div>

      <Card className="lg:col-span-3 my-4">
        <CardHeader>
            <CardTitle>Istruzioni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Per iniziare, segui questi passaggi:
          </p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mt-2">
            <li>Prendi visione e accetta i regolamenti nella scheda <b>"Accettazione Regolamenti e Privacy"</b>.</li>
            <li>Non sei mai stato associato e vuoi partecipare alle selezioni? Iscriviti alle lezioni di selezione tramite la scheda <b>"Lezioni di Selezione"</b>.</li>
            <li>Carica il tuo certificato medico nella sezione <b>"Certificato Medico"</b>.</li>
            <li>Se vuoi associare anche un familiare, puoi farlo dalla sezione <b>"Associati"</b>.</li>
          </ol>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
        <div className="lg:col-span-1">
          <RegulationsAcceptance />
        </div>
        <div className="lg:col-span-1">
          <ClassSelection />
        </div>
        <div className="lg:col-span-1">
          <AssociateCard />
        </div>
        <div className="lg:col-span-3">
          <MedicalCertificate />
        </div>
        <div className="lg:col-span-3">
          <EventBooking />
        </div>
        <div className="lg:col-span-3">
          <SubscriptionManagement />
        </div>
      </div>
    </>
  )
}
