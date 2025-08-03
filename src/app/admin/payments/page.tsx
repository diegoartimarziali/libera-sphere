
"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collectionGroup, getDocs, query, where, doc, writeBatch, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { it } from "date-fns/locale"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"

interface Payment {
    id: string; // Document ID of the payment
    userId: string;
    amount: number;
    createdAt: Timestamp;
    description: string;
    paymentMethod: 'online' | 'in_person' | 'bank_transfer';
    status: 'pending' | 'completed' | 'failed';
    type: 'association' | 'trial' | 'subscription';
    userInfo?: {
        name: string;
        email: string;
    }
}


export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchPendingPayments = async () => {
            setLoading(true);
            try {
                // 1. Query per tutti i pagamenti in sospeso
                const paymentsQuery = query(
                    collectionGroup(db, 'payments'), 
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(paymentsQuery);
                
                const pendingPayments: Payment[] = [];

                // 2. Recupera i dati utente per ogni pagamento
                for (const paymentDoc of querySnapshot.docs) {
                    const paymentData = paymentDoc.data() as Omit<Payment, 'id'>;
                    const payment: Payment = {
                        id: paymentDoc.id,
                        ...paymentData,
                    };

                    // Recupera i dati dell'utente associato
                    const userDocRef = doc(db, 'users', payment.userId);
                    const userDocSnap = await getDocs(query(collectionGroup(db, 'users'), where('uid', '==', payment.userId)));

                    if (!userDocSnap.empty) {
                        const userData = userDocSnap.docs[0].data();
                        payment.userInfo = {
                            name: `${userData.name} ${userData.surname}`,
                            email: userData.email,
                        }
                    }
                    pendingPayments.push(payment);
                }
                
                // Ordina per data di creazione
                pendingPayments.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

                setPayments(pendingPayments);

            } catch (error) {
                console.error("Error fetching pending payments: ", error);
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: "Impossibile caricare i pagamenti in sospeso."
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPendingPayments();
    }, [toast]);

    const handleApprovePayment = async (payment: Payment) => {
        setApprovingId(payment.id);
        
        try {
            const batch = writeBatch(db);
            const userDocRef = doc(db, 'users', payment.userId);

            // 1. Aggiorna lo stato del pagamento
            const paymentDocRef = doc(db, 'users', payment.userId, 'payments', payment.id);
            batch.update(paymentDocRef, { status: 'completed' });

            // 2. Logica specifica per tipo di pagamento
            if (payment.type === 'association') {
                batch.update(userDocRef, { associationStatus: 'active' });
            } else if (payment.type === 'trial') {
                batch.update(userDocRef, { 
                    trialStatus: 'active',
                    isInsured: true
                });
            } else if (payment.type === 'subscription') {
                // Per ora, l'attivazione della subscription è gestita a livello di utente
                // quando si crea il pagamento, qui potremmo solo confermare lo stato se necessario.
                // Al momento l'approvazione del pagamento è l'unica azione richiesta.
            }
            
            // Esegui le operazioni in batch
            await batch.commit();

            toast({
                title: "Pagamento Approvato!",
                description: `Il pagamento di ${payment.userInfo?.name} è stato segnato come completato.`
            });

            // Rimuovi il pagamento dalla lista locale
            setPayments(prev => prev.filter(p => p.id !== payment.id));

        } catch (error) {
             console.error("Error approving payment: ", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile approvare il pagamento. Riprova."
            });
        } finally {
            setApprovingId(null);
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Pagamenti in Sospeso</CardTitle>
                <CardDescription>
                    Approva i pagamenti ricevuti per attivare i servizi corrispondenti per gli utenti.
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
                                <TableHead>Utente</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Descrizione</TableHead>
                                <TableHead className="text-right">Importo</TableHead>
                                <TableHead>Metodo</TableHead>
                                <TableHead className="text-right">Azione</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length > 0 ? payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{format(payment.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell className="font-medium">{payment.userInfo?.name || 'N/D'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{payment.userInfo?.email || 'N/D'}</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.type === 'association' ? 'default' : 'secondary'}>
                                            {payment.description}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{payment.amount.toFixed(2)} €</TableCell>
                                    <TableCell>{payment.paymentMethod}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprovePayment(payment)}
                                            disabled={approvingId === payment.id}
                                        >
                                            {approvingId === payment.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                            <span className="ml-2">Approva</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        Nessun pagamento in sospeso. Ottimo lavoro!
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
