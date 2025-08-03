
"use client"

import { useEffect, useState, ReactNode, useCallback } from "react"
import Link from "next/link"
import { usePathname, redirect, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { isPast, startOfDay } from "date-fns"


import { Loader2, UserSquare, HeartPulse, CreditCard, LogOut, Menu, UserPlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface UserData {
  name: string
  email: string
  regulationsAccepted: boolean
  applicationSubmitted: boolean
  medicalCertificateSubmitted: boolean
  associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
  trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
  trialExpiryDate?: Timestamp;
  // Aggiungiamo altri campi opzionali per evitare errori di tipo
  [key: string]: any;
}

// =================================================================
// COMPONENTI DI NAVIGAZIONE (UNIFICATI)
// =================================================================

function NavLink({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon: React.ElementType }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
            )}
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    );
}

function NavigationLinks({ userData }: { userData: UserData | null }) {
    if (!userData) return null;

    const isOperational = userData.associationStatus === 'active';
    const showAssociationLink = userData.trialStatus === 'completed' && userData.associationStatus !== 'active' && userData.associationStatus !== 'pending';

    return (
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <NavLink href="/dashboard" icon={UserSquare}>Scheda Personale</NavLink>
            <NavLink href="/dashboard/medical-certificate" icon={HeartPulse}>Certificato Medico</NavLink>
            <NavLink href="/dashboard/payments" icon={CreditCard}>I Miei Pagamenti</NavLink>

            {showAssociationLink && (
                 <NavLink href="/dashboard/associates" icon={UserPlus}>Diventa Socio</NavLink>
            )}

            {isOperational && (
                <>
                    <NavLink href="/dashboard/subscriptions" icon={CreditCard}>Abbonamenti</NavLink>
                    <NavLink href="/dashboard/stages" icon={Sparkles}>Stages</NavLink>
                </>
            )}
        </nav>
    );
}

// =================================================================
// COMPONENTI DI LAYOUT (UNIFICATI E CORRETTI)
// =================================================================

function DesktopSidebar({ userData }: { userData: UserData | null }) {
     return (
        <aside className="hidden border-r bg-muted/40 md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                         <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-6 w-6"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                          <path d="M12 12L16 8"></path>
                          <path d="M12 6v6l4 2"></path>
                        </svg>
                        <span className="">LiberaSphere</span>
                    </Link>
                </div>
                <div className="flex-1">
                    <NavigationLinks userData={userData} />
                </div>
            </div>
        </aside>
     )
}

function DashboardHeader({ 
    onLogout, 
    userData, 
    showMenuButtonOnDesktop = false 
}: { 
    onLogout: () => void, 
    userData: UserData | null, 
    showMenuButtonOnDesktop?: boolean 
}) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
             <Sheet>
                <SheetTrigger asChild>
                    {/* CORREZIONE: Il bottone è nascosto su desktop solo se showMenuButtonOnDesktop è false */}
                    <Button size="icon" variant="outline" className={cn(!showMenuButtonOnDesktop && "sm:hidden")}>
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Apri menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs">
                     <nav className="grid gap-6 text-lg font-medium">
                         <Link
                            href="/dashboard"
                            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                          >
                           <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5 transition-all group-hover:scale-110"
                            >
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                              <path d="M12 12L16 8"></path>
                              <path d="M12 6v6l4 2"></path>
                            </svg>
                            <span className="sr-only">LiberaSphere</span>
                        </Link>
                        <NavigationLinks userData={userData} />
                    </nav>
                </SheetContent>
            </Sheet>

            <div className="ml-auto flex items-center gap-4">
                <Button variant="outline" onClick={onLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="uppercase font-bold">Log out</span>
                </Button>
            </div>
        </header>
    );
}

