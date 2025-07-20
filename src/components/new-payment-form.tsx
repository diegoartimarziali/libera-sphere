
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertTitle, AlertDescription } from "./ui/alert"
import { AlertTriangle } from "lucide-react"

const paymentOptions = [
    { id: "online", label: "Pagamento con carta di credito on line. Rapido e sicuro." },
    { id: "transfer", label: "Bonifico Bancario." },
    { id: "cash", label: "Contanti o bancomat e carta in palestra (€ 2 spese di gestione)" },
]

export function NewPaymentForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handlePayment = async () => {
        if (!paymentMethod) return;

        setIsSubmitting(true);
        const userEmail = localStorage.getItem('registrationEmail');
        
        if (!userEmail) {
            toast({
                title: "Errore",
                description: "Utente non riconosciuto. Effettua nuovamente il login.",
                variant: "destructive",
            });
            setIsSubmitting(false);
            return;
        }

        try {
             // Simulate creating a subscription record
            await addDoc(collection(db, "subscriptions"), {
                userEmail: userEmail,
                planId: "associazione",
                planName: "Quota Associativa",
                price: "30", // Example price for association
                paymentMethod: paymentMethod,
                status: 'In attesa',
                subscriptionDate: serverTimestamp()
            });

            toast({
                title: "Domanda Inviata!",
                description: "La tua domanda di associazione è stata registrata. Vedrai lo stato del pagamento nella sezione 'Pagamenti'.",
            });
            
            if (typeof window !== 'undefined') {
                 // We need a full refresh for the layout to correctly update
                setTimeout(() => window.location.href = '/dashboard', 500);
            }

        } catch (error) {
            console.error("Error adding document: ", error);
            toast({
                title: "Errore nel salvataggio",
                description: "Non è stato possibile registrare il tuo pagamento. Riprova più tardi.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Effettua un Pagamento</CardTitle>
                <CardDescription>
                    Completa la tua domanda scegliendo un metodo di pagamento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="pt-4">
                    <Separator className="mb-4" />
                    <h4 className="font-semibold mb-2">Metodo di Pagamento</h4>
                    <RadioGroup onValueChange={setPaymentMethod} value={paymentMethod}>
                        {paymentOptions.map(option => (
                            <Label htmlFor={option.id} key={option.id} className="flex items-center space-x-2 cursor-pointer">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <span className="font-normal">{option.label}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                </div>
            </CardContent>
             <CardFooter>
                 <Button 
                    className="w-full" 
                    disabled={!paymentMethod || isSubmitting}
                    onClick={handlePayment}
                >
                    {isSubmitting ? 'Salvataggio...' : 'CONFERMA E PAGA'}
                </Button>
            </CardFooter>
        </Card>
    );
}
