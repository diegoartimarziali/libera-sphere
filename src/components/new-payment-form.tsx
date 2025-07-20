
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertTitle, AlertDescription } from "./ui/alert"
import { AlertTriangle } from "lucide-react"

const paymentOptions = [
    { id: "online", label: "Carta di Credito on line (0 costi)" },
    { id: "cash", label: "Contanti o Bancomat in palestra" },
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
                <div className="pt-4 space-y-2">
                    <Separator className="mb-4" />
                    <Label htmlFor="payment-method" className="font-bold">Metodo di Pagamento</Label>
                    <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                        <SelectTrigger id="payment-method">
                            <SelectValue placeholder="Seleziona un metodo di pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                            {paymentOptions.map(option => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
