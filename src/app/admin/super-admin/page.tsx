"use client"

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isSuperAdmin } from "@/app/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Database, UserX, Settings, FileX, Trash2, AlertTriangle, Crown, Unlock, BarChart3 } from "lucide-react";
import Link from "next/link";
import AdminUserUnlocker from "@/components/admin/UserUnlocker";
import SubscriptionAnalyzer from "@/components/admin/SubscriptionAnalyzer";

interface UserData {
  name: string;
  email: string;
  role?: 'admin' | 'superAdmin' | 'user';
  regulationsAccepted: boolean;
  applicationSubmitted: boolean;
  medicalCertificateSubmitted: boolean;
  isFormerMember: 'yes' | 'no';
  [key: string]: any;
}

export default function SuperAdminPage() {
    const [user, loading] = useAuthState(auth);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [adminLoading, setAdminLoading] = useState(true);

    useEffect(() => {
        const checkSuperAdminStatus = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const fetchedUserData = docSnap.data() as UserData;
                        setUserData(fetchedUserData);
                    } else {
                        setUserData(null);
                    }
                } catch (error) {
                    console.error("Error checking super admin status:", error);
                    setUserData(null);
                }
            } else {
                setUserData(null);
            }
            setAdminLoading(false);
        };

        if (!loading) {
            checkSuperAdminStatus();
        }
    }, [user, loading]);

    if (loading || adminLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Caricamento...</div>
            </div>
        );
    }

    if (!user || !isSuperAdmin(userData)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Accesso Negato</h1>
                    <p>Solo i SuperAdmin possono accedere a questa sezione.</p>
                </div>
            </div>
        );
    }

    const superAdminFeatures = [
        {
            title: "Gestione Database",
            description: "Reset completo del database, migrazione dati, backup e ripristino",
            icon: Database,
            href: "/admin/calendar",
            features: ["Reset database calendario", "Migrazione eventi", "Backup automatici"]
        },
        {
            title: "Gestione Utenti Avanzata",
            description: "Eliminazione utenti, modifica ruoli, gestione permessi speciali",
            icon: UserX,
            href: "/admin/delete-users",
            features: ["Elimina utenti", "Modifica ruoli", "Gestione admin"]
        },
        {
            title: "Controllo Pagamenti",
            description: "Approvazione, rifiuto e gestione completa di tutti i pagamenti",
            icon: Settings,
            href: "/admin/payments",
            features: ["Approva pagamenti", "Rifiuta pagamenti", "Modifica importi", "Messaggi personalizzati"]
        },
        {
            title: "Gestione Premi e Awards",
            description: "Creazione, modifica ed eliminazione di tutti i premi e riconoscimenti",
            icon: Crown,
            href: "/admin/awards",
            features: ["Crea nuovi premi", "Modifica premi esistenti", "Elimina premi", "Assegna premi manualmente"]
        },
        {
            title: "Controllo Abbonamenti",
            description: "Gestione completa di piani, prezzi e configurazioni abbonamenti",
            icon: FileX,
            href: "/admin/subscriptions",
            features: ["Crea piani", "Modifica prezzi", "Elimina abbonamenti", "Configurazioni avanzate"]
        },
        {
            title: "Certificati Medici",
            description: "Eliminazione e gestione avanzata dei certificati medici",
            icon: Trash2,
            href: "/admin/medical-certificates",
            features: ["Elimina certificati", "Gestione scadenze", "Controlli avanzati"]
        }
    ];

    return (
        <div className="container mx-auto py-6">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">Pannello SuperAdmin</h1>
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        SUPER
                    </span>
                </div>
                <p className="text-muted-foreground text-lg">
                    Benvenuto nell'area riservata ai SuperAdmin. Qui hai accesso a tutte le funzionalità avanzate del sistema.
                </p>
            </div>

            {/* 🚨 SEZIONE EMERGENZA: Sblocco utenti con pending fantasma */}
            <div className="mb-8">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Unlock className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-red-800">🚨 Sblocco Utenti di Emergenza</CardTitle>
                                <CardDescription className="text-red-600">
                                    Gestisci utenti bloccati con abbonamenti pending senza pagamenti corrispondenti
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AdminUserUnlocker />
                    </CardContent>
                </Card>
            </div>

            {/* 📊 SEZIONE ANALISI: Abbonamenti utenti */}
            <div className="mb-8">
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-blue-800">📊 Analisi Abbonamenti Utenti</CardTitle>
                                <CardDescription className="text-blue-600">
                                    Verifica lo stato di tutti gli abbonamenti utenti e identifica problemi sistematici
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <SubscriptionAnalyzer />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {superAdminFeatures.map((feature, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                            </div>
                            <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="space-y-2">
                                {feature.features.map((feat, featIndex) => (
                                    <li key={featIndex} className="flex items-center gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            <Button asChild className="w-full">
                                <Link href={feature.href}>
                                    Accedi alle Funzionalità
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8 p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h3 className="text-lg font-semibold text-destructive">Attenzione - Funzionalità Avanzate</h3>
                </div>
                <p className="text-sm text-destructive/80">
                    Le funzionalità SuperAdmin includono operazioni irreversibili come eliminazioni di massa, 
                    reset del database e modifiche critiche. Procedi sempre con cautela e assicurati di avere 
                    backup aggiornati prima di eseguire operazioni distruttive.
                </p>
            </div>
        </div>
    );
}