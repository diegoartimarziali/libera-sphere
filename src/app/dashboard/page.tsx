import { MemberSummaryCard } from "@/components/member-summary-card"
import { MedicalCertificate } from "@/components/medical-certificate"
import { SubscriptionManagement } from "@/components/subscription-management"
import { EventBooking } from "@/components/event-booking"
import { ClassSelection } from "@/components/class-selection"
import { AssociateCard } from "@/components/associate-card"
import { RegulationsAcceptance } from "@/components/regulations-acceptance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-muted-foreground">
                <b>Lezioni di selezione, segui questi passaggi:</b>
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mt-2">
                <li>Prendi visione e accetta i regolamenti nella scheda <b>"Accettazione Regolamenti e Privacy"</b>.</li>
                <li>Iscriviti alle lezioni di selezione tramite la scheda <b>"Lezioni di Selezione"</b>.</li>
                <li>Carica il tuo certificato medico nella sezione <b>"Certificato Medico"</b>.</li>
                <li>Inserisci i tuoi dati e quelli di un genitore se sei minorenne.</li>
                <li>Verrai contattato telefonicamente per scegliere la tua prima lezione.</li>
                <li>Effettua il pagamento del contributo di 30€ alla prima lezione.</li>
              </ol>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                <b>Associazione dopo lezioni di selezione o già associato nella stagione precedente:</b>
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mt-2">
                <li>Controlla che il tuo certificato medico sia caricato e in corso di validità.</li>
                <li>Clicca sul tasto <b>"Recupera Dati"</b>.</li>
                <li>Clicca sul tasto "Invia Domanda di Associazione".</li>
                <li>Effettua il pagamento del contributo associativo con il metodo da te scelto.</li>
              </ol>
              <Separator className="my-4" />
               <p className="text-sm text-muted-foreground">
                <b>Nuova associazione o dati non presenti:</b>
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 mt-2">
                <li>Prendi visione e accetta i regolamenti nella scheda <b>"Accettazione Regolamenti e Privacy"</b>.</li>
                <li>Carica il tuo certificato medico nella sezione <b>"Certificato Medico"</b>.</li>
                <li>Inserisci i tuoi dati e quelli di un genitore se sei minorenne.</li>
                <li>Clicca sul tasto "Invia Domanda di Associazione".</li>
                <li>Effettua il pagamento del contributo associativo con il metodo da te scelto.</li>
              </ol>
            </div>
          </div>
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
        <div className="lg:col-span-1">
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
