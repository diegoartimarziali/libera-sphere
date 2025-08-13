
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock } from "lucide-react"

export default function SeasonalSubscriptionPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Abbonamento Stagionale</CardTitle>
                <CardDescription>
                    Questa sezione è in fase di sviluppo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <CalendarClock className="h-16 w-16 mb-4" />
                    <h2 className="text-xl font-semibold">Prossimamente</h2>
                    <p className="mt-2">Qui potrai acquistare il tuo abbonamento per l'intera stagione.</p>
                </div>
            </CardContent>
        </Card>
    )
}
