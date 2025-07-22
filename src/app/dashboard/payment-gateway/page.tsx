
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const SUMUP_PAYMENT_LINK = 'https://pay.sumup.com/b2c/Q25VI0NJ';

export default function PaymentGatewayPage({ setLessonSelected }: { setLessonSelected?: (value: boolean) => void }) {
    const router = useRouter();

    useEffect(() => {
        // Automatically open the payment link in a new tab when the page loads
        window.open(SUMUP_PAYMENT_LINK, '_blank');
    }, []);

    const handleConfirmPayment = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('isSelectionPassportComplete', 'true');
            if(setLessonSelected) setLessonSelected(true); // This might not work as expected due to redirect
        }
        // Redirect to the class selection page, which will now show step 2
        router.push('/dashboard/class-selection');
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Completa il Pagamento</CardTitle>
                    <CardDescription>
                        Segui le istruzioni per completare in sicurezza la tua iscrizione.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Pagamento in corso...</AlertTitle>
                        <AlertDescription>
                            Per la tua sicurezza, abbiamo aperto la pagina di pagamento SumUp in una nuova scheda.
                            <br/><br/>
                            Una volta completata la transazione, **torna su questa scheda** e clicca il pulsante qui sotto per finalizzare la tua iscrizione e tornare alla pagina precedente.
                        </AlertDescription>
                    </Alert>
                     <Button onClick={handleConfirmPayment} className="w-full text-lg py-6">
                        Ho completato il pagamento, procedi
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
