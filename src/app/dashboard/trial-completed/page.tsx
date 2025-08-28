
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, collection, serverTimestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Send, ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


import { FeedbackCard } from "@/components/dashboard/FeedbackCard";


export default function TrialCompletedPage() {
    const router = useRouter();
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    const [choice, setChoice] = useState<'yes' | 'no' | null>(null);

    const handleNoChoice = () => {
        setChoice('no');
    }
    
    const handleGoBack = () => {
        setChoice(null);
    }
    
    const handleFeedbackSubmit = async (rating: number, comment: string, afterFeedback?: () => void) => {
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
            return;
        }

        try {
            const batch = writeBatch(db);
            const userDocRef = doc(db, "users", user.uid);
            
            // Se c'è un feedback, lo salva nella collezione apposita
            if(rating > 0 || comment.trim() !== '') {
                 const userDocSnap = await getDoc(userDocRef);
                 const userData = userDocSnap.data();

                 const feedbackCollectionRef = collection(db, "feedbacks", "selection", "entries");
                 const newFeedbackRef = doc(feedbackCollectionRef);
                 batch.set(newFeedbackRef, {
                    userId: user.uid,
                    discipline: userData?.discipline || 'Non specificata',
                    rating: rating,
                    comment: comment,
                    submittedAt: serverTimestamp(),
                 });
            }

            await batch.commit();

            toast({
                title: "Grazie per il tuo feedback!",
                description: "La tua opinione è preziosa per noi."
            });
            
            if (afterFeedback) {
                afterFeedback();
            } else {
                await signOut(auth);
                router.push("/");
            }

        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast({ title: "Errore", description: "Impossibile inviare il feedback. Riprova.", variant: "destructive" });
        }
    }
    
    const handleYesChoice = () => {
        setChoice('yes');
    };

    const handleAcceptAndContinue = async () => {
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
            return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                trialOutcome: 'accepted',
            });
            router.push('/dashboard/associates');
        } catch (error) {
            console.error("Error setting trial outcome:", error);
            toast({ title: "Errore", description: "Impossibile salvare la tua scelta. Riprova.", variant: "destructive" });
        }
    };


    return (
        <div className="flex w-full flex-col items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Lascia la Tua Opinione</CardTitle>
                    <CardDescription className="text-lg pt-2">
                        Dicci cosa pensi della nostra associazione
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">

                    {choice === null && (
                        <div className="w-full space-y-4 text-center">
                             <p className="text-foreground">Speriamo l'esperienza sia stata di tuo gradimento. Vuoi continuare il tuo percorso con noi e diventare un socio a tutti gli effetti?</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                               <Button size="lg" variant="outline" onClick={handleNoChoice}>
                                    No, per ora non proseguo
                                </Button>
                               <Button size="lg" onClick={handleYesChoice}>
                                    Sì, voglio associarmi!
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {choice === 'no' && (
                        <FeedbackCard 
                            onFeedbackSubmit={(rating, comment) => handleFeedbackSubmit(rating, comment)}
                            onBack={handleGoBack}
                            title="La tua opinione conta"
                            description="Il tuo feedback ci aiuta a migliorare"
                            submitButtonText="Invia Feedback ed Esci"
                            backButtonText="Torna Indietro"
                        />
                    )}

                    {choice === 'yes' && (
                        <FeedbackCard 
                            onFeedbackSubmit={(rating, comment) => handleFeedbackSubmit(rating, comment, handleAcceptAndContinue)}
                            onBack={handleGoBack}
                            title="La tua opinione conta"
                            description="Il tuo feedback ci aiuta a migliorare"
                            submitButtonText="Invia Feedback e Continua"
                            backButtonText="Torna Indietro"
                        />
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

