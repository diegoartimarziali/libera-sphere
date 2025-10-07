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

    if (currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Accesso negato. Solo gli amministratori possono accedere a questa sezione.</div>
            </div>
        );
    }

    return (
        <div className="px-2 py-4 sm:px-4 sm:py-6 lg:px-6">
            <Card className="mx-auto max-w-7xl">
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-blue-100 rounded-xl flex items-center justify-center">
                                    <div className="flex">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <ShieldPlus className="h-4 w-4 text-blue-600 -ml-1" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
                                    Gestione Utenti: Elimina/Admin
                                </CardTitle>
                            </div>
                        </div>
                        <CardDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Gestisci gli utenti che hanno accettato i regolamenti: puoi <strong className="text-blue-600">promuoverli ad amministratori</strong> o <strong className="text-destructive">eliminarli completamente</strong>.<br className="hidden sm:block" />
                            <span className="block sm:inline mt-2 sm:mt-0">Vengono mostrati solo utenti che hanno accettato i regolamenti.</span>
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="mb-6">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cerca per nome o email..."
                                className="pl-10 pr-4 h-11 text-base border-2 focus:border-blue-500 rounded-lg"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">Caricamento utenti...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Desktop Table - Hidden on mobile */}
                            <div className="hidden lg:block border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-semibold">Nome Completo</TableHead>
                                            <TableHead className="font-semibold">Email</TableHead>
                                            <TableHead className="font-semibold">Ruolo</TableHead>
                                            <TableHead className="text-right font-semibold">Azioni</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProfiles.length > 0 ? filteredProfiles.map(profile => (
                                            <TableRow key={profile.uid} className="hover:bg-muted/50">
                                                <TableCell className="font-medium py-4">
                                                    {profile.name} {profile.surname}
                                                </TableCell>
                                                <TableCell className="py-4">{profile.email}</TableCell>
                                                <TableCell className="py-4">
                                                    {profile.role === 'admin' && (
                                                        <Badge variant="default" className="bg-blue-600">🛡️ Admin</Badge>
                                                    )}
                                                    {profile.role === 'user' && (
                                                        <Badge variant="secondary">👤 Utente</Badge>
                                                    )}
                                                    {!profile.role && (
                                                        <Badge variant="outline">👤 Utente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    {profile.uid !== user?.uid ? (
                                                        <div className="flex gap-1 justify-end">
                                                            {profile.role !== 'admin' && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon"
                                                                    onClick={() => handleMakeAdmin(profile)}
                                                                    className="h-8 w-8 hover:bg-blue-100 text-blue-600"
                                                                    title="Promuovi ad Admin"
                                                                >
                                                                    <ShieldPlus className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon"
                                                                        className="h-8 w-8 hover:bg-red-100 text-red-600"
                                                                        title="Elimina utente"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-destructive text-lg">
                                                                            ⚠️ ELIMINAZIONE DEFINITIVA
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription className="text-sm space-y-3">
                                                                            <p>Stai per eliminare <strong>{profile.name} {profile.surname}</strong> e TUTTI i suoi dati:</p>
                                                                            
                                                                            <div>
                                                                                <strong className="text-green-700">✅ Verranno eliminati:</strong>
                                                                                <ul className="list-disc ml-6 mt-2 space-y-1">
                                                                                    <li>Profilo utente</li>
                                                                                    <li>Storico pagamenti</li>
                                                                                    <li>Presenze registrate</li>
                                                                                    <li>Certificati medici</li>
                                                                                    <li>Premi assegnati</li>
                                                                                    <li>File caricati</li>
                                                                                </ul>
                                                                            </div>
                                                                            
                                                                            <div>
                                                                                <strong className="text-orange-600">❌ NON verranno eliminati:</strong>
                                                                                <ul className="list-disc ml-6 mt-2 space-y-1">
                                                                                    <li>Eventuali commenti pubblici</li>
                                                                                    <li>Account Firebase (da eliminare manualmente)</li>
                                                                                </ul>
                                                                            </div>
                                                                            
                                                                            <p className="font-bold text-destructive bg-red-50 p-2 rounded border-l-4 border-red-500">
                                                                                🚨 QUESTA AZIONE È IRREVERSIBILE!
                                                                            </p>
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                                                                        <AlertDialogCancel className="w-full sm:w-auto">❌ Annulla</AlertDialogCancel>
                                                                        <AlertDialogAction 
                                                                            onClick={() => handleDeleteUser(profile)}
                                                                            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                                                                        >
                                                                            🗑️ Sì, ELIMINA TUTTO
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm font-medium">
                                                            👤 (Tu stesso)
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-32">
                                                    <div className="text-muted-foreground">
                                                        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                                                        <h3 className="text-lg font-semibold mb-2">Nessun Utente Trovato</h3>
                                                        <p className="text-sm">Nessun utente ha accettato i regolamenti o corrisponde alla ricerca.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards - Visible on mobile and tablet */}
                            <div className="lg:hidden space-y-3">
                                {filteredProfiles.length > 0 ? (
                                    filteredProfiles.map(profile => (
                                        <Card key={profile.uid} className="p-4 shadow-sm border border-gray-200">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            {profile.role === 'admin' ? '🛡️' : '👤'}
                                                        </div>
                                                        <h3 className="font-semibold text-base text-gray-900 truncate">
                                                            {profile.name} {profile.surname}
                                                        </h3>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-3 truncate">{profile.email}</p>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 font-medium">Ruolo:</span>
                                                        {profile.role === 'admin' && (
                                                            <Badge variant="default" className="bg-blue-600 text-xs">🛡️ Admin</Badge>
                                                        )}
                                                        {profile.role === 'user' && (
                                                            <Badge variant="secondary" className="text-xs">👤 Utente</Badge>
                                                        )}
                                                        {!profile.role && (
                                                            <Badge variant="outline" className="text-xs">👤 Utente</Badge>
                                                        )}
                                                    </div>
                                                    
                                                    {profile.uid === user?.uid && (
                                                        <div className="mt-2">
                                                            <Badge variant="outline" className="text-xs">
                                                                👤 (Tu stesso)
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {profile.uid !== user?.uid && (
                                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                                        {profile.role !== 'admin' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => handleMakeAdmin(profile)}
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                                                                title="Promuovi ad Admin"
                                                            >
                                                                <ShieldPlus className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                                                                    title="Elimina utente"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="w-[95vw] max-w-md mx-2 max-h-[90vh] overflow-y-auto">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-destructive text-base">
                                                                        ⚠️ ELIMINAZIONE DEFINITIVA
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-sm space-y-3">
                                                                        <p className="font-medium">Eliminerai <strong>{profile.name} {profile.surname}</strong> e TUTTI i suoi dati.</p>
                                                                        
                                                                        <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                                                                            <p className="font-medium text-green-800 mb-2">✅ Verranno eliminati:</p>
                                                                            <ul className="text-xs text-green-700 space-y-1">
                                                                                <li>• Profilo utente</li>
                                                                                <li>• Storico pagamenti</li>
                                                                                <li>• Presenze registrate</li>
                                                                                <li>• Certificati medici</li>
                                                                                <li>• Premi assegnati</li>
                                                                                <li>• File caricati</li>
                                                                            </ul>
                                                                        </div>
                                                                        
                                                                        <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                                                                            <p className="font-bold text-red-800">🚨 AZIONE IRREVERSIBILE!</p>
                                                                        </div>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="flex flex-col gap-2">
                                                                    <AlertDialogCancel className="w-full h-11 font-medium">❌ Annulla</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleDeleteUser(profile)}
                                                                        className="w-full h-11 bg-destructive hover:bg-destructive/90 font-medium"
                                                                    >
                                                                        🗑️ Sì, ELIMINA TUTTO
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <Card className="p-8 text-center">
                                        <div className="text-muted-foreground">
                                            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">Nessun Utente Trovato</h3>
                                            <p className="text-sm">Nessun utente ha accettato i regolamenti o corrisponde alla ricerca.</p>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}