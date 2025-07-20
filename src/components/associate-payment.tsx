
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
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { AlertTriangle } from "lucide-react"

const paymentOptions = [
    { id: "online", label: "Pagamento con carta di credito on line. Rapido e sicuro." },
    { id: "transfer", label: "Bonifico Bancario." },
    { id: "cash", label: "Contanti o bancomat e carta in palestra (€ 2 spese di gestione)" },
]

export function AssociatePayment() {
    const { toast } = useToast();
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasMedicalCertificate, setHasMedicalCertificate] = useState(false);

    useEffect(() => {
        // Check for medical certificate
        if (typeof window !== 'undefined') {
            const certDate = localStorage.getItem('medicalCertificateExpirationDate');
            const certFile = localStorage.getItem('medicalCertificateFileName');
            if (certDate && certFile) {
                setHasMedicalCertificate(true);
            }
        }
    }, []);
    
    const handlePayment = async () => {
        if (!paymentMethod || !hasMedicalCertificate) return;

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
                <CardTitle>Effettua Pagamento</CardTitle>
                <CardDescription>
                    Completa la tua domanda di associazione scegliendo un metodo di pagamento per la quota associativa di 30€.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!hasMedicalCertificate && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Attenzione</AlertTitle>
                        <AlertDescription>
                           Per poter partecipare ai corsi è necessario essere in possesso di certificato medico non agonistico in corso di validità. Carica il certificato per poter procedere.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="pt-4">
                    <Separator className="mb-4" />
                    <h4 className="font-semibold mb-2">Metodo di Pagamento</h4>
                    <RadioGroup onValueChange={setPaymentMethod} value={paymentMethod} disabled={!hasMedicalCertificate}>
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
                    disabled={!paymentMethod || isSubmitting || !hasMedicalCertificate}
                    onClick={handlePayment}
                >
                    {isSubmitting ? 'Salvataggio...' : 'CONFERMA E PAGA'}
                </Button>
            </CardFooter>
        </Card>
    );
}
