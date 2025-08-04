
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

export default function AttendancesPage() {

    return (
        <div className="space-y-6">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Le Mie Presenze</h1>
                <p className="text-muted-foreground">
                    Qui troverai il riepilogo delle tue presenze a lezioni e stage.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Storico Presenze</CardTitle>
                    <CardDescription>
                        Riepilogo delle lezioni a cui hai partecipato.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg">
                        <ClipboardList className="h-12 w-12 mb-4" />
                        <p className="font-semibold">Funzionalità in arrivo</p>
                        <p className="text-sm">A breve qui potrai visualizzare il tuo storico presenze.</p>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}

    