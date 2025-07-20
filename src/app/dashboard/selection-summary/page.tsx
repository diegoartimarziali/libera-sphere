
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';

const translatePaymentMethod = (method: string | null) => {
    if (!method) return 'Non specificato';
    switch (method) {
        case 'online': return 'Carta di Credito on Line';
        case 'transfer': return 'Bonifico Bancario';
        case 'cash': return 'Contanti o bancomat e carta in palestra';
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
                registrationEmail: localStorage.getItem('registrationEmail'),
                parentName: localStorage.getItem('parentName'),
                parentCf: localStorage.getItem('parentCf'),
                parentPhone: localStorage.getItem('parentPhone'),
                parentEmail: localStorage.getItem('parentEmail'),
                paymentMethod: localStorage.getItem('paymentMethod'),
                paymentAmount: localStorage.getItem('paymentAmount'),
            };
            setSummaryData(data);
        }
    }, []);

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    if (!isClient || !summaryData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Caricamento riepilogo...</p>
            </div>
        );
    }
    
    const capitalize = (s: string | null) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-8 print:p-0">
             <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-container {
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>
            <Card className="max-w-3xl mx-auto print-container">
                <CardHeader>
                    <CardTitle>Riepilogo Iscrizione Lezioni di Selezione</CardTitle>
                    <CardDescription>
                        Conserva una copia di questo documento. Verrai contattato/a a breve per la conferma della lezione.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Lezione</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                            <p><b>Arte Marziale:</b> <span className="text-foreground">{capitalize(summaryData.martialArt)}</span></p>
                            <p><b>Dojo:</b> <span className="text-foreground">{capitalize(summaryData.selectedDojo)}</span></p>
                            <p><b>Data Prima Lezione:</b> <span className="text-foreground">{summaryData.lessonDate}</span></p>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dati Allievo</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                            <p><b>Nome e Cognome:</b> <span className="text-foreground">{summaryData.userName}</span></p>
                            <p><b>Codice Fiscale:</b> <span className="text-foreground">{summaryData.codiceFiscale}</span></p>
                            <p><b>Nato/a il:</b> <span className="text-foreground">{summaryData.birthDate}</span> a <span className="text-foreground">{summaryData.birthplace}</span></p>
                            <p><b>Residenza:</b> <span className="text-foreground">{`${summaryData.address}, ${summaryData.civicNumber} - ${summaryData.cap} ${summaryData.comune} (${summaryData.provincia})`}</span></p>
                             {!summaryData.isMinor && <p><b>Telefono:</b> <span className="text-foreground">{summaryData.phone}</span></p>}
                            <p><b>Email:</b> <span className="text-foreground">{summaryData.registrationEmail}</span></p>
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
                                    <p><b>Email:</b> <span className="text-foreground">{summaryData.parentEmail}</span></p>
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Pagamento</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                           <p><b>Metodo Pagamento:</b> <span className="text-foreground">{translatePaymentMethod(summaryData.paymentMethod)}</span></p>
                           <p><b>Importo:</b> <span className="text-foreground">€ {summaryData.paymentAmount}</span></p>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end no-print">
                        <Button onClick={handlePrint}>
                            <Download className="mr-2 h-4 w-4" />
                            Stampa / Salva PDF
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
