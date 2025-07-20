

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';

const translatePaymentMethod = (method: string | null) => {
    if (!method) return 'Non specificato';
    switch (method) {
        case 'online': return 'Carta di Credito on line (0 costi)';
        case 'cash': return 'Contanti o Bancomat in palestra';
        default: return method;
    }
}

export default function SelectionSummaryPage() {
    const [summaryData, setSummaryData] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            const data = {
                martialArt: localStorage.getItem('martialArt'),
                selectedDojo: localStorage.getItem('selectedDojo'),
                lessonDate: localStorage.getItem('lessonDate'),
                userName: localStorage.getItem('userName'),
                codiceFiscale: localStorage.getItem('codiceFiscale'),
                birthDate: localStorage.getItem('birthDate'),
                birthplace: localStorage.getItem('birthplace'),
                address: localStorage.getItem('address'),
                civicNumber: localStorage.getItem('civicNumber'),
                cap: localStorage.getItem('cap'),
                comune: localStorage.getItem('comune'),
                provincia: localStorage.getItem('provincia'),
                isMinor: localStorage.getItem('isMinor') === 'true',
                phone: localStorage.getItem('phone'),
                parentName: localStorage.getItem('parentName'),
                parentCf: localStorage.getItem('parentCf'),
                parentPhone: localStorage.getItem('parentPhone'),
                paymentMethod: localStorage.getItem('paymentMethod'),
                paymentAmount: localStorage.getItem('paymentAmount'),
            };
            setSummaryData(data);
        }
    }, []);

    if (!isClient || !summaryData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Caricamento riepilogo...</p>
            </div>
        );
    }
    
    const capitalize = (s: string | null) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-8">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Riepilogo Iscrizione Lezioni di Selezione</CardTitle>
                    <CardDescription>
                        Conserva una copia di questo documento. Verrai contattato/a a breve per la conferma della lezione.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Pagamento</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                           <p><b>Metodo Pagamento:</b> <span className="text-foreground">{translatePaymentMethod(summaryData.paymentMethod)}</span></p>
                           <p><b>Importo:</b> <span className="text-foreground">€ {summaryData.paymentAmount}</span></p>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Lezione</h3>
                        <div className="space-y-2 text-muted-foreground">
                            <p><b>Corso di:</b> <span className="text-foreground">{capitalize(summaryData.martialArt)}</span></p>
                            <p><b>Palestra di:</b> <span className="text-foreground">{capitalize(summaryData.selectedDojo)}</span></p>
                            <p><b>1a Lezione:</b> <span className="text-foreground">{summaryData.lessonDate}</span></p>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dati Allievo</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                            <p><b>Nome e Cognome:</b> <span className="text-foreground">{summaryData.userName}</span></p>
                            <p><b>Codice Fiscale:</b> <span className="text-foreground">{summaryData.codiceFiscale}</span></p>
                            <p><b>Nato il:</b> <span className="text-foreground">{summaryData.birthDate}</span> a <span className="text-foreground">{summaryData.birthplace}</span></p>
                            <p><b>Residenza:</b> <span className="text-foreground">{`${summaryData.address}, ${summaryData.civicNumber} - ${summaryData.cap} ${summaryData.comune} (${summaryData.provincia})`}</span></p>
                             {!summaryData.isMinor && <p><b>Telefono:</b> <span className="text-foreground">{summaryData.phone}</span></p>}
                        </div>
                    </div>

                    {summaryData.isMinor && (
                         <>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-lg mb-2 text-primary">Dati Genitore/Tutore</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                                    <p><b>Nome e Cognome:</b> <span className="text-foreground">{summaryData.parentName}</span></p>
                                    <p><b>Codice Fiscale:</b> <span className="text-foreground">{summaryData.parentCf}</span></p>
                                    <p><b>Telefono:</b> <span className="text-foreground">{summaryData.parentPhone}</span></p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
