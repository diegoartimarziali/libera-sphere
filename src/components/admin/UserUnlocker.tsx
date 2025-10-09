'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Unlock, AlertTriangle } from 'lucide-react'

interface PaymentData {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    description: string;
    createdAt: any;
    status: 'pending' | 'phantom';
    type: string;
    paymentMethod: string;
}

export default function AdminUserUnlocker() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [pendingPayments, setPendingPayments] = useState<PaymentData[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
    const [unlocking, setUnlocking] = useState<Set<string>>(new Set());

    const loadPendingUsers = async () => {
        setLoading(true);
        try {
            // Carica tutti gli utenti
            const usersSnap = await getDocs(collection(db, "users"));
            
            // Carica tutti i pagamenti pending E identifica utenti con stato pending fantasma
            const allPendingPayments: PaymentData[] = [];
            const phantomPendingUsers: PaymentData[] = [];
            
            for (const userDoc of usersSnap.docs) {
                const userData = userDoc.data();
                
                // Controlla se l'utente ha stato pending
                if (userData.subscriptionAccessStatus === 'pending') {
                    // Verifica se ha pagamenti pending reali
                    const paymentsSnap = await getDocs(
                        query(
                            collection(db, "users", userDoc.id, "payments"),
                            where("status", "==", "pending"),
                            where("type", "==", "subscription")
                        )
                    );
                    
                    if (paymentsSnap.empty) {
                        // Utente con stato pending ma senza pagamenti - PROBLEMA FANTASMA
                        phantomPendingUsers.push({
                            id: 'phantom-' + userDoc.id,
                            userId: userDoc.id,
                            userName: `${userData.name || ''} ${userData.surname || ''}`.trim(),
                            amount: 0,
                            description: "⚠️ STATO PENDING FANTASMA - Nessun pagamento nel DB",
                            createdAt: null,
                            status: 'phantom' as any,
                            type: 'subscription',
                            paymentMethod: 'unknown'
                        } as PaymentData);
                    } else {
                        // Aggiungi i pagamenti pending reali
                        paymentsSnap.docs.forEach(paymentDoc => {
                            allPendingPayments.push({
                                id: paymentDoc.id,
                                userId: userDoc.id,
                                userName: `${userData.name || ''} ${userData.surname || ''}`.trim(),
                                ...paymentDoc.data()
                            } as PaymentData);
                        });
                    }
                }
            }
            
            // Combina pagamenti reali e fantasma
            const allItems = [...phantomPendingUsers, ...allPendingPayments];
            setPendingPayments(allItems);
            setFilteredPayments(allItems);
            
            console.log('🔍 PHANTOM DETECTION:', {
                phantomUsers: phantomPendingUsers.length,
                realPendingPayments: allPendingPayments.length,
                total: allItems.length
            });
            
        } catch (error) {
            console.error("Error loading pending users:", error);
        } finally {
            setLoading(false);
        }
    };

    const unlockUser = async (userId: string) => {
        setUnlocking(prev => new Set(prev).add(userId));
        try {
            // Trova l'utente per capire se è fantasma o reale
            const userPayment = filteredPayments.find(p => p.userId === userId);
            
            if (userPayment?.status === 'phantom') {
                // Gestione stato fantasma - resetta solo lo stato utente
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    subscriptionAccessStatus: 'expired',
                    subscriptionPaymentFailed: false
                });
                
                console.log(`✅ PHANTOM UNLOCK: Reset user ${userId} from phantom pending state`);
            } else {
                // Gestione normale - cancella pagamenti e reset utente
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    subscriptionAccessStatus: 'expired',
                    subscriptionPaymentFailed: false
                });
                
                // Se ci sono pagamenti pending reali, cancellali
                if (userPayment && userPayment.status === 'pending') {
                    const paymentRef = doc(db, 'users', userId, 'payments', userPayment.id);
                    await updateDoc(paymentRef, {
                        status: 'cancelled',
                        cancelledAt: serverTimestamp(),
                        cancelledBy: 'admin',
                        adminNote: 'Unlocked via emergency admin tool'
                    });
                }
                
                console.log(`✅ REAL PAYMENT UNLOCK: Reset user ${userId} and cancelled payments`);
            }

            toast({
                title: 'Utente sbloccato',
                description: userPayment?.status === 'phantom' 
                    ? 'Stato fantasma ripristinato con successo.' 
                    : 'Utente e pagamenti ripristinati con successo.',
            });

            // Ricarica la lista
            await loadPendingUsers();
        } catch (error) {
            console.error('Error unlocking user:', error);
            toast({
                title: 'Errore',
                description: 'Impossibile sbloccare l\'utente.',
                variant: 'destructive'
            });
        } finally {
            setUnlocking(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const unlockAllPhantomUsers = async () => {
        const phantomUsers = filteredPayments.filter(p => p.status === 'phantom');
        if (phantomUsers.length === 0) {
            toast({
                title: 'Nessun utente da sbloccare',
                description: 'Non ci sono utenti con pending fantasma.',
            });
            return;
        }

        setLoading(true);
        try {
            for (const payment of phantomUsers) {
                await unlockUser(payment.userId);
            }
            
            toast({
                title: 'Sblocco completato',
                description: `${phantomUsers.length} utenti fantasma sbloccati con successo.`,
            });
        } catch (error) {
            console.error('Error unlocking phantom users:', error);
            toast({
                title: 'Errore',
                description: 'Errore durante lo sblocco massivo.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPendingUsers();
    }, []);

    const phantomPayments = filteredPayments.filter(p => p.status === 'phantom');
    const realPayments = filteredPayments.filter(p => p.status === 'pending');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Unlock className="h-5 w-5" />
                        Gestione Utenti Bloccati
                    </CardTitle>
                    <CardDescription>
                        Identifica e sblocca utenti con stato pending senza pagamenti corrispondenti
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-4">
                            <Badge variant="destructive">
                                {phantomPayments.length} Pending Fantasma
                            </Badge>
                            <Badge variant="default">
                                {realPayments.length} Pending Legittimi
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                onClick={loadPendingUsers} 
                                variant="outline"
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Ricarica
                            </Button>
                            {phantomPayments.length > 0 && (
                                <Button 
                                    onClick={unlockAllPhantomUsers}
                                    variant="destructive"
                                    disabled={loading}
                                >
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Sblocca Tutti i Fantasma
                                </Button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Importo</TableHead>
                                    <TableHead>Descrizione</TableHead>
                                    <TableHead>Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">
                                            {payment.userName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={payment.status === 'phantom' ? 'destructive' : 'default'}>
                                                {payment.status === 'phantom' ? 'FANTASMA' : 'PENDING'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            €{payment.amount?.toFixed?.(2) || '0.00'}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {payment.description}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                onClick={() => unlockUser(payment.userId)}
                                                disabled={unlocking.has(payment.userId)}
                                                variant={payment.status === 'phantom' ? 'destructive' : 'outline'}
                                                size="sm"
                                            >
                                                {unlocking.has(payment.userId) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Unlock className="h-4 w-4 mr-1" />
                                                        {payment.status === 'phantom' ? 'Ripristina' : 'Sblocca'}
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredPayments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Nessun utente con stato pending trovato
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}