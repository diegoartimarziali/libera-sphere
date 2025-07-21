
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentGatewayPage() {
    const paymentUrl = "https://pay.sumup.com/b2c/Q25VI0NJ";

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Effettua il Pagamento</CardTitle>
                <CardDescription>
                    Completa la tua iscrizione procedendo con il pagamento tramite il portale sicuro di SumUp.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-0 md:p-2">
                <iframe
                    src={paymentUrl}
                    className="w-full h-full min-h-[600px] border-0 rounded-b-lg md:rounded-lg"
                    title="Portale di Pagamento SumUp"
                    allow="payment"
                >
                    Caricamento del portale di pagamento...
                </iframe>
            </CardContent>
        </Card>
    );
}
