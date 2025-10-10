"use client"

import { useState, useEffect } from "react"
import { db, auth, storage } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { collection, getDocs, query, orderBy, collectionGroup, where, doc, writeBatch, Timestamp, updateDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import type { VariantProps } from "class-variance-authority"
import { ref, deleteObject, listAll } from "firebase/storage";
import { hasFullAdminAccess } from "@/app/dashboard/layout"


import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X, User, Users, Search, ShieldPlus, Trash2, Mail, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface UserData {
  name: string;
  email: string;
  role?: 'admin' | 'superAdmin' | 'user';
  [key: string]: any;
}

interface Payment {
    id: string; // Document ID of the payment
    userId: string;
    amount: number;
    createdAt: Timestamp;
    description: string;
    paymentMethod: 'online' | 'in_person' | 'bank_transfer' | 'bonus';
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    type: 'association' | 'trial' | 'subscription';
    awardId?: string | string[]; // Può essere singolo ID o array di ID
    bonusUsed?: number;
    cancelledAt?: Timestamp;
    cancelledBy?: string;
}

interface UserAward {
    id: string;
    awardId: string;
    title?: string;
    value?: number;
    assignedAt?: Timestamp;
}

interface UserProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    role?: 'admin' | 'user';
    discipline?: string;
    gym?: string;
    associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
    associationPaymentFailed?: boolean;
    trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
    trialPaymentFailed?: boolean;
    subscriptionAccessStatus?: 'pending' | 'active' | 'expired';
    subscriptionActivationDate?: Timestamp;
    subscriptionPaymentFailed?: boolean;
    payments: Payment[];
    awards?: UserAward[];
}

interface Gym {
    id: string;
    name: string;
}

// Funzioni helper per tradurre stati e metodi
const getStatusVariant = (status: Payment['status']): VariantProps<typeof badgeVariants>["variant"] => {
    switch (status) {
        case 'completed': return 'success';
        case 'pending': return 'secondary';
        case 'failed': return 'destructive';
        case 'cancelled': return 'outline';
        default: return 'secondary';
    }
}
const translateStatus = (status: Payment['status']) => {
    switch (status) {
        case 'completed': return 'Completato';
        case 'pending': return 'In attesa';
        case 'failed': return 'Fallito';
        case 'cancelled': return 'Annullato';
        default: return status;
    }
}
const translatePaymentMethod = (method: Payment['paymentMethod']) => {
    switch (method) {
        case 'online': return 'Online';
        case 'in_person': return 'In Sede';
        case 'bank_transfer': return 'Bonifico';
        case 'bonus': return 'Premio';
        default: return method;
    }
}

