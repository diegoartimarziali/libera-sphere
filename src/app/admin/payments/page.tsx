
"use client"

import { useState, useEffect } from "react"
import { db, auth, storage } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { collection, getDocs, query, orderBy, collectionGroup, where, doc, writeBatch, Timestamp, updateDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import type { VariantProps } from "class-variance-authority"
import { ref, deleteObject, listAll } from "firebase/storage";


import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X, User, Users, Search, ShieldPlus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"


interface Payment {
    id: string; // Document ID of the payment
    userId: string;
    amount: number;
    createdAt: Timestamp;
    description: string;
    paymentMethod: 'online' | 'in_person' | 'bank_transfer';
    status: 'pending' | 'completed' | 'failed';
    type: 'association' | 'trial' | 'subscription';
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
    subscriptionAccessStatus?: 'pending' | 'active' | 'expired';
    subscriptionActivationDate?: Timestamp;
    subscriptionPaymentFailed?: boolean;
    payments: Payment[];
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
        default: return 'secondary';
    }
}
const translateStatus = (status: Payment['status']) => {
    switch (status) {
        case 'completed': return 'Completato';
        case 'pending': return 'In attesa';
        case 'failed': return 'Fallito';
        default: return status;
    }
}
const translatePaymentMethod = (method: Payment['paymentMethod']) => {
    switch (method) {
        case 'online': return 'Online';
        case 'in_person': return 'In Sede';
        case 'bank_transfer': return 'Bonifico';
        default: return method;
    }
}

