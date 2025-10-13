"use client"

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/hooks/use-push-notification";
import { createUserAward } from "@/lib/createUserAward";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { calculateAssignedAwardResiduo } from '@/lib/calculateAssignedAwardResiduo';
import { useAttendances } from '@/hooks/use-attendances';
import { hasFullAdminAccess } from "@/lib/permissions";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Trash2, UserPlus, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipi e schema fuori dalla funzione
interface Award {
    id: string;
    name: string;
    value: number;
    residuo: number;
    used: boolean;
    usedValue: number;
}

interface AssignedAward {
    id: string;
    userId: string;
    userName: string;
    userSurname?: string;
    userGym?: string;
    userDiscipline?: string;
    name: string;
    value: number;
    residuo?: number;
    usedValue?: number;
    assignedAt?: any;
}

interface User {
    id: string;
    name: string;
    surname: string;
}

const awardFormSchema = z.object({
    name: z.string().min(1, "La selezione del tipo di premio è obbligatoria."),
    value: z.preprocess(
        (val) => Number(String(val).replace(',', '.')),
        z.number().nonnegative("Il valore non può essere negativo.")
    )
});

type AwardFormData = z.infer<typeof awardFormSchema>;

interface UserData {
  name: string;
  email: string;
  role?: 'admin' | 'superAdmin' | 'user';
  [key: string]: any;
}

