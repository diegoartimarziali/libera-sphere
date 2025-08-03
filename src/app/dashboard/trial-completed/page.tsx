
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


function FeedbackForm({ onFeedbackSubmit }: { onFeedbackSubmit: (rating: number, comment: string) => void }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = () => {
        setIsSubmitting(true);
        onFeedbackSubmit(rating, comment);
        // isSubmitting will stay true as the page navigates away
    }

    return (
        <div className="w-full space-y-6 pt-6 border-t animate-in fade-in-50">
             <CardHeader className="p-0">
                <CardTitle className="text-xl">La tua opinione conta</CardTitle>
                <CardDescription>
                   Siamo dispiaciuti che tu non voglia proseguire. Se ti va, lasciaci un feedback (opzionale) per aiutarci a migliorare.
                </CardDescription>
            </CardHeader>
            <div className="space-y-2">
                <Label>Come valuteresti la tua esperienza?</Label>
                <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                "h-8 w-8 cursor-pointer transition-colors",
                                star <= (hoverRating || rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-muted-foreground/50"
                            )}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        />
                    ))}
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="comment">Qualche commento o suggerimento?</Label>
                <Textarea 
                    id="comment"
                    placeholder="Scrivi qui il tuo feedback..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </div>
             <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                <span className="ml-2">Invia e torna alla Dashboard</span>
            </Button>
        </div>
    )
}


export default function TrialCompletedPage() {
    const router = useRouter();
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    const [choice, setChoice] = useState<'yes' | 'no' | null>(null);

    const handleNoChoice = () => {
        setChoice('no');
    }
    
    const handleFeedbackSubmit = async (rating: number, comment: string) => {
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
            return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            const dataToUpdate: any = {
                trialOutcome: 'declined',
                feedback: {
                    rating: rating,
                    comment: comment,
                    submittedAt: serverTimestamp(),
                }
            };
            await updateDoc(userDocRef, dataToUpdate);

            toast({
                title: "Grazie per il tuo feedback!",
                description: "La tua opinione è preziosa per noi."
            });

            router.push("/dashboard");

        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast({ title: "Errore", description: "Impossibile inviare il feedback. Riprova.", variant: "destructive" });
        }
    }

    return (
        <div className="flex w-full flex-col items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Periodo di Prova Terminato</CardTitle>
                    <CardDescription className="text-lg pt-2">
                        Grazie per aver provato le nostre lezioni!
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
                               <Button size="lg" onClick={() => router.push('/dashboard/associates')}>
                                    Sì, voglio associarmi!
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {choice === 'no' && (
                        <FeedbackForm onFeedbackSubmit={handleFeedbackSubmit} />
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
