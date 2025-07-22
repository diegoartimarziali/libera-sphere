import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function AiutoPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Aiuto</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
                <div>
                <p className="text-base text-muted-foreground">
                    <b>Passaporto Selezioni, segui questi passaggi:</b>
                </p>
                <ol className="list-decimal list-inside text-base text-muted-foreground space-y-2 mt-2">
                    <li>Prendi visione e accetta i regolamenti nella scheda <b>"Accettazione Regolamenti e Privacy"</b>.</li>
                    <li>Iscriviti al Passaporto Selezioni tramite la scheda <b>"Passaporto Selezioni"</b>.</li>
                    <li>Carica il tuo certificato medico nella sezione <b>"Certificato Medico"</b>.</li>
                    <li>Inserisci i tuoi dati e quelli di un genitore se sei minorenne.</li>
                    <li>Verrai contattato telefonicamente per scegliere la tua prima lezione.</li>
                    <li>Effettua il pagamento del contributo di 30€ alla prima lezione.</li>
                </ol>
                </div>
                <div>
                <p className="text-base text-muted-foreground">
                    <b>Associazione dopo il Passaporto Selezioni o già associato nella stagione precedente:</b>
                </p>
                <ol className="list-decimal list-inside text-base text-muted-foreground space-y-2 mt-2">
                    <li>Controlla che il tuo certificato medico sia caricato e in corso di validità.</li>
                    <li>Clicca sul tasto <b>"Recupera Dati"</b>.</li>
                    <li>Clicca sul tasto <b>"Fai Domanda di Associazione"</b>.</li>
                    <li>Effettua il pagamento del contributo associativo con il metodo da te scelto.</li>
                </ol>
                <Separator className="my-4" />
                <p className="text-base text-muted-foreground">
                    <b>Nuova associazione o dati non presenti:</b>
                </p>
                <ol className="list-decimal list-inside text-base text-muted-foreground space-y-2 mt-2">
                    <li>Prendi visione e accetta i regolamenti nella scheda <b>"Accettazione Regolamenti e Privacy"</b>.</li>
                    <li>Carica il tuo certificato medico nella sezione <b>"Certificato Medico"</b>.</li>
                    <li>Inserisci i tuoi dati e quelli di un genitore se sei minorenne.</li>
                    <li>Clicca sul tasto <b>"Fai Domanda di Associazione"</b>.</li>
                    <li>Effettua il pagamento del contributo associativo con il metodo da te scelto.</li>
                </ol>
                </div>
            </div>
            </CardContent>
        </Card>
    )
}

    