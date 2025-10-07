
"use client"

import { useState, Suspense } from "react";

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
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <TrialCompletedContent />
        </Suspense>
    )
}

function TrialCompletedContent() {

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
        console.log('2. Invio feedback:', { rating, comment, hasAfterFeedback: !!afterFeedback });
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
                console.log('3. Feedback salvato, chiamo handleAcceptAndContinue');
                afterFeedback();
            } else {
                await signOut(auth);
                window.location.href = "/";
            }

        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast({ title: "Errore", description: "Impossibile inviare il feedback. Riprova.", variant: "destructive" });
        }
    }
    
    const handleYesChoice = () => {
        console.log('1. Cliccato "Sì, voglio associarmi!"');
        setChoice('yes');
    };

    const handleAcceptAndContinue = async () => {
        console.log('4. Inizio handleAcceptAndContinue');
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
            return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            
            // Update trial status in both the user document and the trial lessons document
            const batch = writeBatch(db);
            
            // Update user document
            batch.update(userDocRef, {
                trialOutcome: 'accepted',
                trialStatus: 'not_applicable',  // Mark trial as complete
                associationStatus: 'pending'    // Set association status to pending
            });
            
            // Update trial lessons document
            const trialMainDocRef = doc(db, `users/${user.uid}/trialLessons/main`);
            batch.update(trialMainDocRef, {
                trialStatus: 'not_applicable'
            });
            
            await batch.commit();
            
            console.log('5. Trial status and association status updated, redirecting to /dashboard/associates');
            window.location.href = '/dashboard/associates';
        } catch (error) {
            console.error("Error setting trial outcome:", error);
            toast({ title: "Errore", description: "Impossibile salvare la tua scelta. Riprova.", variant: "destructive" });
        }
    };


    return (
        <div className="flex w-full flex-col items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Vuoi diventare un Guerriero?</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">

                    {choice === null && (
                    <div className="w-full space-y-4 text-center">
                        <p className="text-foreground" style={{ color: 'hsl(var(--background))' }}>Speriamo l'esperienza sia stata di tuo gradimento. Vuoi continuare il tuo percorso con noi e diventare un socio a tutti gli effetti?</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                               <Button size="lg" variant="outline" onClick={handleNoChoice} style={{ background: '#6b7280', color: '#fff' }}>
                                    No, per ora non proseguo
                                </Button>
                               <Button size="lg" onClick={handleYesChoice} style={{ background: '#22c55e', color: '#fff', fontWeight: 'bold' }}>
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

