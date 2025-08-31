"use client"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { getUserAwards, UserAward } from "@/lib/userAwards"
import { UserAwardsList } from "@/components/dashboard/UserAwardsList"


export default function WalletPage() {
    const [user] = useAuthState(auth);
    const [awards, setAwards] = useState<UserAward[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAwards = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getUserAwards(user.uid);
            setAwards(data);
        } catch {
            setAwards([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAwards();
    }, [user]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Il Mio Portafoglio</CardTitle>
                <CardDescription>
                    Premi assegnati e bonus accumulati.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <span className="text-xl font-semibold">Caricamento premi...</span>
                    </div>
                                ) : (
                                        <>
                                            <UserAwardsList awards={awards} onRefresh={fetchAwards} />
                                            {/* Esempio: passaggio della funzione di refresh a StagePaymentCard */}
                                            {/* <StagePaymentCard userId={user.uid} awardId={awardId} onRefresh={fetchAwards} /> */}
                                        </>
                                )}
            </CardContent>
        </Card>
    )
}
