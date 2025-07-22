import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function AiutoPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Aiuto</CardTitle>
                <CardDescription className="text-foreground font-bold">Se riscontri problemi o hai bisogno di un aiuto per utilizzare l'app:</CardDescription>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Chiama il numero: <b className="text-foreground">378-0825492</b> (dalle ore 9,00 alle ore 19,00)</li>
                    <li>Manda un messaggio su Whatsapp: <b className="text-foreground">378-0621692</b></li>
                </ol>
            </CardContent>
        </Card>
    )
}
