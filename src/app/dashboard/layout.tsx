
"use client"

import { useEffect, useState, ReactNode, useCallback } from "react"
import { UserAwardsProvider } from "@/context/UserAwardsContext"
import Link from "next/link"
import { usePathname, redirect, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { isPast, startOfDay } from "date-fns"


import { Loader2, UserSquare, HeartPulse, CreditCard, LogOut, Menu, UserPlus, Sparkles, Shield, ClipboardList, CalendarDays, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getDocs, collection } from "firebase/firestore";
// import { getAuth } from "firebase/auth"
// import getAuth from "firebase/auth"
// import { signOut } from "firebase/auth";
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
  medicalCertificateStatus?: 'invalid'; // Nuovo campo
  associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
  associationPaymentFailed?: boolean;
  associationExpiryDate?: Timestamp;
  trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
  trialPaymentFailed?: boolean;
  trialExpiryDate?: Timestamp;
  trialOutcome?: 'declined' | 'accepted';
  isFormerMember: 'yes' | 'no';
  isInsured?: boolean;
  subscriptionAccessStatus?: 'pending' | 'active' | 'expired';
  subscriptionPaymentFailed?: boolean; // Nuovo campo per bloccare accesso
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
                    "sidebar-menu-link flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                    isActive && "bg-muted"
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

    // Se pagamento abbonamento fallito, blocca accesso a tutto tranne Pagamenti e Abbonamenti
    const isPaymentBlocked = userData.subscriptionPaymentFailed === true;

    if (isPaymentBlocked) {
        return (
            <>
                <NavLink href="/dashboard" icon={UserSquare} onClick={onLinkClick}>Scheda Personale</NavLink>
                <NavLink href="/dashboard/wallet" icon={Wallet} onClick={onLinkClick}>I miei Premi</NavLink>
                <NavLink href="/dashboard/payments" icon={CreditCard} onClick={onLinkClick}>I Miei Pagamenti</NavLink>
                <NavLink href="/dashboard/subscriptions" icon={CreditCard} onClick={onLinkClick}>Abbonamenti</NavLink>
                
                {userData.role === 'admin' && (
                    <>
                        <Separator className="my-2" />
                        <NavLink href="/admin" icon={Shield} onClick={onLinkClick}>Pannello Admin</NavLink>
                    </>
                )}
            </>
        );
    }

    return (
        <>
            <NavLink href="/dashboard" icon={UserSquare} onClick={onLinkClick}>Scheda Personale</NavLink>
            <NavLink href="/dashboard/renew-medical-certificate" icon={HeartPulse} onClick={onLinkClick}>Rinnovo Certificato Medico</NavLink>
            <NavLink href="/dashboard/payments" icon={CreditCard} onClick={onLinkClick}>I Miei Pagamenti</NavLink>
            <NavLink href="/dashboard/wallet" icon={Wallet} onClick={onLinkClick}>I miei Premi</NavLink>

            {isReadyForAssociation && (
                 <NavLink href="/dashboard/associates" icon={UserPlus} onClick={onLinkClick}>Diventa Socio</NavLink>
            )}

            {isOperational && (
                <>
                    <NavLink href="/dashboard/subscriptions" icon={CreditCard} onClick={onLinkClick}>Abbonamenti</NavLink>
                    <NavLink href="/dashboard/attendances" icon={ClipboardList} onClick={onLinkClick}>Le Mie Presenze</NavLink>
                    <NavLink href="/dashboard/calendar" icon={CalendarDays} onClick={onLinkClick}>Stages, Esami e Corsi</NavLink>
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

function DashboardHeader({ 
    onLogout, 
    userData, 
    showMenu,
}: { 
    onLogout: () => void; 
    userData: UserData | null, 
    showMenu: boolean,
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-dark-brown text-title-yellow px-4 sm:px-6 justify-between">
            <div className="flex items-center gap-4">
                 {showMenu && (
                     <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="border-title-yellow text-title-yellow hover:bg-white/20 hover:text-title-yellow">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0">
                            <SheetHeader>
                                <SheetTitle>Menu</SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 p-4">
                                                    <SheetClose asChild>
                                                        <Link
                                                            href="/dashboard"
                                                            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:text-base"
                                                        >
                                                            <img src="https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Ftigre-PP.png?alt=media&token=8cf5490d-1498-4a13-b827-f2e9fe0b94ba" alt="Tigre" className="w-12 h-12 object-contain" />
                                                        </Link>
                                                    </SheetClose>
                                <NavigationLinks userData={userData} onLinkClick={() => setIsMenuOpen(false)} />
                            </nav>
                        </SheetContent>
                    </Sheet>
                 )}
            </div>

            {/* Logo centrale con testo diviso */}
            <div className="flex-1 flex justify-center items-center">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Libera</span>
                        <img 
                            src="https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Ftigre-M.png?alt=media&token=b5f3540f-ab42-46ed-9722-9c4e9663a97b"
                            alt="Logo Libera Energia"
                            className="w-auto object-contain"
                            style={{ height: '50px' }}
                        />
                        <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Energia</span>
                    </div>
                    <span className="text-sm font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>Arti Marziali</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onLogout} className="border-title-yellow text-title-yellow hover:bg-white/20 hover:text-title-yellow">
                    <LogOut className="h-5 w-5" />
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
          await auth.signOut();
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
            // Carica dati utente
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            let fetchedUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
            // Leggi trialStatus e lezioni di prova dal documento unico 'main'
            let trialStatus = undefined;
            let trialExpiryDate = undefined;
            let trialLessons = [];
            if (userDocSnap.exists()) {
                const trialMainDocRef = doc(db, `users/${user.uid}/trialLessons/main`);
                const trialMainDocSnap = await getDoc(trialMainDocRef);
                if (trialMainDocSnap.exists()) {
                    const trialData = trialMainDocSnap.data();
                    trialStatus = trialData.trialStatus;
                    trialExpiryDate = trialData.trialExpiryDate;
                    trialLessons = Array.isArray(trialData.lessons) ? trialData.lessons : [];
                }
                                // Assicura che i campi obbligatori non siano undefined
                                                setUserData({
                                                    ...fetchedUserData,
                                                    name: fetchedUserData?.name ?? '',
                                                    email: fetchedUserData?.email ?? '',
                                                    regulationsAccepted: fetchedUserData?.regulationsAccepted ?? false,
                                                    applicationSubmitted: fetchedUserData?.applicationSubmitted ?? false,
                                                    medicalCertificateSubmitted: fetchedUserData?.medicalCertificateSubmitted ?? false,
                                                    isFormerMember: fetchedUserData?.isFormerMember ?? 'no',
                                                    trialStatus,
                                                    trialExpiryDate,
                                                    trialLessons
                                                });
                // === LOGICA DI REINDIRIZZAMENTO ONBOARDING ===
                const onboardingPages = [
                    '/dashboard/regulations',
                    '/dashboard/medical-certificate',
                    '/dashboard/liberasphere',
                    '/dashboard/class-selection',
                    '/dashboard/associates',
                    '/dashboard/trial-completed',
                    '/dashboard/reviews',
                ];
                if (onboardingPages.includes(pathname)) {
                    setLoadingData(false);
                    return;
                }

                // Note: subscriptionPaymentFailed viene gestito solo tramite limitazione del menu
                // Non c'è più reindirizzamento automatico - troppo restrittivo
                if (trialStatus === 'completed' && fetchedUserData?.associationStatus === 'not_associated') {
                    if (pathname !== '/dashboard/trial-completed') {
                        router.push('/dashboard/trial-completed');
                    }
                    setLoadingData(false);
                    return;
                }
                const isUserStable =
                    fetchedUserData?.trialPaymentFailed === true ||
                    fetchedUserData?.associationStatus === 'pending' ||
                    fetchedUserData?.associationStatus === 'active' ||
                    fetchedUserData?.associationStatus === 'expired' ||
                    trialStatus === 'pending_payment' ||
                    trialStatus === 'active' ||
                    fetchedUserData?.role === 'admin' ||
                    fetchedUserData?.associationPaymentFailed === true ||
                    fetchedUserData?.medicalCertificateStatus === 'invalid';
                if (isUserStable) {
                    setLoadingData(false);
                    return;
                }
                let targetPage = "";
                if (!fetchedUserData?.regulationsAccepted) {
                    targetPage = "/dashboard/regulations";
                } else if (!fetchedUserData?.medicalCertificateSubmitted) {
                    targetPage = "/dashboard/medical-certificate";
                } else if (!fetchedUserData?.isFormerMember) {
                    targetPage = "/dashboard/liberasphere";
                } else if (fetchedUserData?.isFormerMember === 'yes') {
                    targetPage = "/dashboard/associates";
                } else if (
                    fetchedUserData?.isFormerMember === 'no' &&
                    trialStatus !== 'pending_payment' &&
                    trialStatus !== 'active'
                ) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingAuth, pathname, router, toast]);

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
    '/dashboard/medical-certificate',
    '/dashboard/liberasphere',
    '/dashboard/trial-completed',
    '/dashboard/class-selection',
    '/dashboard/associates'
  ];
  
  const isUserOnboarding = 
      onboardingPagesForMenu.includes(pathname) &&
      !(userData.associationStatus === 'pending' || userData.trialStatus === 'pending_payment');

  const showMenu = !isUserOnboarding;
  
return (
    <UserAwardsProvider>
        <div className="flex min-h-screen w-full flex-col bg-background">
            <DashboardHeader 
                onLogout={handleLogout} 
                userData={userData} 
                showMenu={showMenu}
            />
            <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
    </UserAwardsProvider>
)
}
