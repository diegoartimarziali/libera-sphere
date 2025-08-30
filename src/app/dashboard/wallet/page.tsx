
"use client"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet as WalletIcon, Gift } from "lucide-react"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"

import { auth } from "@/lib/firebase"

export default function WalletPage() {

    const [loading, setLoading] = useState(true);
    const [userAwards, setUserAwards] = useState<any[]>([]);
    const [user] = useAuthState(auth);

    useEffect(() => {
        const fetchUserAwards = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const awardsSnap = await getDocs(collection(db, "users", user.uid, "userAwards"));
                const awardsData = [];
                for (const docSnap of awardsSnap.docs) {
                    const data = docSnap.data();
                    awardsData.push({
                        awardId: data.awardId,
                        id: docSnap.id,
                        value: data.value || 0,
                        residuo: typeof data.residuo === 'number' ? data.residuo : (data.value || 0) - (data.usedValue || 0),
                        assignedAt: data.assignedAt,
                        usedValue: data.usedValue || 0,
                        name: data.name || ''
                    });
                }
                setUserAwards(awardsData);
            } catch (e) {
                setUserAwards([]);
            } finally {
                setLoading(false);
            }
        };
        fetchUserAwards();
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
                        <WalletIcon className="h-16 w-16 mb-4 animate-spin" />
                        <h2 className="text-xl font-semibold">Caricamento premi...</h2>
                    </div>
                ) : userAwards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Gift className="h-16 w-16 mb-4" />
                        <h2 className="text-xl font-semibold">Nessun premio assegnato</h2>
                        <p className="mt-2">Quando riceverai un premio, lo troverai qui!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {userAwards.map((award) => (
                            <div key={award.id} className="relative border rounded-lg p-4 flex items-center gap-4 overflow-hidden">
                                {award.residuo === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                        <div className="w-full h-full" style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            background: 'repeating-linear-gradient(-45deg, rgba(220,38,38,0.7) 0px, rgba(220,38,38,0.7) 20px, transparent 20px, transparent 40px)',
                                            zIndex: 10
                                        }} />
                                        <span className="text-white font-bold text-xl rotate-[-20deg] drop-shadow-lg" style={{zIndex: 11}}>Utilizzato</span>
                                    </div>
                                )}
                                <Gift className="h-8 w-8 text-yellow-500" />
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{award.name}</div>
                                    <div className="text-sm font-bold text-green-700">Valore residuo: {award.residuo?.toFixed(2)} €</div>
                                    <div className="text-sm text-muted-foreground">Valore iniziale: {award.value?.toFixed(2)} €</div>
                                    <div className="text-sm text-orange-700">Totale utilizzato: {award.usedValue?.toFixed(2)} €</div>
                                    <div className="text-xs text-muted-foreground">Assegnato il {award.assignedAt?.toDate ? award.assignedAt.toDate().toLocaleDateString() : new Date(award.assignedAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
