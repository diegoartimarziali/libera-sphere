
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
                const awardsSnap = await getDocs(query(collection(db, "userAwards"), where("userId", "==", user.uid)));
                const awardsData = [];
                for (const docSnap of awardsSnap.docs) {
                    const awardRef = doc(db, "awards", docSnap.data().awardId);
                    const awardDoc = await getDoc(awardRef);
                    if (awardDoc.exists()) {
                        awardsData.push({
                            ...awardDoc.data(),
                            assignedAt: docSnap.data().assignedAt,
                            id: awardDoc.id
                        });
                    }
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
                            <div key={award.id} className="border rounded-lg p-4 flex items-center gap-4">
                                <Gift className="h-8 w-8 text-yellow-500" />
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{award.name}</div>
                                    <div className="text-sm text-muted-foreground">Valore: {award.value?.toFixed(2)} €</div>
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
