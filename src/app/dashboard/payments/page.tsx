
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

// Definisco il tipo di dati per un pagamento
interface Payment {
    id: string;
    createdAt: Timestamp;
    description: string;
    amount: number;
    paymentMethod: 'online' | 'in_person' | 'bank_transfer';
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
        default:
            return method;
    }
}

export default function UserPaymentsPage() {
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
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrizione</TableHead>
                                <TableHead>Metodo</TableHead>
                                <TableHead className="text-right">Importo</TableHead>
                                <TableHead className="text-center">Stato</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length > 0 ? payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">
                                        {payment.createdAt ? format(payment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/D'}
                                    </TableCell>
                                    <TableCell>{payment.description}</TableCell>
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
                )}
            </CardContent>
        </Card>
    );
}
