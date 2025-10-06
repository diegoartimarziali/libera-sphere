
"use client"

import { useState, useEffect } from "react";
import { db, storage, auth } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, isPast, format, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { hasFullAdminAccess } from "@/app/dashboard/layout";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Users, FileWarning, ShieldCheck, ShieldAlert, ShieldX, User, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";


interface UserProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    medicalInfo?: {
        expiryDate?: Timestamp;
        fileUrl?: string;
        fileName?: string;
    };
    certificateStatus: 'valid' | 'expiring' | 'expired' | 'missing';
    daysToExpire?: number;
}

interface UserData {
  name: string;
  email: string;
  role?: 'admin' | 'superAdmin' | 'user';
  [key: string]: any;
}

export default function AdminMedicalCertificatesPage() {
    const [user, loadingAuth] = useAuthState(auth);
    const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("surname")));

            const profilesList = usersSnapshot.docs.map(doc => {
                const data = doc.data();
                let certificateStatus: UserProfile['certificateStatus'] = 'missing';
                let daysToExpire: number | undefined;

                if (data.medicalInfo?.expiryDate) {
                    const expiry = data.medicalInfo.expiryDate.toDate();
                    const today = startOfDay(new Date());
                    const expiryDate = startOfDay(expiry);
                    const diff = differenceInDays(expiryDate, today);
                    daysToExpire = diff;

                    if (diff < 0) {
                        certificateStatus = 'expired';
                    } else if (diff <= 20) {
                        certificateStatus = 'expiring';
                    } else {
                        certificateStatus = 'valid';
                    }
                }

                return {
                    uid: doc.id,
                    name: data.name,
                    surname: data.surname,
                    email: data.email,
                    medicalInfo: data.medicalInfo,
                    certificateStatus,
                    daysToExpire,
                } as UserProfile;
            });

            setProfiles(profilesList);

        } catch (error) {
            console.error("Error fetching medical certificate data:", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare i dati dei certificati medici."
            });
        } finally {
            setLoading(false);
        }
    };


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
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const handleDeleteCertificate = async (profile: UserProfile) => {
        if (!profile.medicalInfo?.fileName) {
            toast({ variant: "destructive", title: "Errore", description: "Nome del file non trovato." });
            return;
        }

        try {
            // 1. Delete file from Storage
            const fileRef = ref(storage, `medical-certificates/${profile.uid}/${profile.medicalInfo.fileName}`);
            await deleteObject(fileRef);
            
            // 2. Remove info from Firestore user document and mark as invalid
            const userDocRef = doc(db, "users", profile.uid);
            await updateDoc(userDocRef, {
                medicalInfo: null,
                medicalCertificateSubmitted: false,
                medicalCertificateStatus: 'invalid'
            });

            toast({
                title: "Certificato Eliminato!",
                description: `Il certificato di ${profile.name} ${profile.surname} è stato rimosso. L'utente sarà notificato.`,
                variant: "success",
            });
            
            // 3. Refresh data
            await fetchData();

        } catch (error) {
            console.error("Error deleting certificate:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il certificato. Riprova." });
        }
    };
    
    const getStatusInfo = (profile: UserProfile): { variant: "success" | "warning" | "destructive" | "secondary", icon: React.ElementType, text: string } => {
        switch (profile.certificateStatus) {
            case 'valid':
                return { variant: 'success', icon: ShieldCheck, text: `Valido (scade tra ${profile.daysToExpire} giorni)` };
            case 'expiring':
                return { variant: 'warning', icon: ShieldAlert, text: `In scadenza (tra ${profile.daysToExpire} giorni)` };
            case 'expired':
                return { variant: 'destructive', icon: ShieldX, text: 'Scaduto' };
            case 'missing':
            default:
                return { variant: 'secondary', icon: FileWarning, text: 'Mancante' };
        }
    };

    const filteredProfiles = profiles.filter(profile => {
        const fullName = `${profile.name} ${profile.surname}`.toLowerCase();
        const email = profile.email.toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search);
    });

    return (
        <Card className="mx-2 sm:mx-4 lg:mx-6 p-3 sm:p-4 lg:p-6">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Gestione Certificati Medici</CardTitle>
                        <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1">
                            Monitora lo stato di tutti i certificati medici degli utenti e gestisci i file caricati.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
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
                            <p className="text-sm text-muted-foreground">Caricamento certificati...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Desktop Table - Hidden on mobile */}
                        <div className="hidden lg:block rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Utente</TableHead>
                                        <TableHead className="font-semibold">Stato Certificato</TableHead>
                                        <TableHead className="font-semibold">Data Scadenza</TableHead>
                                        <TableHead className="text-right font-semibold">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProfiles.length > 0 ? filteredProfiles.map(profile => {
                                        const statusInfo = getStatusInfo(profile);
                                        return (
                                            <TableRow key={profile.uid} className="hover:bg-muted/50">
                                                <TableCell className="py-4">
                                                    <div className="font-medium">{profile.name} {profile.surname}</div>
                                                    <div className="text-sm text-muted-foreground">{profile.email}</div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant={statusInfo.variant} className="gap-2">
                                                        <statusInfo.icon className="h-4 w-4" />
                                                        {statusInfo.text}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {profile.medicalInfo?.expiryDate ? format(profile.medicalInfo.expiryDate.toDate(), 'dd/MM/yyyy') : 'N/D'}
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    {profile.medicalInfo?.fileUrl ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={profile.medicalInfo.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        Visualizza
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                {hasFullAdminAccess(currentUserData as any) && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Elimina
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="w-[90vw] max-w-md" aria-describedby="dialog-desc-medcert">
                                                                        <AlertDialogDescription id="dialog-desc-medcert">
                                                                            Conferma o annulla la modifica del certificato medico.
                                                                        </AlertDialogDescription>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle className="text-base sm:text-lg">Sei sicuro?</AlertDialogTitle>
                                                                            <AlertDialogDescription className="text-sm">
                                                                                Questa azione è irreversibile. Il certificato di <strong className="mx-1">{profile.name} {profile.surname}</strong> sarà eliminato permanentemente. L'utente sarà invitato a caricarne uno nuovo.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                                                                            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteCertificate(profile)} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                                                                                Sì, elimina
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Nessuna azione</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-32">
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <Users className="mx-auto h-12 w-12" />
                                                    <h3 className="mt-4 text-lg font-semibold">Nessun Utente Trovato</h3>
                                                    <p className="mt-1 text-sm">Prova a modificare i filtri di ricerca.</p>
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
                                filteredProfiles.map(profile => {
                                    const statusInfo = getStatusInfo(profile);
                                    return (
                                        <Card key={profile.uid} className="p-4 shadow-sm border border-gray-200">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                        <h3 className="font-semibold text-base text-gray-900 truncate">
                                                            {profile.name} {profile.surname}
                                                        </h3>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-3 truncate">{profile.email}</p>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs text-gray-500 font-medium min-w-0 flex-shrink-0">Stato:</span>
                                                            <Badge variant={statusInfo.variant} className="gap-1 text-xs">
                                                                <statusInfo.icon className="h-3 w-3" />
                                                                <span className="truncate">{statusInfo.text}</span>
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 font-medium min-w-0 flex-shrink-0">Scadenza:</span>
                                                            <span className="text-xs text-gray-700 font-medium">
                                                                {profile.medicalInfo?.expiryDate ? format(profile.medicalInfo.expiryDate.toDate(), 'dd/MM/yyyy') : 'N/D'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col gap-1 flex-shrink-0">
                                                    {profile.medicalInfo?.fileUrl ? (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                asChild
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600 hover:text-blue-700"
                                                                title="Visualizza certificato"
                                                            >
                                                                <Link href={profile.medicalInfo.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Eye className="w-4 h-4" />
                                                                </Link>
                                                            </Button>
                                                            {hasFullAdminAccess(currentUserData as any) && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                                                                        title="Elimina certificato"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="w-[95vw] max-w-md mx-2" aria-describedby="dialog-desc-medcert-mobile">
                                                                    <AlertDialogDescription id="dialog-desc-medcert-mobile">
                                                                        Conferma o annulla la modifica del certificato medico.
                                                                    </AlertDialogDescription>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-base font-semibold">🗑️ Elimina Certificato</AlertDialogTitle>
                                                                        <AlertDialogDescription className="text-sm text-gray-600">
                                                                            Questa azione è irreversibile. Il certificato di <strong>{profile.name} {profile.surname}</strong> sarà eliminato permanentemente.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0">
                                                                        <AlertDialogCancel className="w-full h-11 font-medium">❌ Annulla</AlertDialogCancel>
                                                                        <AlertDialogAction 
                                                                            onClick={() => handleDeleteCertificate(profile)}
                                                                            className="w-full h-11 bg-red-600 hover:bg-red-700 font-medium"
                                                                        >
                                                                            🗑️ Sì, elimina
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground text-center py-2">
                                                            Nessuna azione
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            ) : (
                                <Card className="p-8 text-center">
                                    <div className="text-muted-foreground">
                                        <Users className="mx-auto h-12 w-12 mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Nessun Utente Trovato</h3>
                                        <p className="text-sm">Prova a modificare i filtri di ricerca.</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    

    