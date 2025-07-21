
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PaymentGatewayPage() {
    const router = useRouter();
    const paymentUrl = "https://pay.sumup.com/b2c/Q25VI0NJ";

    const handleReturn = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('onlinePaymentCompleted', 'true');
            localStorage.setItem('onlinePaymentDate', new Date().toLocaleDateString('it-IT'));
        }
        router.push('/dashboard/class-selection');
    };

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Effettua il Pagamento</CardTitle>
                    <CardDescription className="text-foreground font-bold">
                        Completa la transazione tramite il portale sicuro di SumUp. Paga come ospite inserendo nome e cognome allievo. Una volta terminato, clicca sul pulsante in basso "Torna a Passaporto Selezioni".
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video w-full">
                        <iframe
                            src={paymentUrl}
                            className="w-full h-full border-0 rounded-md"
                            title="Portale di Pagamento SumUp"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleReturn} className="bg-green-600 hover:bg-green-700">
                    Torna a Passaporto Selezioni
                </Button>
            </div>
        </div>
    );
}
