
"use client"

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { StageCard } from "@/components/dashboard/StageCard";

export interface Stage {
    id: string;
    name: string;
    description: string;
    date: Timestamp;
    location: string;
    price: number;
    imageUrl?: string;
    sumupLink: string;
    type: 'internal' | 'external';
    open_to: string;
}

export default function StagesPage() {
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchStages = async () => {
            try {
                const stagesCollection = collection(db, "stages");
                const q = query(stagesCollection, orderBy("date", "asc"));
                const stagesSnapshot = await getDocs(q);

                const stagesList = stagesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Stage));
                
                setStages(stagesList);
            } catch (error) {
                console.error("Error fetching stages:", error);
                toast({
                    title: "Errore",
                    description: "Impossibile caricare gli stage. Riprova più tardi.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStages();
    }, [toast]);

    return (
        <div className="space-y-6">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Eventi e Stage</h1>
                <p className="text-muted-foreground">
                    Scopri e iscriviti ai prossimi eventi speciali organizzati per te.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                stages.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {stages.map(stage => (
                            <StageCard key={stage.id} stage={stage} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <h2 className="text-xl font-semibold">Nessuno Stage Disponibile</h2>
                        <p className="text-muted-foreground mt-2">
                            Al momento non ci sono eventi in programma. Torna a trovarci presto!
                        </p>
                    </div>
                )
            )}
        </div>
    );
}