export default function AdminAwardsPage() {
    const [user, loadingAuth] = useAuthState(auth);
    const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
    const { percentage, loading: attendancesLoading } = useAttendances();
    
    // Fetch current user data to check permissions
    useEffect(() => {
        const fetchCurrentUserData = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setCurrentUserData(docSnap.data() as UserData);
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

    useEffect(() => {
        fetchAwards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Funzione per assegnare il premio selezionato all'utente selezionato
    const handleAssignAward = async () => {
        if (!selectedAward || !selectedUserId) return;
        try {
            // Usa la nuova funzione con tutti i campi
            const { id, name, value } = selectedAward;
            await import('@/lib/userAwards').then(mod =>
                mod.createUserAward(selectedUserId, id, name, value)
            );
            toast({ title: "Premio assegnato!" });
            sendPushNotification("Hai ricevuto un nuovo premio!", `Tipo: ${name}, Valore: ${value}€`);
            // Toast per l'utente
            toast({
                variant: "success",
                title: "Premio assegnato!",
                description: `Hai ricevuto il premio ${name}, controlla i tuoi Premi.`
            });
            setIsAssignOpen(false);
            setSelectedUserId("");
            fetchAssignedAwards(); // Ricarica la lista dei premi assegnati
        } catch (error) {
            toast({ variant: "destructive", title: "Errore", description: "Impossibile assegnare il premio." });
        }
    };
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [awards, setAwards] = useState<Award[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Stato per form creazione/modifica premio
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<Award | null>(null);
    // Stato per assegnazione premi
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedAward, setSelectedAward] = useState<Award | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [users, setUsers] = useState<{id: string, name: string, surname?: string, discipline?: string, gym?: string}[]>([]);
    // Stati per premi assegnati
    const [assignedAwards, setAssignedAwards] = useState<AssignedAward[]>([]);
    const [loadingAssigned, setLoadingAssigned] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    // Funzione per aprire il dialog di assegnazione premio
    const openAssignDialog = (award: Award) => {
        setSelectedAward(award);
        setIsAssignOpen(true);
    };

    // Carica utenti per il select (esempio: collezione 'users')
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, "users"));
                setUsers(snap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    surname: doc.data().surname,
                    gym: doc.data().gym,
                    discipline: doc.data().discipline
                })));
            } catch (e) {
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli utenti." });
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [toast]);

    // Funzione per caricare i premi assegnati
    const fetchAssignedAwards = async () => {
        setLoadingAssigned(true);
        try {
            const assignedAwardsList: AssignedAward[] = [];
            
            // Carica tutti gli utenti
            const usersSnapshot = await getDocs(collection(db, "users"));
            
            // Per ogni utente, carica i suoi premi (dalla collezione userAwards)
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                
                const userAwardsSnapshot = await getDocs(collection(db, "users", userDoc.id, "userAwards"));
                
                userAwardsSnapshot.docs.forEach(awardDoc => {
                    const awardData = awardDoc.data();
                    assignedAwardsList.push({
                        id: awardDoc.id,
                        userId: userDoc.id,
                        userName: userData.name,
                        userSurname: userData.surname,
                        userGym: userData.gym,
                        userDiscipline: userData.discipline,
                        name: awardData.name,
                        value: awardData.value,
                        usedValue: awardData.usedValue ?? 0,
                        residuo: awardData.residuo ?? awardData.value,
                        assignedAt: awardData.assignedAt
                    });
                });
            }
            
            // Ordina per data di assegnazione (più recenti prima)
            assignedAwardsList.sort((a, b) => {
                if (!a.assignedAt) return 1;
                if (!b.assignedAt) return -1;
                return b.assignedAt.toMillis() - a.assignedAt.toMillis();
            });
            
            setAssignedAwards(assignedAwardsList);
        } catch (error) {
            console.error("Error fetching assigned awards:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i premi assegnati." });
        } finally {
            setLoadingAssigned(false);
        }
    };

    // Carica i premi assegnati al caricamento della pagina
    useEffect(() => {
        fetchAssignedAwards();
    }, []);

    // Funzioni per gestire l'espansione degli utenti
    const toggleUserExpansion = (userId: string) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUsers(newExpanded);
    };

    // Raggruppa i premi per utente
    const groupedAwards = assignedAwards.reduce((groups, award) => {
        const key = award.userId;
        if (!groups[key]) {
            groups[key] = {
                user: {
                    id: award.userId,
                    name: award.userName,
                    surname: award.userSurname,
                    gym: award.userGym,
                    discipline: award.userDiscipline
                },
                awards: []
            };
        }
        groups[key].awards.push(award);
        return groups;
    }, {} as Record<string, { user: { id: string, name: string, surname?: string, gym?: string, discipline?: string }, awards: AssignedAward[] }>);

    // Funzione per eliminare un premio assegnato
    const handleRemoveAssignedAward = async (assignedAward: AssignedAward) => {
        try {
            await deleteDoc(doc(db, "users", assignedAward.userId, "userAwards", assignedAward.id));
            toast({ title: "Successo", description: "Premio rimosso dall'utente con successo." });
            fetchAssignedAwards(); // Ricarica la lista
        } catch (error) {
            console.error("Error removing assigned award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Errore nella rimozione del premio." });
        }
    };

    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardFormSchema),
        defaultValues: { name: '', value: 0 }
    });
    
    const fetchAwards = async () => {
        try {
            const awardsSnapshot = await getDocs(query(collection(db, "awards"), orderBy("name")));
            const awardsList = awardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Award));
            setAwards(awardsList);
        } catch (error) {
            console.error("Error fetching awards:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i premi." });
        } finally {
            setLoading(false);
        }
    }
    
    const openCreateForm = () => {
        setEditingAward(null);
        form.reset({
            name: '',
            value: 0
        });
        setIsFormOpen(true);
    };

    const openEditForm = (award: Award) => {
        setEditingAward(award);
        form.reset({ 
            name: award.name,
            value: award.value,
        });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        setIsSubmitting(true);
        try {
            const awardData: Omit<Award, 'id'> = {
                name: data.name,
                value: data.value,
                residuo: data.value,
                used: false,
                usedValue: 0
            };

            if (editingAward) {
                const awardRef = doc(db, "awards", editingAward.id);
                await updateDoc(awardRef, awardData);
                toast({ title: "Premio aggiornato!" });
            } else {
                if (selectedUserId) {
                    await addDoc(collection(db, `users/${selectedUserId}/awards`), awardData);
                } else {
                    await addDoc(collection(db, "awards"), awardData);
                }
                toast({ title: "Premio creato!" });
            }

            await fetchAwards();
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare il premio." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleDeleteAward = async (awardId: string) => {
        try {
             await deleteDoc(doc(db, "awards", awardId));
             toast({ title: "Premio eliminato" });
             await fetchAwards();
        } catch (error) {
            console.error("Error deleting award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il premio." });
        }
    }
    
    return (
        <Card className="p-4 sm:p-6">
            <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                    <div>
                        <CardTitle className="text-lg sm:text-xl">Gestione Premi</CardTitle>
                        <CardDescription className="text-sm sm:text-base">Crea e gestisci i premi e i bonus che possono essere accumulati dagli atleti.</CardDescription>
                    </div>
                     <Button 
                        onClick={openCreateForm} 
                        disabled={!hasFullAdminAccess(currentUserData as any)}
                        className="w-full sm:w-auto"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> 
                        <span className="hidden sm:inline">Crea Premio</span>
                        <span className="sm:hidden">Nuovo</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                <Tabs defaultValue="disponibili" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-auto">
                        <TabsTrigger value="disponibili" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                            <span className="hidden sm:inline">Premi Disponibili</span>
                            <span className="sm:hidden">Disponibili</span>
                        </TabsTrigger>
                        <TabsTrigger value="assegnati" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                            <span className="hidden sm:inline">Premi Assegnati</span>
                            <span className="sm:hidden">Assegnati</span>
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="disponibili" className="mt-4 sm:mt-6">
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs sm:text-sm">Nome Premio</TableHead>
                                <TableHead className="text-xs sm:text-sm">Valore</TableHead>
                                <TableHead className="w-[120px] sm:w-[180px] text-right text-xs sm:text-sm">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : awards.length > 0 ? (
                                awards.map((award) => (
                                    <TableRow key={award.id}>
                                        <TableCell className={`font-bold text-xs sm:text-sm ${
                                            award.name === 'Premio Presenze' ? 'text-blue-600' :
                                            award.name === 'Bonus Inizio Percorso' ? 'text-orange-700' :
                                            award.name === 'Premio Best Samurai' ? 'text-black' :
                                            award.name === 'Premio Stage' ? 'text-green-700' : ''
                                        }`}>{award.name}</TableCell>
                                        <TableCell className="font-bold text-xs sm:text-sm">{award.value.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-1 sm:space-x-1">
                                            <Button 
                                                size="sm" 
                                                disabled={!hasFullAdminAccess(currentUserData as any)}
                                                onClick={() => openAssignDialog(award)}
                                                className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 p-1 sm:p-2 h-6 sm:h-8 w-6 sm:w-8"
                                                title="Assegna premio"
                                            >
                                                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                disabled={!hasFullAdminAccess(currentUserData as any)}
                                                onClick={() => openEditForm(award)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 p-1 sm:p-2 h-6 sm:h-8 w-6 sm:w-8"
                                                title="Modifica premio"
                                            >
                                                <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={!hasFullAdminAccess(currentUserData as any)} className="p-1 sm:p-2 h-6 sm:h-8 w-6 sm:w-8">
                                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Eliminare il premio <strong className="mx-1">{award.name}</strong>? L'azione è irreversibile.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteAward(award.id)}>
                                                            Sì, elimina
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            </div>
                                        </TableCell>
            {/* Dialog di assegnazione premio */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">Assegna Premio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4 py-4">
                        <label className="block font-medium mb-2 text-sm sm:text-base">Seleziona utente</label>
                        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                            <SelectTrigger className="bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Seleziona utente..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="text-black hover:bg-gray-50">
                                        {user.surname ? `${user.surname} ` : ''}{user.name}
                                        {user.gym ? ` - ${user.gym}` : ''}
                                        {user.discipline ? ` - ${user.discipline}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)} className="w-full sm:w-auto">Annulla</Button>
                        <Button type="button" onClick={handleAssignAward} disabled={!selectedUserId} className="w-full sm:w-auto">Assegna</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nessun premio trovato. Creane uno per iniziare.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                    </TabsContent>
                    
                    <TabsContent value="assegnati" className="mt-4 sm:mt-6">
                        <div className="rounded-md border overflow-x-auto">
                            <div className="flex justify-end mb-2">
                                <Button
                                    variant="ghost"
                                    onClick={fetchAssignedAwards}
                                    disabled={!hasFullAdminAccess(currentUserData as any)}
                                    className="p-1 sm:p-2 bg-transparent border-none shadow-none hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Aggiorna premi assegnati"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7 text-primary drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0021 7M19 5A9 9 0 003 17" />
                                    </svg>
                                </Button>
                            </div>
                            {loadingAssigned ? (
                                <div className="flex justify-center items-center h-32">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    <span className="ml-2">Caricamento premi assegnati...</span>
                                </div>
                            ) : Object.keys(groupedAwards).length === 0 ? (
                                <div className="text-center h-32 flex items-center justify-center text-muted-foreground">
                                    Nessun premio assegnato ancora.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {Object.values(groupedAwards).map(({ user, awards }) => {
                                        const isExpanded = expandedUsers.has(user.id);
                                        const totalValue = awards.reduce((sum, award) => sum + award.value, 0);
                                        const totalResidue = awards.reduce((sum, award) => {
                                            const residuo = award.name === 'Premio Presenze' && !attendancesLoading
                                                ? calculateAssignedAwardResiduo(award, percentage)
                                                : award.residuo ?? award.value;
                                            return sum + residuo;
                                        }, 0);
                                        
                                        return (
                                            <Collapsible key={user.id} open={isExpanded} onOpenChange={() => toggleUserExpansion(user.id)}>
                                                <CollapsibleTrigger asChild>
                                                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 cursor-pointer transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                            <div>
                                                                <div className="font-semibold text-sm sm:text-base">
                                                                    {user.name} {user.surname}
                                                                </div>
                                                                <div className="text-xs sm:text-sm text-muted-foreground">
                                                                    {user.gym && <span>{user.gym}</span>}
                                                                    {user.discipline && <span className="ml-2">{user.discipline}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs sm:text-sm font-medium">
                                                                {awards.length} {awards.length === 1 ? 'premio' : 'premi'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Totale: €{totalValue.toFixed(2)} | Residuo: €{totalResidue.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="mt-2">
                                                    <div className="bg-white rounded-lg border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="text-xs sm:text-sm">Premio</TableHead>
                                                                    <TableHead className="text-xs sm:text-sm">Valore</TableHead>
                                                                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Utilizzato</TableHead>
                                                                    <TableHead className="text-xs sm:text-sm">Residuo</TableHead>
                                                                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Data</TableHead>
                                                                    <TableHead className="text-right text-xs sm:text-sm">Azioni</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {awards.map((award) => (
                                                                    <TableRow key={award.id}>
                                                                        <TableCell className={`font-bold text-xs sm:text-sm ${
                                                                            award.name === 'Premio Presenze' ? 'text-blue-600' :
                                                                            award.name === 'Bonus Inizio Percorso' ? 'text-orange-700' :
                                                                            award.name === 'Premio Best Samurai' ? 'text-black' :
                                                                            award.name === 'Premio Stage' ? 'text-green-700' : ''
                                                                        }`}>{award.name}</TableCell>
                                                                        <TableCell className="text-xs sm:text-sm">€{award.value}</TableCell>
                                                                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">€{award.usedValue?.toFixed(2) ?? "0.00"}</TableCell>
                                                                        <TableCell className="text-xs sm:text-sm">
                                                                            €{award.name === 'Premio Presenze' && !attendancesLoading
                                                                                ? calculateAssignedAwardResiduo(award, percentage).toFixed(2)
                                                                                : award.residuo?.toFixed(2) ?? award.value.toFixed(2)}
                                                                        </TableCell>
                                                                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                                                                            {award.assignedAt ? 
                                                                                new Date(award.assignedAt.toDate()).toLocaleDateString('it-IT') : 
                                                                                "-"
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        disabled={!hasFullAdminAccess(currentUserData as any)}
                                                                                        className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-1 sm:p-2 h-6 sm:h-8 w-6 sm:w-8"
                                                                                        title="Elimina premio assegnato"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                                    </Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                                                                        <AlertDialogDescription>
                                                                                            Sei sicuro di voler rimuovere il premio "{award.name}" da {award.userName} {award.userSurname}? Questa azione non può essere annullata.
                                                                                        </AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                                        <AlertDialogAction
                                                                                            onClick={() => handleRemoveAssignedAward(award)}
                                                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                                                        >
                                                                                            Elimina
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="bg-card w-[95vw] max-w-md">
                    {/* DialogHeader e DialogTitle personalizzato, nessun titolo generico */}
                    {/* DialogTitle nascosto per accessibilità */}
                    <DialogTitle style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(1px, 1px, 1px, 1px)" }}>
                        {editingAward ? `Modifica Premio` : `Crea Nuovo Premio`}
                    </DialogTitle>
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <h2 className="text-base sm:text-lg font-semibold leading-none tracking-tight text-background">{editingAward ? `Modifica Premio` : `Crea Nuovo Premio`}</h2>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveAward)} className="space-y-3 sm:space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-background text-sm sm:text-base">Tipo di Premio</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white border border-black text-black">
                                                <SelectValue placeholder="Seleziona un tipo di premio..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Bonus Inizio Percorso">Bonus Inizio Percorso</SelectItem>
                                            <SelectItem value="Premio Best Samurai">Premio Best Samurai</SelectItem>
                                            <SelectItem value="Premio Kata">Premio Kata</SelectItem>
                                            <SelectItem value="Premio Kumite">Premio Kumite</SelectItem>
                                            <SelectItem value="Premio Stage">Premio Stage</SelectItem>
                                            <SelectItem value="Premio Presenze">Premio Presenze</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                             <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-background text-sm sm:text-base">Valore del Premio (€)</FormLabel>
                                     <FormControl>
                                        <Input type="number" step="0.01" placeholder="Es. 50.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="bg-transparent text-background border border-background w-full sm:w-auto">Annulla</Button>
                                <Button type="submit" disabled={isSubmitting} className="text-green-600 border border-green-600 w-full sm:w-auto">
                                     {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                     Salva Premio
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}


