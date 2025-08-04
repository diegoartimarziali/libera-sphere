
"use client"

import { useEffect, useState, ReactNode, useCallback } from "react"
import Link from "next/link"
import { usePathname, redirect, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { isPast, startOfDay } from "date-fns"


import { Loader2, UserSquare, HeartPulse, CreditCard, LogOut, Menu, UserPlus, Sparkles, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface UserData {
  name: string
  email: string
  role?: 'admin' | 'user';
  regulationsAccepted: boolean
  applicationSubmitted: boolean
  medicalCertificateSubmitted: boolean
  associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
  associationExpiryDate?: Timestamp;
  trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
  trialExpiryDate?: Timestamp;
  trialOutcome?: 'declined' | 'accepted';
  isFormerMember: 'yes' | 'no';
  isInsured?: boolean;
  subscriptionAccessStatus?: 'pending' | 'active' | 'expired';
  activeSubscription?: {
      subscriptionId: string;
      name: string;
      type: 'monthly' | 'seasonal';
      purchasedAt: Timestamp;
      expiresAt?: Timestamp;
  };
  [key: string]: any;
}

// =================================================================
// COMPONENTI DI NAVIGAZIONE
// =================================================================

function NavLink({ href, children, icon: Icon, onClick }: { href: string; children: React.ReactNode; icon: React.ElementType, onClick?: () => void }) {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) {
            onClick();
        }
    };
    
    return (
        <SheetClose asChild>
            <Link
                href={href}
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                )}
            >
                <Icon className="h-4 w-4" />
                {children}
            </Link>
        </SheetClose>
    );
}

function NavigationLinks({ userData, onLinkClick }: { userData: UserData | null, onLinkClick: () => void }) {
    if (!userData) return null;

    const isOperational = userData.associationStatus === 'active';
    const isReadyForAssociation = 
        (userData.isFormerMember === 'yes' || userData.trialStatus === 'completed') &&
        userData.associationStatus !== 'active' &&
        userData.associationStatus !== 'pending';


    return (
        <>
            <NavLink href="/dashboard" icon={UserSquare} onClick={onLinkClick}>Scheda Personale</NavLink>
            <NavLink href="/dashboard/medical-certificate" icon={HeartPulse} onClick={onLinkClick}>Certificato Medico</NavLink>
            <NavLink href="/dashboard/payments" icon={CreditCard} onClick={onLinkClick}>I Miei Pagamenti</NavLink>

            {isReadyForAssociation && (
                 <NavLink href="/dashboard/associates" icon={UserPlus} onClick={onLinkClick}>Diventa Socio</NavLink>
            )}

            {isOperational && (
                <>
                    <NavLink href="/dashboard/subscriptions" icon={CreditCard} onClick={onLinkClick}>Abbonamenti</NavLink>
                    <NavLink href="/dashboard/stages" icon={Sparkles} onClick={onLinkClick}>Stages</NavLink>
                </>
            )}
            
            {userData.role === 'admin' && (
                <>
                    <Separator className="my-2" />
                    <NavLink href="/admin" icon={Shield} onClick={onLinkClick}>Pannello Admin</NavLink>
                </>
            )}
        </>
    );
}

// =================================================================
// HEADER UNIFICATO
// =================================================================