export default function AdminPaymentsPage() {
    const [user] = useAuthState(auth);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [gyms, setGyms] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("pending_completed");

    const { toast } = useToast();

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
                    subscriptionAccessStatus: userData.subscriptionAccessStatus,
                    subscriptionActivationDate: userData.subscriptionActivationDate,
                    subscriptionPaymentFailed: userData.subscriptionPaymentFailed,
                    payments: payments
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
    
    const handlePaymentUpdate = async (payment: Payment, newStatus: 'completed' | 'failed') => {
        setUpdatingPaymentId(payment.id);
        
        try {
            const batch = writeBatch(db);
            const userDocRef = doc(db, 'users', payment.userId);
            const paymentDocRef = doc(db, 'users', payment.userId, 'payments', payment.id);

            batch.update(paymentDocRef, { status: newStatus });

            if (newStatus === 'completed') {
                 if (payment.type === 'association') {
                    batch.update(userDocRef, { 
                        associationStatus: 'active',
                        isInsured: true,
                        associationPaymentFailed: false,
                    });
                } else if (payment.type === 'trial') {
                    batch.update(userDocRef, { 
                        trialStatus: 'active',
                        isInsured: true
                    });
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
                    batch.update(userDocRef, { trialStatus: 'not_applicable' });
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
                            if (payment.type === 'trial') updatedProfile.trialStatus = 'active';
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
                            if (payment.type === 'trial') updatedProfile.trialStatus = 'not_applicable';
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
            toast({
                variant: "destructive",
                title: "Errore",
                description: `Impossibile aggiornare il pagamento. Riprova.`
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

    const handleDeleteUser = async (profileToDelete: UserProfile) => {
        try {
            const batch = writeBatch(db);

            // 1. Delete user document
            const userDocRef = doc(db, "users", profileToDelete.uid);
            batch.delete(userDocRef);

            // 2. Delete payments subcollection
            const paymentsRef = collection(db, "users", profileToDelete.uid, "payments");
            const paymentsSnapshot = await getDocs(paymentsRef);
            paymentsSnapshot.forEach(doc => batch.delete(doc.ref));

            // 3. Delete attendances
            const attendancesRef = collection(db, "attendances");
            const attendancesQuery = query(attendancesRef, where("userId", "==", profileToDelete.uid));
            const attendancesSnapshot = await getDocs(attendancesQuery);
            attendancesSnapshot.forEach(doc => batch.delete(doc.ref));

            // 4. Delete files from Storage
            const userStorageRef = ref(storage, `medical-certificates/${profileToDelete.uid}`);
            const filesList = await listAll(userStorageRef);
            await Promise.all(filesList.items.map(fileRef => deleteObject(fileRef)));

            // Commit all batched writes to Firestore
            await batch.commit();

            toast({
                title: "Utente Eliminato",
                description: `${profileToDelete.name} ${profileToDelete.surname} e tutti i suoi dati sono stati rimossi. L'account di autenticazione deve essere rimosso manualmente dalla Console Firebase.`,
                variant: "success",
                duration: 9000,
            });

            // Refresh UI
            setProfiles(prev => prev.filter(p => p.uid !== profileToDelete.uid));

        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                variant: "destructive",
                title: "Errore Eliminazione",
                description: `Impossibile eliminare l'utente. Dettagli: ${error instanceof Error ? error.message : 'Sconosciuto'}`
            });
        }
    };


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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestione Pagamenti Utenti</CardTitle>
                <CardDescription>
                    Visualizza e gestisci l'estratto conto di ogni utente registrato. La vista di default mostra solo gli utenti con pagamenti recenti o in sospeso.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                     <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cerca per nome o email..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Filtra per stato pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending_completed">Pagamenti Recenti/Pendenti</SelectItem>
                            <SelectItem value="pending">Solo Pagamenti In Sospeso</SelectItem>
                             <SelectItem value="failed">Solo Pagamenti Falliti</SelectItem>
                             <SelectItem value="no_payments">Utenti senza Pagamenti</SelectItem>
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
                                 <div className="flex items-center hover:bg-muted/50 px-4 rounded-md">
                                    <AccordionTrigger className="flex-1">
                                        <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:gap-4 text-left">
                                            <div className="flex items-center">
                                                <User className="h-5 w-5 mr-3 text-primary" />
                                                <span className="font-bold">{profile.name} {profile.surname}</span>
                                                {profile.role === 'admin' && <Badge variant="destructive" className="ml-3">Admin</Badge>}
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pl-8 sm:pl-0">
                                                <span>{profile.email}</span>
                                                {profile.discipline && <span>{profile.discipline}</span>}
                                                {profile.gym && <span>{profile.gym} - {gyms.get(profile.gym)}</span>}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                     <div className="flex items-center gap-2 ml-4">
                                        {currentUserRole === 'admin' && profile.role !== 'admin' && (
                                            <Button 
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    handleMakeAdmin(profile.uid);
                                                }}
                                            >
                                                <ShieldPlus className="h-4 w-4 mr-2" />
                                                Rendi Admin
                                            </Button>
                                        )}
                                        {currentUserRole === 'admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Elimina Utente
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Questa azione è irreversibile. Eliminerà permanentemente l'utente <strong className="mx-1">{profile.name} {profile.surname}</strong> e tutti i suoi dati (pagamenti, presenze, certificati).
                                                            <br/><br/>
                                                            <strong className="text-destructive">L'account di accesso (email/password) dovrà essere rimosso manualmente dalla Console Firebase.</strong>
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(profile)}>
                                                            Sì, elimina tutto
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                                <AccordionContent className="p-4 bg-muted/20">
                                    {profile.payments.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Descrizione</TableHead>
                                                    <TableHead>Metodo</TableHead>
                                                    <TableHead>Importo</TableHead>
                                                    <TableHead>Stato</TableHead>
                                                    <TableHead className="text-right">Azione</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {profile.payments.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{p.createdAt ? format(p.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/D'}</TableCell>
                                                        <TableCell>{p.description}</TableCell>
                                                        <TableCell>{translatePaymentMethod(p.paymentMethod)}</TableCell>
                                                        <TableCell>{p.amount.toFixed(2)} €</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusVariant(p.status)}>
                                                                {translateStatus(p.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {p.status === 'pending' && (
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        onClick={() => handlePaymentUpdate(p, 'failed')}
                                                                        disabled={updatingPaymentId === p.id}
                                                                        title="Segna come fallito"
                                                                    >
                                                                         {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                                                    </Button>
                                                                    <Button
                                                                        variant="success"
                                                                        size="icon"
                                                                        onClick={() => handlePaymentUpdate(p, 'completed')}
                                                                        disabled={updatingPaymentId === p.id}
                                                                        title="Approva pagamento"
                                                                    >
                                                                        {updatingPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
