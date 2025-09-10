"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserAwards } from "@/context/UserAwardsContext"
import { UserAwardsList } from "@/components/dashboard/UserAwardsList"
import { useAttendances } from "@/hooks/use-attendances"
import { calculatePremiPresenzeValue } from "@/lib/premiPresenzeCalculator"

export default function WalletPage() {
    const awards = useUserAwards();
    const { percentage, loading: attendancesLoading } = useAttendances();

    // Calcola il totale del residuo includendo il valore dinamico del Premio Presenze
    const totalResiduo = awards ? awards.reduce((total, award) => {
        if (award.name === 'Premio Presenze' && !attendancesLoading) {
            // Per il Premio Presenze, usa il valore calcolato dinamicamente
            const dynamicValue = calculatePremiPresenzeValue(percentage).value;
            const usedValue = award.usedValue || 0;
            const residuo = Math.max(0, dynamicValue - usedValue);
            return total + residuo;
        } else {
            // Per gli altri premi, usa il valore residuo normale
            return total + (award.residuo || 0);
        }
    }, 0) : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>I miei Premi</CardTitle>
                <CardDescription className="font-bold">
                    Premi assegnati e bonus accumulati.
                </CardDescription>
                {awards && awards.length > 0 && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-lg font-bold text-green-800">
                            Valore totale disponibile: {totalResiduo.toFixed(2)} €
                        </div>
                    </div>
                )}
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
