
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PaymentGatewayPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [returnTo, setReturnTo] = useState<string | null>('/dashboard');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const url = searchParams.get('url');
        const returnPath = searchParams.get('returnTo');
        
        if (url) {
            setPaymentUrl(url);
        }
        if (returnPath) {
            setReturnTo(returnPath);
        }
    }, [searchParams]);

    const handleReturn = () => {
        if (returnTo) {
            router.push(returnTo);
        } else {
            router.push('/dashboard');
        }
    };

    const handleCancel = () => {
        if (returnTo) {
            router.push(returnTo);
        } else {
            router.back();
        }
    };
    
    if (!isClient) {
        return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
    }

    if (!paymentUrl) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="m-4">
                    <CardHeader>
                        <CardTitle>Errore</CardTitle>
                        <CardDescription>Link di pagamento non valido o mancante.</CardDescription>
                    </CardHeader>
                     <CardFooter>
                        <Button onClick={() => router.push('/dashboard')}>Torna alla Dashboard</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center justify-between p-4 border-b flex-wrap gap-4">
                 <h1 className="text-lg font-semibold">Completa il Pagamento</h1>
                 <div className="flex items-center gap-4">
                    <Button onClick={handleCancel} variant="outline">
                        <XCircle className="mr-2 h-4 w-4" />
                        Non puoi pagare ora? Torna indietro
                    </Button>
                    <Button onClick={handleReturn} variant="default">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna indietro quando hai finito
                    </Button>
                 </div>
            </header>
            <main className="flex-1">
                <iframe
                    src={paymentUrl}
                    className="w-full h-full border-0"
                    title="Gateway di Pagamento"
                    allow="payment"
                >
                    <p>Il tuo browser non supporta gli iframe. Clicca per pagare.</p>
                </iframe>
            </main>
        </div>
    );
}

    
