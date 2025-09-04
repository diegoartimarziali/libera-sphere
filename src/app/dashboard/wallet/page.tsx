"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserAwards } from "@/context/UserAwardsContext"
import { UserAwardsList } from "@/components/dashboard/UserAwardsList"

export default function WalletPage() {
    const awards = useUserAwards();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Il Mio Portafoglio</CardTitle>
                <CardDescription>
                    Premi assegnati e bonus accumulati.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!awards ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <span className="text-xl font-semibold">Caricamento premi...</span>
                    </div>
                ) : (
                    <UserAwardsList awards={awards} />
                )}
            </CardContent>
        </Card>
    )
}
