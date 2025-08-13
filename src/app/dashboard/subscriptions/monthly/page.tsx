
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { CalendarClock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function MonthlySubscriptionPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Abbonamento Mensile</CardTitle>
                <CardDescription>
                    Questa sezione è in fase di sviluppo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <CalendarClock className="h-16 w-16 mb-4" />
                    <h2 className="text-xl font-semibold">Prossimamente</h2>
                    <p className="mt-2">Qui potrai acquistare e gestire i tuoi abbonamenti mensili.</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline">
                    <Link href="/dashboard/subscriptions">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna Indietro
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
