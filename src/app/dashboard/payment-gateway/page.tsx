
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentGatewayPage() {
    const paymentUrl = "https://pay.sumup.com/b2c/Q25VI0NJ";

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Effettua il Pagamento</CardTitle>
                    <CardDescription>
                        Completa la transazione tramite il portale sicuro di SumUp. Una volta terminato, puoi tornare alla tua scheda personale.
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
                <Button asChild>
                    <Link href="/dashboard">Torna alla Scheda Personale</Link>
                </Button>
            </div>
        </div>
    );
}
