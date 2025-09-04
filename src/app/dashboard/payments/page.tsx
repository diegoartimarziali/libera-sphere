
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
        const pdf = new jsPDF({ orientation: "landscape" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        let y = 20;

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

        // Scritta
        pdf.setFontSize(18);
        pdf.text("Libera Energia Arti Marziali", 45, 25);
        y = 45;

        // Titolo tabella
        pdf.setFontSize(14);
        pdf.text("Storico Pagamenti", 10, y);
        y += 10;

        // Intestazioni tabella
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.text("Data", 10, y);
        pdf.text("Descrizione", 45, y);
        pdf.text("Metodo", 110, y);
        pdf.text("Importo", 140, y, { align: "right" });
        pdf.text("Stato", 170, y);
        pdf.setFont(undefined, "normal");
        y += 7;

        // Dati pagamenti
        payments.forEach((payment) => {
            if (y > 190) {
                pdf.addPage();
                y = 20;
            }
            pdf.text(payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/D', 10, y);
            pdf.text(payment.description || (payment.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : ''), 45, y);
            pdf.text(translatePaymentMethod(payment.paymentMethod), 110, y);
            pdf.text(payment.amount.toFixed(2) + " €", 140, y, { align: "right" });
            pdf.text(translateStatus(payment.status), 170, y);
            y += 7;
        });

        pdf.save("pagamenti.pdf");
    };
    const [user] = useAuthState(auth);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

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
        <Card>
            <CardHeader>
                <CardTitle>I Miei Pagamenti</CardTitle>
                <CardDescription>
                    Qui trovi lo storico di tutte le tue transazioni e il loro stato.
                </CardDescription>
                <button
                    onClick={handleSavePdf}
                    className="mt-4 px-4 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition"
                >
                    Salva PDF
                </button>
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
                                <TableRow>
                                    <TableHead className="min-w-[90px]">Data</TableHead>
                                    <TableHead className="min-w-[120px]">Descrizione</TableHead>
                                    <TableHead className="min-w-[80px]">Metodo</TableHead>
                                    <TableHead className="text-right min-w-[70px]">Importo</TableHead>
                                    <TableHead className="text-center min-w-[80px]">Stato</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.length > 0 ? payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">
                                            {payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/D'}
                                        </TableCell>
                                        <TableCell>{payment.description || (payment.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '')}</TableCell>
                                        <TableCell>{translatePaymentMethod(payment.paymentMethod)}</TableCell>
                                        <TableCell className="text-right">{payment.amount.toFixed(2)} €</TableCell>
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
                                    <TableRow>
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
