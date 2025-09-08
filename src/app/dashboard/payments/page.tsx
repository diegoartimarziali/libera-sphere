
// Test: Verifica strumenti di editing - 7 settembre 2025
"use client"

import { useState, useEffect } from "react"
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

export default function UserPaymentsPage() {
    // Funzione per esportare la tabella come PDF
    const handleSavePdf = async () => {
        if (!user) return;
        
        const pdf = new jsPDF({ orientation: "landscape", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        let y = 20;

        // Recupera nome e cognome dell'utente
        const userDoc = await import('firebase/firestore').then(({ doc, getDoc }) => 
            getDoc(doc(db, 'users', user.uid))
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
    const [user] = useAuthState(auth);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Calcola il totale dei pagamenti completati
    const totalPayments = payments
        .filter(payment => payment.status === 'completed')
        .reduce((total, payment) => total + payment.amount, 0);

    useEffect(() => {
        const fetchPayments = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const paymentsRef = collection(db, 'users', user.uid, 'payments');
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
    }, [user, toast]);

    return (
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>I Miei Pagamenti</CardTitle>
                        <CardDescription>
                            Qui trovi lo storico di tutte le tue transazioni e il loro stato.
                        </CardDescription>
                        {!loading && payments.length > 0 && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-lg font-bold text-green-800">
                                    Totale pagamenti completati: {totalPayments.toFixed(2)} €
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSavePdf}
                        className="px-3 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition w-fit"
                    >
                        Salva PDF
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <Table className="min-w-[500px] md:min-w-0" id="payments-table">
                            <TableHeader>
                                <TableRow className="border-b-2 border-black">
                                    <TableHead className="min-w-[90px] font-bold border-r border-black">Data</TableHead>
                                    <TableHead className="min-w-[80px] font-bold border-r border-black">Descrizione</TableHead>
                                    <TableHead className="min-w-[80px] font-bold border-r border-black">Metodo</TableHead>
                                    <TableHead className="text-right min-w-[70px] font-bold border-r border-black">Importo</TableHead>
                                    <TableHead className="text-center min-w-[80px] font-bold">Stato</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.length > 0 ? payments.map((payment, index) => (
                                    <TableRow key={payment.id} className="bg-gray-100 border-b-2 border-black">
                                        <TableCell className="font-medium border-r border-black">
                                            {payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/D'}
                                        </TableCell>
                                        <TableCell className="border-r border-black">{payment.description || (payment.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '')}</TableCell>
                                        <TableCell className="border-r border-black">{translatePaymentMethod(payment.paymentMethod)}</TableCell>
                                        <TableCell className="text-right border-r border-black">{payment.amount.toFixed(2)} €</TableCell>
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
                )}
            </CardContent>
        </Card>
    );
}
