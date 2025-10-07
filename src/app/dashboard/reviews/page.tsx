
"use client"

import { useState, useEffect, Suspense } from "react";
import { collectionGroup, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ReviewCard, type Review } from "@/components/dashboard/ReviewCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Componente separato per gestire la navigazione
function NavigationHandler({ onBack }: { onBack: () => void }) {
    const handleBack = () => {
        window.history.back();
    };
    
    return (
        <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2" />
            Torna Indietro
        </Button>
    );
}

function ReviewsContent() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const reviewsQuery = query(
                    collectionGroup(db, "entries"),
                    orderBy("submittedAt", "desc")
                );

                const querySnapshot = await getDocs(reviewsQuery);
                
                const reviewsList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        rating: data.rating,
                        comment: data.comment,
                        discipline: data.discipline,
                        submittedAt: data.submittedAt
                    } as Review;
                });

                setReviews(reviewsList);

            } catch (error) {
                console.error("Error fetching reviews:", error);
                toast({
                    title: "Errore",
                    description: "Impossibile caricare le recensioni. Riprova più tardi.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [toast]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold">Recensioni delle Lezioni di Prova</h1>
                    <p className="">
                        Leggi le esperienze anonime dei nostri soci e degli atleti che hanno provato i nostri corsi.
                    </p>
                </div>
                <Suspense fallback={<Button variant="outline" disabled><ArrowLeft className="mr-2" />Torna Indietro</Button>}>
                    <NavigationHandler onBack={() => {}} />
                </Suspense>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                reviews.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {reviews.map(review => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border rounded-lg">
                        <h2 className="text-xl font-semibold">Nessuna Recensione</h2>
                        <p className="text-muted-foreground mt-2">
                           Non ci sono ancora recensioni da mostrare. Sii il primo a lasciare la tua!
                        </p>
                    </div>
                )
            )}
        </div>
    );
}

export default function ReviewsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ReviewsContent />
        </Suspense>
    )
}

