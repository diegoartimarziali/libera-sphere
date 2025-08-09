
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalendarPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Calendari Attività</CardTitle>
                <CardDescription>
                    Qui troverai il calendario completo delle lezioni e degli eventi speciali come stage ed esami.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center items-center h-48">
                    <p className="text-muted-foreground">Prossimamente...</p>
                </div>
            </CardContent>
        </Card>
    );
}