function DashboardHeader({ onLogout, userData, showMenu }: { onLogout: () => void; userData: UserData | null, showMenu: boolean }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
             {showMenu && (
                 <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline">
                            <Menu className="h-5 w-5" />
                            <span className="ml-2 font-semibold">MENU</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="sm:max-w-xs">
                        <SheetHeader>
                            <SheetTitle className="sr-only">Menu Principale</SheetTitle>
                        </SheetHeader>
                         <nav className="grid gap-6 text-lg font-medium">
                             <SheetClose asChild>
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
                             </SheetClose>
                            <NavigationLinks userData={userData} onLinkClick={() => setIsMenuOpen(false)} />
                        </nav>
                    </SheetContent>
                </Sheet>
             )}

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
// LAYOUT PRINCIPALE
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
        
        setLoadingData(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            let userDocSnap = await getDoc(userDocRef);
            let userModified = false;

            if (userDocSnap.exists()) {
                let fetchedUserData = userDocSnap.data() as UserData;
                
                // ================== FORZATURA PER TEST ==================
                const isTestMode = true; // Imposta a true per attivare la forzatura
                if (isTestMode) {
                    fetchedUserData.associationStatus = 'active';
                    fetchedUserData.subscriptionAccessStatus = 'expired';
                    fetchedUserData.regulationsAccepted = true;
                    fetchedUserData.medicalCertificateSubmitted = true;
                    fetchedUserData.applicationSubmitted = true;
                    fetchedUserData.trialStatus = 'completed';
                    fetchedUserData.trialOutcome = 'accepted';
                }
                // ========================================================
                
                const updates: { [key: string]: any } = {};

                // Controllo scadenza prova
                if (
                    fetchedUserData.trialStatus === 'active' &&
                    fetchedUserData.trialExpiryDate &&
                    isPast(startOfDay(fetchedUserData.trialExpiryDate.toDate()))
                ) {
                    updates.trialStatus = 'completed';
                    updates.isInsured = false;
                    userModified = true;
                    toast({ title: "Periodo di prova terminato", description: "Puoi ora decidere se continuare con noi." });
                }

                // Controllo scadenza associazione
                if (
                    fetchedUserData.associationStatus === 'active' &&
                    fetchedUserData.associationExpiryDate &&
                    isPast(startOfDay(fetchedUserData.associationExpiryDate.toDate()))
                ) {
                    updates.associationStatus = 'expired';
                    updates.isInsured = false;
                    userModified = true;
                    toast({ title: "Associazione Scaduta", description: "La tua tessera è scaduta. Rinnovala per continuare." });
                }
                
                // Controllo scadenza abbonamento
                 if (
                    fetchedUserData.subscriptionAccessStatus === 'active' &&
                    fetchedUserData.activeSubscription?.expiresAt &&
                    isPast(startOfDay(fetchedUserData.activeSubscription.expiresAt.toDate()))
                ) {
                    updates.subscriptionAccessStatus = 'expired';
                    userModified = true;
                    toast({ title: "Abbonamento Scaduto", description: "Il tuo abbonamento è scaduto. Rinnovalo per accedere ai corsi." });
                }

                if (userModified && !isTestMode) { // Non salvare le modifiche se siamo in test mode
                    await updateDoc(userDocRef, updates);
                    userDocSnap = await getDoc(userDocRef); // Re-fetch data
                    fetchedUserData = userDocSnap.data() as UserData;
                }
                
                setUserData(fetchedUserData);
                
                // === LOGICA DI REINDIRIZZAMENTO ONBOARDING ===
                 const onboardingPages = [
                    '/dashboard/regulations',
                    '/dashboard/liberasphere',
                    '/dashboard/trial-completed',
                 ];
                
                const isUserWaiting = 
                    fetchedUserData.associationStatus === 'pending' || 
                    fetchedUserData.trialStatus === 'pending_payment';

                // Se l'utente è in uno stato di attesa o ha già completato l'onboarding principale,
                // non lo reindirizziamo forzatamente, permettendogli di navigare.
                // La gestione di ciò che può vedere è delegata alle singole pagine.
                if (isUserWaiting || fetchedUserData.associationStatus === 'active' || fetchedUserData.associationStatus === 'expired' || fetchedUserData.role === 'admin') {
                     // Non fare nulla, lascia che l'utente navighi
                } else if (fetchedUserData.trialStatus === 'completed' && !fetchedUserData.trialOutcome) {
                    if (pathname !== '/dashboard/trial-completed') {
                         router.push('/dashboard/trial-completed');
                    }
                } else if (pathname === '/dashboard/reviews') {
                    // Permetti la visualizzazione della pagina recensioni senza reindirizzamento
                } else {
                    // Altrimenti, guida l'utente nel flusso di onboarding.
                    let targetPage = "";
                    if (!fetchedUserData.regulationsAccepted) {
                        targetPage = "/dashboard/regulations";
                    } else if (!fetchedUserData.medicalCertificateSubmitted) {
                        targetPage = "/dashboard/medical-certificate";
                    } else if (typeof fetchedUserData.isFormerMember !== 'string' || fetchedUserData.isFormerMember === "") {
                        targetPage = "/dashboard/liberasphere";
                    } else if (fetchedUserData.isFormerMember === 'yes' && fetchedUserData.associationStatus !== 'active') {
                        targetPage = "/dashboard/associates";
                    } else if (fetchedUserData.trialStatus === 'completed' && fetchedUserData.associationStatus !== 'active' && fetchedUserData.trialOutcome === 'accepted') {
                         targetPage = "/dashboard/associates";
                    } else if (fetchedUserData.isFormerMember === 'no' && fetchedUserData.trialStatus !== 'active' && fetchedUserData.trialStatus !== 'completed' && fetchedUserData.trialStatus !== 'pending_payment') {
                        targetPage = "/dashboard/class-selection";
                    }
                    
                    if (targetPage && pathname !== targetPage) {
                        router.push(targetPage);
                    }
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
      return null; // Dovrebbe essere già stato reindirizzato
  }
  
  const onboardingPagesForMenu = [
    '/dashboard/regulations',
    '/dashboard/liberasphere',
    '/dashboard/trial-completed',
  ];
  
  // L'utente è in un flusso di onboarding attivo se si trova in una di queste pagine E non è in attesa di approvazione
  const isUserOnboarding = 
      onboardingPagesForMenu.includes(pathname) &&
      !(userData.associationStatus === 'pending' || userData.trialStatus === 'pending_payment');

  const showMenu = !isUserOnboarding;
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <DashboardHeader onLogout={handleLogout} userData={userData} showMenu={showMenu} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}
