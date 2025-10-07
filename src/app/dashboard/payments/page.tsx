
// Test: Verifica strumenti di editing - 7 settembre 2025
"use client"

import { useState, useEffect, Suspense } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { format } from "date-fns"
import { it } from "date-fns/locale"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Definisco il tipo di dati per un pagamento
interface Payment {
    id: string;
    createdAt: Timestamp;
    description: string;
    amount: number;
    paymentMethod: 'online' | 'in_person' | 'bank_transfer' | 'bonus';
    status: 'pending' | 'completed' | 'failed';
}

// Funzione helper per ottenere la classe del badge in base allo stato
const getStatusVariant = (status: Payment['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'completed':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'failed':
            return 'destructive';
        default:
            return 'secondary';
    }
}

// Funzione helper per tradurre lo stato
const translateStatus = (status: Payment['status']): string => {
    switch (status) {
        case 'completed':
            return 'Completato';
        case 'pending':
            return 'In attesa';
        case 'failed':
            return 'Fallito';
        default:
            return status;
    }
}

// Funzione helper per tradurre il metodo di pagamento
const translatePaymentMethod = (method: Payment['paymentMethod']): string => {
    switch (method) {
        case 'online':
            return 'Online';
        case 'in_person':
            return 'In Sede';
        case 'bank_transfer':
            return 'Bonifico';
        case 'bonus':
            return 'Premio';
        default:
            return method;
    }
}