// =================================================================
// LAYOUT PRINCIPALE (LOGICA RICOSTRUITA E SEMPLIFICATA)
// =================================================================

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loadingAuth] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = useCallback(async () => {
      try {
          await signOut(auth);
          router.push('/');
          toast({ title: "Logout effettuato", description: "Sei stato disconnesso con successo." });
      } catch (error) {
          console.error("Error during logout:", error);
          toast({ variant: "destructive", title: "Errore di logout", description: "Impossibile disconnettersi. Riprova." });
      }
  }, [router, toast]);
  
  useEffect(() => {
    const fetchAndRedirect = async () => {
        if (!user) {
            redirect("/");
            return;
        }
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            let userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                let fetchedUserData = userDocSnap.data() as UserData;

                if (
                    fetchedUserData.trialStatus === 'active' &&
                    fetchedUserData.trialExpiryDate &&
                    isPast(startOfDay(fetchedUserData.trialExpiryDate.toDate()))
                ) {
                    await updateDoc(userDocRef, { trialStatus: 'completed' });
                    userDocSnap = await getDoc(userDocRef); // Re-fetch data
                    fetchedUserData = userDocSnap.data() as UserData;
                    toast({ title: "Periodo di prova terminato", description: "Puoi ora procedere con l'associazione." });
                }
                
                setUserData(fetchedUserData);
                
                // === NUOVA LOGICA DI REINDIRIZZAMENTO ONBOARDING ===
                const isUserWaiting = 
                    fetchedUserData.associationStatus === 'pending' || 
                    fetchedUserData.trialStatus === 'pending_payment';

                if (isUserWaiting || fetchedUserData.associationStatus === 'active') {
                    return; 
                }

                let targetPage = "";
                if (!fetchedUserData.regulationsAccepted) {
                    targetPage = "/dashboard/regulations";
                } else if (!fetchedUserData.medicalCertificateSubmitted) {
                    targetPage = "/dashboard/medical-certificate";
                } else if (typeof fetchedUserData.isFormerMember !== 'string' || fetchedUserData.isFormerMember === "") {
                    targetPage = "/dashboard/liberasphere";
                } else if (fetchedUserData.isFormerMember === 'yes') {
                    targetPage = "/dashboard/associates";
                } else if (fetchedUserData.isFormerMember === 'no') {
                    targetPage = "/dashboard/class-selection";
                }
                
                if (targetPage && pathname !== targetPage) {
                    router.push(targetPage);
                }

            } else {
                toast({ variant: "destructive", title: "Errore Critico", description: "Profilo utente non trovato. Eseguo il logout." });
                await handleLogout();
            }
        } catch (error) {
            console.error("Errore nel caricamento dati:", error);
            toast({ title: "Errore di Caricamento", description: "Impossibile caricare i dati. Riprova.", variant: "destructive" });
        } finally {
            setLoadingData(false);
        }
    };
    
    if (!loadingAuth && user) {
        fetchAndRedirect();
    } else if (!loadingAuth && !user) {
         redirect("/");
    }

  }, [user, loadingAuth, pathname, router, toast, handleLogout]);

  if (loadingAuth || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!user || !userData) {
      return null; // Should be redirected
  }

  // === LOGICA DI VISUALIZZAZIONE SEMPLIFICATA ===
  
  const onboardingPages = [
    '/dashboard/regulations',
    '/dashboard/liberasphere',
    '/dashboard/associates',
    '/dashboard/class-selection',
  ];
  const isOnboardingFlow = onboardingPages.includes(pathname);

  if (isOnboardingFlow) {
      return (
         <div className="flex min-h-screen w-full flex-col bg-background">
             <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-4 border-b bg-background px-4 md:px-6">
                 <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="uppercase font-bold">Log out</span>
                </Button>
             </header>
             <main className="flex-1 p-4 md:p-8">{children}</main>
         </div>
      )
  }
  
  const isOperational = userData.associationStatus === 'active';

  if (isOperational) {
      return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <DesktopSidebar userData={userData} />
            <div className="flex flex-col">
                <DashboardHeader onLogout={handleLogout} userData={userData} showMenuButtonOnDesktop={false} />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
      )
  }

  // Layout Semplificato (per utenti in attesa, etc.)
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <DashboardHeader onLogout={handleLogout} userData={userData} showMenuButtonOnDesktop={true} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}

    