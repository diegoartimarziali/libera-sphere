"use client"

import { useState, useEffect } from "react"
import { db, auth, storage } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { collection, getDocs, query, orderBy, collectionGroup, where, doc, writeBatch, Timestamp, getDoc, updateDoc } from "firebase/firestore"
import { ref, deleteObject, listAll } from "firebase/storage"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Trash2, AlertTriangle, ShieldPlus } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface UserProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    role?: 'admin' | 'user';
    regulationsAccepted?: boolean;
    createdAt?: Timestamp;
    lastLoginAt?: Timestamp;
}

export default function DeleteAdminUsersPage() {
    const [user] = useAuthState(auth);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchUsers = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Get current user role
            const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
            if (currentUserDoc.exists()) {
                setCurrentUserRole(currentUserDoc.data().role);
            }

            // Fetch only users who have accepted regulations
            const usersRef = collection(db, 'users');
            const usersQuery = query(usersRef, orderBy('name'));
            const usersSnapshot = await getDocs(usersQuery);

            const usersList = usersSnapshot.docs
                .map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                } as UserProfile))
                .filter(user => user.regulationsAccepted === true); // Solo utenti che hanno accettato i regolamenti

            setProfiles(usersList);

        } catch (error) {
            console.error("Error fetching users: ", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare gli utenti."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMakeAdmin = async (profileToUpdate: UserProfile) => {
        try {
            const userDocRef = doc(db, "users", profileToUpdate.uid);
            await updateDoc(userDocRef, { role: 'admin' });

            toast({
                title: "Utente promosso ad Admin",
                description: `${profileToUpdate.name} ${profileToUpdate.surname} è ora un amministratore.`,
                variant: "default",
                duration: 5000,
            });

            // Refresh the users list
            await fetchUsers();

        } catch (error) {
            console.error("Error making user admin:", error);
            toast({
                variant: "destructive",
                title: "Errore Promozione",
                description: `Impossibile rendere admin l'utente. Dettagli: ${error instanceof Error ? error.message : 'Sconosciuto'}`
            });
        }
    };

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

            // 3. Delete userAwards subcollection
            const userAwardsRef = collection(db, "users", profileToDelete.uid, "userAwards");
            const userAwardsSnapshot = await getDocs(userAwardsRef);
            userAwardsSnapshot.forEach(doc => batch.delete(doc.ref));

            // 4. Delete attendances
            const attendancesRef = collection(db, "attendances");
            const attendancesQuery = query(attendancesRef, where("userId", "==", profileToDelete.uid));
            const attendancesSnapshot = await getDocs(attendancesQuery);
            attendancesSnapshot.forEach(doc => batch.delete(doc.ref));

            // 5. Delete files from Storage
            const userStorageRef = ref(storage, `medical-certificates/${profileToDelete.uid}`);
            try {
                const filesList = await listAll(userStorageRef);
                await Promise.all(filesList.items.map(fileRef => deleteObject(fileRef)));
            } catch (storageError) {
                console.log("No files to delete in storage or error accessing storage:", storageError);
            }

            // Commit all batched writes to Firestore
            await batch.commit();

            toast({
                title: "Utente Eliminato Completamente",
                description: `${profileToDelete.name} ${profileToDelete.surname} e tutti i suoi dati sono stati rimossi definitivamente. RICORDA: L'account di autenticazione Firebase (email/password) deve essere eliminato manualmente dalla Console Firebase.`,
                variant: "default",
                duration: 10000,
            });

            // Refresh the users list
            await fetchUsers();

        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                variant: "destructive",
                title: "Errore Eliminazione",
                description: `Impossibile eliminare l'utente. Dettagli: ${error instanceof Error ? error.message : 'Sconosciuto'}`
            });
        }
    };

    useEffect(() => {
        if (user) {
            fetchUsers();
        }
    }, [user]);

    // Filter users based on search term
    const filteredProfiles = profiles.filter(profile => {
        const fullName = `${profile.name} ${profile.surname}`.toLowerCase();
        const email = profile.email.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    });

    if (currentUserRole !== 'admin') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Accesso negato. Solo gli amministratori possono accedere a questa sezione.</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <ShieldPlus className="h-6 w-6 text-blue-600" />
                        Gestione Utenti: Elimina/Admin
                    </CardTitle>
                    <CardDescription>
                        Gestisci gli utenti che hanno accettato i regolamenti: puoi <strong className="text-blue-600">promuoverli ad amministratori</strong> o <strong className="text-destructive">eliminarli completamente</strong>. Vengono mostrati solo utenti che hanno accettato i regolamenti. L'eliminazione rimuove tutti i dati dell'utente (pagamenti, presenze, certificati, premi) tranne eventuali commenti pubblici. L'account di autenticazione Firebase deve essere eliminato manualmente dalla Console.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cerca per nome o email..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome Completo</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Ruolo</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProfiles.length > 0 ? filteredProfiles.map(profile => (
                                        <TableRow key={profile.uid}>
                                            <TableCell className="font-medium">
                                                {profile.name} {profile.surname}
                                            </TableCell>
                                            <TableCell>{profile.email}</TableCell>
                                            <TableCell>
                                                {profile.role === 'admin' && (
                                                    <span className="text-blue-600 font-semibold">Admin</span>
                                                )}
                                                {profile.role === 'user' && (
                                                    <Badge variant="secondary">Utente</Badge>
                                                )}
                                                {!profile.role && (
                                                    <span className="text-black">Utente</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {profile.uid !== user?.uid && (
                                                    <div className="flex gap-2 justify-end">
                                                        {profile.role !== 'admin' && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={() => handleMakeAdmin(profile)}
                                                                className="bg-transparent text-blue-600 hover:bg-transparent p-2"
                                                            >
                                                                <ShieldPlus className="h-7 w-7 text-blue-600" />
                                                            </Button>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon"
                                                                    className="bg-transparent hover:bg-transparent p-2"
                                                                >
                                                                    <Trash2 className="h-6 w-6 text-destructive" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-destructive">
                                                                    ⚠️ ELIMINAZIONE DEFINITIVA
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Stai per eliminare <strong>{profile.name} {profile.surname}</strong> e TUTTI i suoi dati:
                                                                    <br/><br/>
                                                                    <strong>Verranno eliminati:</strong>
                                                                    <ul className="list-disc ml-6 mt-2">
                                                                        <li>Profilo utente</li>
                                                                        <li>Storico pagamenti</li>
                                                                        <li>Presenze registrate</li>
                                                                        <li>Certificati medici</li>
                                                                        <li>Premi assegnati</li>
                                                                        <li>File caricati</li>
                                                                    </ul>
                                                                    <br/>
                                                                    <strong>NON verranno eliminati:</strong>
                                                                    <ul className="list-disc ml-6">
                                                                        <li>Eventuali commenti pubblici</li>
                                                                        <li>Account Firebase (da eliminare manualmente)</li>
                                                                    </ul>
                                                                    <br/>
                                                                    <strong className="text-destructive">QUESTA AZIONE È IRREVERSIBILE!</strong>
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={() => handleDeleteUser(profile)}
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                >
                                                                    Sì, ELIMINA TUTTO
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                                {profile.uid === user?.uid && (
                                                    <span className="text-muted-foreground text-sm">
                                                        (Tu stesso)
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">
                                                Nessun utente trovato che abbia accettato i regolamenti.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}