export default function AdminPaymentsPage() {
    const [user, loadingAuth] = useAuthState(auth);
    const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [gyms, setGyms] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)
    const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("pending_completed");

    const { toast } = useToast();

    // Fetch current user data to check permissions
    useEffect(() => {
        const fetchCurrentUserData = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data() as UserData;
                        setCurrentUserData(userData);
                        setCurrentUserRole(userData.role || null);
                    }
                } catch (error) {
                    console.error("Error fetching current user data:", error);
                }
            }
        };

        if (!loadingAuth && user) {
            fetchCurrentUserData();
        }
    }, [user, loadingAuth]);

    const handleDeleteAward = async (awardId: string, userId: string) => {
        try {
            await deleteDoc(doc(db, "users", userId, "userAwards", awardId));
            toast({
                title: "Premio eliminato",
                description: "Il premio è stato rimosso dall'utente.",
                variant: "success"
            });
            setProfiles(prev =>
                prev.map(profile =>
                    profile.uid === userId
                        ? { ...profile, awards: profile.awards?.filter(a => a.id !== awardId) }
                        : profile
                )
            );
        } catch (error) {
            toast({
                title: "Errore eliminazione premio",
                description: "Impossibile eliminare il premio.",
                variant: "destructive"
            });
        }
    };

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setCurrentUserRole(userDoc.data().role);
                }
            }

            const gymsSnapshot = await getDocs(collection(db, "gyms"));
            const gymsMap = new Map<string, string>();
            gymsSnapshot.forEach(doc => gymsMap.set(doc.id, doc.data().name));
            setGyms(gymsMap);

            const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("surname")));

            const userProfiles = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                const paymentsRef = collection(db, 'users', userId, 'payments');
                const paymentsQuery = query(paymentsRef, orderBy('createdAt', 'desc'));
                const paymentsSnapshot = await getDocs(paymentsQuery);

                const payments = paymentsSnapshot.docs.map(paymentDoc => ({
                    id: paymentDoc.id,
                    userId: userId,
                    ...paymentDoc.data()
                } as Payment));

                // Recupera premi assegnati dalla sottocollezione utente
                const awardsRef = collection(db, 'users', userId, 'userAwards');
                const awardsSnapshot = await getDocs(awardsRef);
                const awards = await Promise.all(awardsSnapshot.docs.map(async aDoc => {
                    const awardData = aDoc.data();
                    let title = awardData.title;
                    let value = awardData.value;
                    // Se manca il titolo/valore, recupera da awards
                    if (!title || typeof value !== "number") {
                        try {
                            const awardDoc = await getDoc(doc(db, "awards", awardData.awardId));
                            if (awardDoc.exists()) {
                                const ad = awardDoc.data();
                                title = ad.name;
                                value = ad.value;
                            }
                        } catch {}
                    }
                    return {
                        id: aDoc.id,
                        awardId: awardData.awardId,
                        title,
                        value,
                        assignedAt: awardData.assignedAt
                    };
                }));

                return {
                    uid: userId,
                    name: userData.name,
                    surname: userData.surname,
                    email: userData.email,
                    role: userData.role,
                    discipline: userData.discipline,
                    gym: userData.gym,
                    associationStatus: userData.associationStatus,
                    associationPaymentFailed: userData.associationPaymentFailed,
                    trialStatus: userData.trialStatus,
                    trialPaymentFailed: userData.trialPaymentFailed,
                    subscriptionAccessStatus: userData.subscriptionAccessStatus,
                    subscriptionActivationDate: userData.subscriptionActivationDate,
                    subscriptionPaymentFailed: userData.subscriptionPaymentFailed,
                    payments: payments,
                    awards: awards
                };
            }));
            setProfiles(userProfiles);

        } catch (error) {
            console.error("Error fetching admin data: ", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare i dati degli utenti e dei pagamenti."
            });
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if(user) {
            fetchAdminData();
        } else {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    // Messaggi predefiniti per i solleciti
    const reminderMessages = {
        association: "Richiesta Associazione, Il tuo pagamento non è ancora stato ricevuto.",
        subscription: "Acquisto Abbonamento, Il tuo pagamento non è ancora stato ricevuto.",
        stage: "Iscrizione Stage, Il tuo pagamento non è ancora stato ricevuto.",
        exam: "Iscrizione Esami, Il tuo pagamento non è ancora stato ricevuto."
    };

    const handleSendReminder = async (payment: Payment, messageType: keyof typeof reminderMessages, userName: string) => {
        setSendingMessageId(payment.id);
        try {
            const message = reminderMessages[messageType];
            
            // Qui dovresti implementare l'invio effettivo del messaggio
            // Per ora simuliamo con un toast
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simula invio
            
            toast({
                title: "Messaggio Inviato",
                description: `Sollecito inviato a ${userName}: "${message}"`
            });
            
            console.log(`Messaggio inviato a ${userName} (${payment.userId}): ${message}`);
            
        } catch (error) {
            console.error("Errore invio messaggio:", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile inviare il messaggio di sollecito."
            });
        } finally {
            setSendingMessageId(null);
        }
    };

    const handlePaymentUpdate = async (payment: Payment, newStatus: 'completed' | 'failed') => {
        setUpdatingPaymentId(payment.id);
        
        try {
            const batch = writeBatch(db);
            const userDocRef = doc(db, 'users', payment.userId);
            const paymentDocRef = doc(db, 'users', payment.userId, 'payments', payment.id);

            batch.update(paymentDocRef, { status: newStatus });

            if (
              newStatus === 'failed' &&
              payment.awardId &&
              typeof payment.bonusUsed === 'number' &&
              payment.bonusUsed > 0
            ) {
              // Rimborso bonus
              const { refundUserBonus } = await import('@/lib/refundUserBonus');
              
              // Gestisci sia singoli awardId che array di awardId
              if (Array.isArray(payment.awardId)) {
                // Se è un array, rimborsa equamente tra tutti gli award
                const bonusPerAward = payment.bonusUsed / payment.awardId.length;
                for (const awardId of payment.awardId) {
                  await refundUserBonus(payment.userId, awardId, bonusPerAward);
                }
              } else {
                // Se è una singola stringa
                await refundUserBonus(payment.userId, payment.awardId, payment.bonusUsed!);
              }
            }

            if (newStatus === 'completed') {
                 if (payment.type === 'association') {
                    batch.update(userDocRef, { 
                        associationStatus: 'active',
                        isInsured: true,
                        associationPaymentFailed: false,
                    });
                } else if (payment.type === 'trial') {
                    // Aggiorna solo il documento main della sottocollezione trialLessons
                    const trialMainDocRef = doc(db, 'users', payment.userId, 'trialLessons', 'main');
                    batch.update(trialMainDocRef, { trialStatus: 'active' });
                    batch.update(userDocRef, { isInsured: true });
                } else if (payment.type === 'subscription') {
                    batch.update(userDocRef, { 
                        subscriptionAccessStatus: 'active',
                        subscriptionActivationDate: serverTimestamp(),
                        subscriptionPaymentFailed: false, 
                    });
                    sessionStorage.setItem('showSubscriptionActivatedMessage', new Date().toISOString());
                }
            } else { // newStatus === 'failed'
                 if (payment.type === 'association') {
                    batch.update(userDocRef, { 
                        associationStatus: 'not_associated',
                        associationPaymentFailed: true,
                    });
                } else if (payment.type === 'trial') {
                    batch.update(userDocRef, { 
                        trialStatus: 'not_applicable',
                        trialPaymentFailed: true,
                        trialLessons: null,
                        trialExpiryDate: null,
                    });
                } else if (payment.type === 'subscription') {
                     batch.update(userDocRef, { 
                        subscriptionAccessStatus: 'expired',
                        subscriptionPaymentFailed: true,
                        activeSubscription: null,
                    });
                }
            }
            
            await batch.commit();

            toast({
                title: `Pagamento ${newStatus === 'completed' ? 'Approvato' : 'Fallito'}!`,
                description: `Lo stato del pagamento di ${payment.description} è stato aggiornato.`
            });
            
             setProfiles(prevProfiles => {
                return prevProfiles.map(profile => {
                    if (profile.uid === payment.userId) {
                        const updatedPayments = profile.payments.map(p => 
                            p.id === payment.id ? { ...p, status: newStatus } : p
                        );
                        
                        let updatedProfile = { ...profile, payments: updatedPayments };

                        if (newStatus === 'completed') {
                            if (payment.type === 'association') {
                                updatedProfile.associationStatus = 'active';
                                updatedProfile.associationPaymentFailed = false;
                            }
                            if (payment.type === 'trial') {
                                updatedProfile.trialStatus = 'active';
                                updatedProfile.trialPaymentFailed = false;
                            }
                            if (payment.type === 'subscription') {
                                updatedProfile.subscriptionAccessStatus = 'active';
                                updatedProfile.subscriptionActivationDate = Timestamp.now();
                                updatedProfile.subscriptionPaymentFailed = false;
                            }
                        } else { 
                            if (payment.type === 'association') {
                                updatedProfile.associationStatus = 'not_associated';
                                updatedProfile.associationPaymentFailed = true;
                            }
                            if (payment.type === 'trial') {
                                updatedProfile.trialStatus = 'not_applicable';
                                updatedProfile.trialPaymentFailed = true;
                            }
                            if (payment.type === 'subscription') {
                                updatedProfile.subscriptionAccessStatus = 'expired';
                                updatedProfile.subscriptionPaymentFailed = true;
                            }
                        }
                        
                        return updatedProfile;
                    }
                    return profile;
                });
            });


        } catch (error) {
             console.error(`Error updating payment to ${newStatus}: `, error);
             console.error('Payment details:', {
                id: payment.id,
                type: payment.type,
                userId: payment.userId,
                status: payment.status,
                newStatus: newStatus
             });
            toast({
                variant: "destructive",
                title: "Errore",
                description: `Impossibile aggiornare il pagamento. Controlla la console per dettagli. Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`
            });
        } finally {
            setUpdatingPaymentId(null);
        }
    }

    // Nuova funzione per annullare pagamenti completati
    const handleCancelCompletedPayment = async (payment: Payment) => {
        if (!window.confirm(`Sei sicuro di voler annullare questo pagamento completato?\n\nQuesta azione:\n- Cambierà lo stato in "Annullato"\n- Rimborserà automaticamente i bonus utilizzati\n- Revocherà i servizi attivati\n\nPagamento: ${payment.description}\nImporto: ${payment.amount}€`)) {
            return;
        }

        setUpdatingPaymentId(payment.id);
        
        try {
            const batch = writeBatch(db);
            const userDocRef = doc(db, 'users', payment.userId);
            const paymentDocRef = doc(db, 'users', payment.userId, 'payments', payment.id);

            // Cambia stato a "cancelled" invece di "failed"
            batch.update(paymentDocRef, { 
                status: 'cancelled',
                cancelledAt: serverTimestamp(),
                cancelledBy: user?.uid || 'admin'
            });

            // Rimborso bonus se utilizzato
            if (payment.awardId && typeof payment.bonusUsed === 'number' && payment.bonusUsed > 0) {
                const { refundUserBonus } = await import('@/lib/refundUserBonus');
                
                if (Array.isArray(payment.awardId)) {
                    const bonusPerAward = payment.bonusUsed / payment.awardId.length;
                    for (const awardId of payment.awardId) {
                        await refundUserBonus(payment.userId, awardId, bonusPerAward);
                    }
                } else {
                    await refundUserBonus(payment.userId, payment.awardId, payment.bonusUsed);
                }
            }

            // Revoca servizi attivati
            if (payment.type === 'association') {
                batch.update(userDocRef, { 
                    associationStatus: 'not_associated',
                    isInsured: false,
                    associationPaymentFailed: false,
                });
            } else if (payment.type === 'trial') {
                batch.update(userDocRef, { 
                    trialStatus: 'not_applicable',
                    trialPaymentFailed: false,
                    trialLessons: null,
                    trialExpiryDate: null,
                });
            } else if (payment.type === 'subscription') {
                // IMPORTANTE: Reset completo per abbonamenti cancellati
                batch.update(userDocRef, { 
                    subscriptionAccessStatus: 'expired',
                    subscriptionPaymentFailed: false,
                    activeSubscription: null, // Reset dell'abbonamento attivo
                });
            }
            
            await batch.commit();

            toast({
                title: "Pagamento Annullato!",
                description: `Il pagamento è stato annullato. I bonus utilizzati sono stati rimborsati e i servizi revocati.`
            });
            
            setProfiles(prevProfiles => {
                return prevProfiles.map(profile => {
                    if (profile.uid === payment.userId) {
                        const updatedPayments = profile.payments.map(p => 
                            p.id === payment.id ? { ...p, status: 'cancelled' as any } : p
                        );
                        
                        let updatedProfile = { ...profile, payments: updatedPayments };

                        // Revoca servizi
                        if (payment.type === 'association') {
                            updatedProfile.associationStatus = 'not_associated';
                            updatedProfile.associationPaymentFailed = false;
                        }
                        if (payment.type === 'trial') {
                            updatedProfile.trialStatus = 'not_applicable';
                            updatedProfile.trialPaymentFailed = false;
                        }
                        if (payment.type === 'subscription') {
                            updatedProfile.subscriptionAccessStatus = 'expired';
                            updatedProfile.subscriptionPaymentFailed = false;
                        }
                        
                        return updatedProfile;
                    }
                    return profile;
                });
            });

        } catch (error) {
            console.error('Error cancelling payment:', error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: `Impossibile annullare il pagamento. Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`
            });
        } finally {
            setUpdatingPaymentId(null);
        }
    }

    const handleMakeAdmin = async (userId: string) => {
        if (!window.confirm("Sei sicuro di voler rendere questo utente un amministratore? Avrà pieno accesso a tutte le funzioni di gestione.")) {
            return;
        }

        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { role: 'admin' });

            toast({
                title: "Utente Promosso!",
                description: "L'utente è ora un amministratore.",
            });

            setProfiles(prevProfiles => prevProfiles.map(p => 
                p.uid === userId ? { ...p, role: 'admin' } : p
            ));

        } catch (error) {
             console.error("Error making user admin: ", error);
             toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile promuovere l'utente ad amministratore."
            });
        }
    }




    const filteredProfiles = profiles
        .filter(profile => {
            const fullName = `${profile.name} ${profile.surname}`.toLowerCase();
            const email = profile.email.toLowerCase();
            const search = searchTerm.toLowerCase();
            return fullName.includes(search) || email.includes(search);
        })
        .filter(profile => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'pending_completed') return profile.payments.some(p => p.status === 'pending' || p.status === 'completed');
            if (statusFilter === 'pending') return profile.payments.some(p => p.status === 'pending');
            if (statusFilter === 'failed') return profile.payments.some(p => p.status === 'failed');
            if (statusFilter === 'no_payments') return profile.payments.length === 0;
            return true;
        });

    const canModifyPayments = hasFullAdminAccess(currentUserData as any);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestione Pagamenti Utenti</CardTitle>
                <CardDescription>
                    Visualizza e gestisci l'estratto conto di ogni utente registrato. La vista di default mostra solo gli utenti con pagamenti recenti o in sospeso.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 mb-6">
                     <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cerca per nome o email..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full bg-transparent border-amber-800 text-amber-800 hover:bg-amber-800/5">
                            <SelectValue placeholder="Filtra per stato pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Solo Pagamenti In Sospeso</SelectItem>
                            <SelectItem value="failed">Solo Pagamenti Falliti</SelectItem>
                            <SelectItem value="no_payments">Utenti senza Pagamenti</SelectItem>
                            <SelectItem value="pending_completed">Pagamenti Recenti/Pendenti</SelectItem>
                            <SelectItem value="all">Tutti gli Utenti</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <Accordion type="multiple" className="w-full">
                        {filteredProfiles.length > 0 ? filteredProfiles.map(profile => (
                            <AccordionItem value={profile.uid} key={profile.uid}>
                                 <div className="flex items-center hover:bg-muted/50 px-2 sm:px-4 rounded-md">
                                    <AccordionTrigger className="flex-1">
                                        <div className="flex flex-1 flex-col text-left gap-1">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                                                <span className="font-bold text-sm truncate">{profile.name} {profile.surname}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground pl-6 sm:pl-8">
                                                {profile.discipline && <span className="truncate">{profile.discipline}</span>}
                                                {profile.gym && <span className="truncate">{profile.gym} - {gyms.get(profile.gym)}</span>}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                     <div className="flex items-center gap-2 ml-2 sm:ml-4">
                                        {/* Badge per numero pagamenti pending su mobile */}
                                        {profile.payments.filter(p => p.status === 'pending').length > 0 && (
                                            <Badge variant="secondary" className="text-xs md:hidden">
                                                {profile.payments.filter(p => p.status === 'pending').length}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <AccordionContent className="p-4 bg-muted/20">
                                    {/* Premi assegnati rimossi su richiesta */}
                                    {/* Pagamenti */}
                                    {profile.payments.length > 0 ? (
                                        <>
                                            {/* Vista Desktop */}
                                            <div className="hidden md:block">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="font-bold">Data</TableHead>
                                                            <TableHead className="font-bold">Descrizione</TableHead>
                                                            <TableHead className="font-bold">Metodo</TableHead>
                                                            <TableHead className="font-bold">Importo</TableHead>
                                                            <TableHead className="font-bold">Stato</TableHead>
                                                            <TableHead className="text-left font-bold">Azione</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {profile.payments.map(p => (
                                                            <TableRow key={p.id}>
                                                                <TableCell>{p.createdAt ? format(p.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/D'}</TableCell>
                                                                <TableCell>{p.description || (p.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '')}</TableCell>
                                                                <TableCell>{translatePaymentMethod(p.paymentMethod)}</TableCell>
                                                                <TableCell>{p.amount.toFixed(2)} €</TableCell>
                                                                <TableCell>
                                                                    {p.status === 'completed' ? (
                                                                        <span className="text-green-600 bg-transparent font-bold">{translateStatus(p.status)}</span>
                                                                    ) : p.status === 'failed' ? (
                                                                        <span className="text-red-600 bg-transparent font-bold">{translateStatus(p.status)}</span>
                                                                    ) : p.status === 'cancelled' ? (
                                                                        <span className="text-orange-600 bg-transparent font-bold">{translateStatus(p.status)}</span>
                                                                    ) : (
                                                                        <Badge variant={getStatusVariant(p.status)}>
                                                                            {translateStatus(p.status)}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-left">
                                                                    {p.status === 'pending' && (
                                                                        <div className="flex gap-2 justify-start">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                onClick={() => handlePaymentUpdate(p, 'failed')}
                                                                                disabled={updatingPaymentId === p.id || !canModifyPayments}
                                                                                title="Segna come fallito"
                                                                                className="bg-transparent border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400"
                                                                            >
                                                                                 {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                onClick={() => handlePaymentUpdate(p, 'completed')}
                                                                                disabled={updatingPaymentId === p.id || !canModifyPayments}
                                                                                title="Approva pagamento"
                                                                                className="bg-transparent border-green-300 text-green-500 hover:bg-green-50 hover:border-green-400"
                                                                            >
                                                                                {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                                                            </Button>
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        disabled={sendingMessageId === p.id || !canModifyPayments}
                                                                                        title="Invia sollecito"
                                                                                        className="bg-transparent hover:bg-transparent"
                                                                                    >
                                                                                        {sendingMessageId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4" />}
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuItem onClick={() => handleSendReminder(p, 'association', `${profile.name} ${profile.surname}`)}>
                                                                                        📋 Richiesta Associazione
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={() => handleSendReminder(p, 'subscription', `${profile.name} ${profile.surname}`)}>
                                                                                        💳 Acquisto Abbonamento
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={() => handleSendReminder(p, 'stage', `${profile.name} ${profile.surname}`)}>
                                                                                        🏆 Iscrizione Stage
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={() => handleSendReminder(p, 'exam', `${profile.name} ${profile.surname}`)}>
                                                                                        🎓 Iscrizione Esami
                                                                                    </DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>
                                                                    )}
                                                                    {p.status === 'completed' && canModifyPayments && (
                                                                        <div className="flex gap-2 justify-start">
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        disabled={updatingPaymentId === p.id}
                                                                                        title="Annulla pagamento completato"
                                                                                        className="bg-transparent border-orange-300 text-orange-500 hover:bg-orange-50 hover:border-orange-400"
                                                                                    >
                                                                                        {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                                                                    </Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>Annulla Pagamento Completato</AlertDialogTitle>
                                                                                        <AlertDialogDescription>
                                                                                            Questa azione annullerà definitivamente il pagamento:
                                                                                            <br /><br />
                                                                                            <strong>Descrizione:</strong> {p.description}<br />
                                                                                            <strong>Importo:</strong> {p.amount.toFixed(2)}€<br />
                                                                                            {p.bonusUsed && p.bonusUsed > 0 && (
                                                                                                <>
                                                                                                    <strong>Bonus utilizzato:</strong> {p.bonusUsed.toFixed(2)}€ (verrà rimborsato)<br />
                                                                                                </>
                                                                                            )}
                                                                                        </AlertDialogDescription>
                                                                                        <div className="mt-4">
                                                                                            <strong>Conseguenze:</strong>
                                                                                            <div className="mt-2 text-sm space-y-1">
                                                                                                <div>• Il pagamento sarà marcato come "Annullato"</div>
                                                                                                <div>• I bonus utilizzati verranno automaticamente rimborsati</div>
                                                                                                <div>• I servizi attivati (associazione/abbonamento) verranno revocati</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                                        <AlertDialogAction 
                                                                                            onClick={() => handleCancelCompletedPayment(p)}
                                                                                            className="bg-red-600 hover:bg-red-700"
                                                                                        >
                                                                                            Conferma Annullamento
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            
                                            {/* Vista Mobile - Cards */}
                                            <div className="md:hidden space-y-3">
                                                {profile.payments.map(p => (
                                                    <Card key={p.id} className="border-l-4 border-l-primary">
                                                        <CardContent className="p-4">
                                                            <div className="space-y-3">
                                                                {/* Header con data e stato */}
                                                                <div className="flex justify-between items-start">
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {p.createdAt ? format(p.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/D'}
                                                                    </div>
                                                                    <div>
                                                                        {p.status === 'completed' ? (
                                                                            <span className="text-green-600 bg-transparent font-bold text-sm">{translateStatus(p.status)}</span>
                                                                        ) : p.status === 'failed' ? (
                                                                            <span className="text-red-600 bg-transparent font-bold text-sm">{translateStatus(p.status)}</span>
                                                                        ) : p.status === 'cancelled' ? (
                                                                            <span className="text-orange-600 bg-transparent font-bold text-sm">{translateStatus(p.status)}</span>
                                                                        ) : (
                                                                            <Badge variant={getStatusVariant(p.status)}>
                                                                                {translateStatus(p.status)}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Descrizione */}
                                                                <div className="font-medium text-sm">
                                                                    {p.description || (p.paymentMethod === 'bonus' ? 'Pagamento coperto da premio' : '')}
                                                                </div>
                                                                
                                                                {/* Dettagli metodo e importo */}
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-muted-foreground">{translatePaymentMethod(p.paymentMethod)}</span>
                                                                    <span className="font-bold">{p.amount.toFixed(2)} €</span>
                                                                </div>
                                                                
                                                                {/* Azioni per pagamenti pending */}
                                                                {p.status === 'pending' && (
                                                                    <div className="flex gap-2 pt-2 justify-center">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={() => handlePaymentUpdate(p, 'failed')}
                                                                            disabled={updatingPaymentId === p.id || !canModifyPayments}
                                                                            title="Rifiuta"
                                                                            className="bg-transparent border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400"
                                                                        >
                                                                            {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={() => handlePaymentUpdate(p, 'completed')}
                                                                            disabled={updatingPaymentId === p.id || !canModifyPayments}
                                                                            title="Approva"
                                                                            className="bg-transparent border-green-300 text-green-500 hover:bg-green-50 hover:border-green-400"
                                                                        >
                                                                            {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                                                        </Button>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    disabled={sendingMessageId === p.id || !canModifyPayments}
                                                                                    className="bg-transparent hover:bg-transparent px-3"
                                                                                >
                                                                                    {sendingMessageId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4" />}
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem onClick={() => handleSendReminder(p, 'association', `${profile.name} ${profile.surname}`)}>
                                                                                    📋 Richiesta Associazione
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleSendReminder(p, 'subscription', `${profile.name} ${profile.surname}`)}>
                                                                                    💳 Acquisto Abbonamento
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleSendReminder(p, 'stage', `${profile.name} ${profile.surname}`)}>
                                                                                    🏆 Iscrizione Stage
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleSendReminder(p, 'exam', `${profile.name} ${profile.surname}`)}>
                                                                                    🎓 Iscrizione Esami
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Azioni per pagamenti completati */}
                                                                {p.status === 'completed' && canModifyPayments && (
                                                                    <div className="flex gap-2 pt-2 justify-center">
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    disabled={updatingPaymentId === p.id}
                                                                                    className="bg-transparent border-orange-300 text-orange-500 hover:bg-orange-50 hover:border-orange-400"
                                                                                >
                                                                                    {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Trash2 className="h-4 w-4 mr-1" /> Annulla</>}
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Annulla Pagamento</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        Annullare definitivamente questo pagamento?
                                                                                        <br /><br />
                                                                                        <strong>{p.description}</strong><br />
                                                                                        <strong>{p.amount.toFixed(2)}€</strong>
                                                                                        {p.bonusUsed && p.bonusUsed > 0 && (
                                                                                            <><br />Bonus: {p.bonusUsed.toFixed(2)}€ (rimborsato)</>
                                                                                        )}
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                                    <AlertDialogAction 
                                                                                        onClick={() => handleCancelCompletedPayment(p)}
                                                                                        className="bg-red-600 hover:bg-red-700"
                                                                                    >
                                                                                        Conferma
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-4">Nessun pagamento registrato per questo utente.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        )) : (
                             <div className="text-center py-16 text-muted-foreground">
                                <Users className="mx-auto h-12 w-12" />
                                <h3 className="mt-4 text-lg font-semibold">Nessun Utente Trovato</h3>
                                <p className="mt-1 text-sm">Prova a modificare i filtri di ricerca.</p>
                            </div>
                        )}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