function PaymentsContent() {
    const [user] = useAuthState(auth);
    const [impersonateId, setImpersonateId] = useState<string | null>(null);
    const effectiveUserId = impersonateId || user?.uid;
    
    // Leggiamo l'impersonation dalla URL senza useSearchParams
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const impersonate = urlParams.get('impersonate');
            setImpersonateId(impersonate);
        }
    }, []);
    
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Funzione per esportare la tabella come PDF
    const handleSavePdf = async () => {
        if (!effectiveUserId) return;
        
        const pdf = new jsPDF({ orientation: "landscape", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        let y = 20;

        // Recupera nome e cognome dell'utente
        const userDoc = await import('firebase/firestore').then(({ doc, getDoc }) => 
            getDoc(doc(db, 'users', effectiveUserId))
        );
        const userData = userDoc.exists() ? userDoc.data() : {};
        const userName = `${userData.name || ''} ${userData.surname || ''}`.trim() || 'Utente';

        // Logo
        const logoUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Flogo.png?alt=media&token=2ae6fdd4-f165-4603-b170-d832d97bd004";
        // Carica l'immagine come base64
        const getImageBase64 = async (url: string) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        };
        const logoBase64 = await getImageBase64(logoUrl);
        pdf.addImage(logoBase64, "PNG", 10, 10, 30, 30);

        // Scritta aziendale
        pdf.setFontSize(18);
        pdf.setFont(undefined, "bold");
        pdf.text("Libera Energia Arti Marziali", 45, 25);
        
        // Titolo personalizzato con nome utente
        pdf.setFontSize(16);
        pdf.text(`Storico Pagamenti di: ${userName}`, 45, 35);
        y = 50;

        // Data di creazione e totale
        const currentDate = new Date().toLocaleDateString('it-IT');
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.text(`Totale pagamenti completati al ${currentDate}: ${totalPayments.toFixed(2)} €`, 10, y);
        pdf.setFont(undefined, "normal");
        y += 15;

        // Intestazioni tabella su 5 colonne ben distribuite
        const col1 = 10;   // Data (stretta)
        const col2 = 50;   // Descrizione (larga)
        const col3 = 170;  // Metodo (più vicino)
        const col4 = 210;  // Importo
        const col5 = 250;  // Stato
        
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.text("Data", col1, y);
        pdf.text("Descrizione", col2, y);
        pdf.text("Metodo", col3, y);
        pdf.text("Importo", col4, y);
        pdf.text("Stato", col5, y);
        pdf.setFont(undefined, "normal");
        y += 7;

        // Dati pagamenti su 5 colonne
        payments.forEach((payment) => {
            if (y > 190) {
                pdf.addPage();
                y = 20;
                // Ripeti le intestazioni su nuova pagina
                pdf.setFontSize(11);
                pdf.setFont(undefined, "bold");
                pdf.text("Data", col1, y);
                pdf.text("Descrizione", col2, y);
                pdf.text("Metodo", col3, y);
                pdf.text("Importo", col4, y);
                pdf.text("Stato", col5, y);
                pdf.setFont(undefined, "normal");
                y += 7;
            }
            
            // Dati distribuiti sulle 5 colonne
            pdf.text(payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yyyy') : 'N/D', col1, y);
            
            // Tronca descrizione se troppo lunga per evitare sovrapposizioni
            const description = payment.description || (payment.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '');
            const truncatedDesc = description.length > 50 ? description.substring(0, 50) + '...' : description;
            pdf.text(truncatedDesc, col2, y);
            
            pdf.text(translatePaymentMethod(payment.paymentMethod), col3, y);
            pdf.text(payment.amount.toFixed(2) + " €", col4, y);
            pdf.text(translateStatus(payment.status), col5, y);
            y += 8;
        });

        pdf.save("pagamenti.pdf");
    };

    // Calcola il totale dei pagamenti completati
    const totalPayments = payments
        .filter(payment => payment.status === 'completed')
        .reduce((total, payment) => total + payment.amount, 0);

    useEffect(() => {
        const fetchPayments = async () => {
            if (!effectiveUserId) {
                setLoading(false);
                return;
            }

            try {
                const paymentsRef = collection(db, 'users', effectiveUserId, 'payments');
                const q = query(paymentsRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);

                const paymentsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Payment));

                setPayments(paymentsList);

            } catch (error) {
                console.error("Error fetching payments:", error);
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: "Impossibile caricare lo storico dei pagamenti."
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [effectiveUserId, toast]);

    return (
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader className="space-y-4">
                <div>
                    <CardTitle className="text-xl md:text-2xl">I Miei Pagamenti</CardTitle>
                    <CardDescription className="text-sm md:text-base">
                        Qui trovi lo storico di tutte le tue transazioni e il loro stato.
                    </CardDescription>
                </div>
                
                {!loading && payments.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-base md:text-lg font-bold text-green-800">
                            Totale completati: {totalPayments.toFixed(2)} €
                        </div>
                    </div>
                )}
                
                <button
                    onClick={handleSavePdf}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-sm md:text-base font-bold rounded shadow hover:bg-green-700 transition"
                >
                    📄 Salva PDF
                </button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div>
                    {/* Layout Card per mobile */}
                    <div className="block md:hidden space-y-3">
                        {payments.length > 0 ? payments.map((payment) => (
                            <div key={payment.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-medium text-gray-900">
                                        {payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yy') : 'N/D'}
                                    </div>
                                    <Badge variant={getStatusVariant(payment.status)}
                                           className={cn({
                                                'bg-success text-success-foreground hover:bg-success/80': payment.status === 'completed',
                                            })}
                                    >
                                        {translateStatus(payment.status)}
                                    </Badge>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    {payment.description || (payment.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '')}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">{translatePaymentMethod(payment.paymentMethod)}</span>
                                    <span className="text-lg font-bold text-gray-900">{payment.amount.toFixed(2)} €</span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-500">
                                Nessun pagamento trovato.
                            </div>
                        )}
                    </div>
                    
                    {/* Layout Tabella per desktop */}
                    <div className="hidden md:block overflow-x-auto w-full">
                        <Table className="min-w-full" id="payments-table">
                            <TableHeader>
                                <TableRow className="border-b-2 border-black">
                                    <TableHead className="font-bold border-r border-black">Data</TableHead>
                                    <TableHead className="font-bold border-r border-black">Descrizione</TableHead>
                                    <TableHead className="font-bold border-r border-black">Metodo</TableHead>
                                    <TableHead className="text-right font-bold border-r border-black">Importo</TableHead>
                                    <TableHead className="text-center font-bold">Stato</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.length > 0 ? payments.map((payment) => (
                                    <TableRow key={payment.id} className="bg-gray-100 border-b-2 border-black">
                                        <TableCell className="font-medium border-r border-black">
                                            {payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/D'}
                                        </TableCell>
                                        <TableCell className="border-r border-black max-w-[200px] truncate">
                                            {payment.description || (payment.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '')}
                                        </TableCell>
                                        <TableCell className="border-r border-black">{translatePaymentMethod(payment.paymentMethod)}</TableCell>
                                        <TableCell className="text-right border-r border-black font-bold">{payment.amount.toFixed(2)} €</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusVariant(payment.status)}
                                               className={cn({
                                                    'bg-success text-success-foreground hover:bg-success/80': payment.status === 'completed',
                                                })}
                                            >
                                                {translateStatus(payment.status)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow className="bg-gray-100">
                                        <TableCell colSpan={5} className="text-center h-24">
                                            Nessun pagamento trovato.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function PaymentsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <PaymentsContent />
        </Suspense>
    )
}
