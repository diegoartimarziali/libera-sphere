"use client"

import { useEffect, useState, ReactNode, useCallback, Suspense } from "react"
import { UserAwardsProvider } from "@/context/UserAwardsContext"
import Link from "next/link"
import { usePathname, redirect, useRouter, useSearchParams } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { isPast, startOfDay } from "date-fns"

import { Loader2, UserSquare, HeartPulse, CreditCard, LogOut, Menu, UserPlus, Sparkles, Shield, ClipboardList, CalendarDays, Wallet, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getDocs, collection } from "firebase/firestore";
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface UserData {
  name: string
  email: string
  role?: 'admin' | 'superAdmin' | 'user';
  regulationsAccepted: boolean
  applicationSubmitted: boolean
  medicalCertificateSubmitted: boolean
  medicalCertificateStatus?: 'invalid';
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
  subscriptionPaymentFailed?: boolean;
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
// UTILITÀ PER GESTIONE RUOLI E PERMESSI
// =================================================================

export function isSuperAdmin(userData: UserData | null): boolean {
    return userData?.role === 'superAdmin';
}

export function isAdmin(userData: UserData | null): boolean {
    return userData?.role === 'admin' || userData?.role === 'superAdmin';
}

export function hasImpersonationAccess(userData: UserData | null): boolean {
    return isSuperAdmin(userData);
}

export function hasFullAdminAccess(userData: UserData | null): boolean {
    return isSuperAdmin(userData);
}

export function hasReadOnlyAdminAccess(userData: UserData | null): boolean {
    return userData?.role === 'admin';
}

// =================================================================
// COMPONENTI DI NAVIGAZIONE
// =================================================================

function NavLink({
    href,
    children,
    icon: Icon,
    onClick,
    impersonateId,
}: {
    href: string;
    children: ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
    impersonateId?: string | null;
}) {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');

    // Propagate impersonate param if present
    let finalHref = href;
    if (impersonateId && href.startsWith('/dashboard')) {
        // Check if href already has query params
        if (href.includes('?')) {
            finalHref = `${href}&impersonate=${encodeURIComponent(impersonateId)}`;
        } else {
            finalHref = `${href}?impersonate=${encodeURIComponent(impersonateId)}`;
        }
    }

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) {
            onClick();
        }
    };
    
    return (
        <SheetClose asChild>
            <Link
                href={finalHref}
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

function NavigationLinks({ userData, onLinkClick, impersonateId }: { userData: UserData | null, onLinkClick: () => void, impersonateId?: string | null }) {
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
                <NavLink href="/dashboard" icon={UserSquare} onClick={onLinkClick} impersonateId={impersonateId}>Scheda Personale</NavLink>
                <NavLink href="/dashboard/wallet" icon={Wallet} onClick={onLinkClick} impersonateId={impersonateId}>I miei Premi</NavLink>
                <NavLink href="/dashboard/payments" icon={CreditCard} onClick={onLinkClick} impersonateId={impersonateId}>I Miei Pagamenti</NavLink>
                <NavLink href="/dashboard/subscriptions" icon={CreditCard} onClick={onLinkClick} impersonateId={impersonateId}>Abbonamenti</NavLink>
                
                {(userData.role === 'admin' || userData.role === 'superAdmin') && (
                    <>
                        <Separator className="my-2" />
                        {userData.role === 'superAdmin' ? (
                            <NavLink href="/admin" icon={Crown} onClick={onLinkClick} impersonateId={impersonateId}>Pannello SuperAdmin</NavLink>
                        ) : (
                            <NavLink href="/admin" icon={Shield} onClick={onLinkClick} impersonateId={impersonateId}>Pannello Admin</NavLink>
                        )}
                    </>
                )}
            </>
        );
    }

    return (
        <>
            <NavLink href="/dashboard" icon={UserSquare} onClick={onLinkClick} impersonateId={impersonateId}>Scheda Personale</NavLink>
            <NavLink href="/dashboard/renew-medical-certificate" icon={HeartPulse} onClick={onLinkClick} impersonateId={impersonateId}>Rinnovo Certificato Medico</NavLink>
            <NavLink href="/dashboard/payments" icon={CreditCard} onClick={onLinkClick} impersonateId={impersonateId}>I Miei Pagamenti</NavLink>
            <NavLink href="/dashboard/wallet" icon={Wallet} onClick={onLinkClick} impersonateId={impersonateId}>I miei Premi</NavLink>

            {isReadyForAssociation && (
                 <NavLink href="/dashboard/associates" icon={UserPlus} onClick={onLinkClick} impersonateId={impersonateId}>Diventa Socio</NavLink>
            )}

            {isOperational && (
                <>
                    <NavLink href="/dashboard/subscriptions" icon={CreditCard} onClick={onLinkClick} impersonateId={impersonateId}>Abbonamenti</NavLink>
                    <NavLink href="/dashboard/attendances" icon={ClipboardList} onClick={onLinkClick} impersonateId={impersonateId}>Le Mie Presenze</NavLink>
                    <NavLink href="/dashboard/calendar" icon={CalendarDays} onClick={onLinkClick} impersonateId={impersonateId}>Stages, Esami e Corsi</NavLink>
                </>
            )}
            
            {(userData.role === 'admin' || userData.role === 'superAdmin') && (
                <>
                    <Separator className="my-2" />
                    {userData.role === 'superAdmin' ? (
                        <NavLink href="/admin" icon={Crown} onClick={onLinkClick} impersonateId={impersonateId}>Pannello SuperAdmin</NavLink>
                    ) : (
                        <NavLink href="/admin" icon={Shield} onClick={onLinkClick} impersonateId={impersonateId}>Pannello Admin</NavLink>
                    )}
                </>
            )}
        </>
    );
}

// =================================================================
// HEADER UNIFICATO
// =================================================================

function DashboardHeader({ onLogout, userData, showMenu, impersonateId }: {
    onLogout: () => void;
    userData: UserData | null;
    showMenu: boolean;
    impersonateId?: string | null;
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Create dashboard link with impersonate param if present
    const dashboardHref = impersonateId ? `/dashboard?impersonate=${encodeURIComponent(impersonateId)}` : '/dashboard';
    
    return (
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-dark-brown text-title-yellow px-4 sm:px-6 justify-between">
            {/* Left: Menu */}
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
                                        href={dashboardHref}
                                        className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:text-base"
                                    >
                                        <img src="https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Ftigre-PP.png?alt=media&token=8cf5490d-1498-4a13-b827-f2e9fe0b94ba" alt="Tigre" className="w-12 h-12 object-contain" />
                                    </Link>
                                </SheetClose>
                                <NavigationLinks userData={userData} onLinkClick={() => setIsMenuOpen(false)} impersonateId={impersonateId} />
                            </nav>
                        </SheetContent>
                    </Sheet>
                )}
            </div>

            {/* Center: Logo */}
            <div className="flex-1 flex justify-center items-center">
                <Link href={dashboardHref} className="flex flex-col items-center hover:opacity-80 transition-opacity">
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
                </Link>
            </div>

            {/* Right: Logout */}
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
  const [impersonateId, setImpersonateId] = useState<string | null>(null);
  const [user, loadingAuth] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const impersonate = urlParams.get('impersonate');
      setImpersonateId(impersonate);
    }
  }, []);

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
        // Se impersonateId è presente, fetcha i dati di quell'utente, altrimenti quelli dell'utente loggato
        const effectiveUserId = impersonateId || user?.uid;
        if (!effectiveUserId) {
            redirect("/");
            return;
        }
        setLoadingData(true);
        try {
            // Carica dati utente (impersonato o loggato)
            const userDocRef = doc(db, "users", effectiveUserId);
            const userDocSnap = await getDoc(userDocRef);
            let fetchedUserData = userDocSnap.exists() ? userDocSnap.data() : null;
            // Leggi trialStatus e lezioni di prova dal documento unico 'main'
            let trialStatus = undefined;
            let trialExpiryDate = undefined;
            let trialLessons = [];
            if (userDocSnap.exists()) {
                const trialMainDocRef = doc(db, `users/${effectiveUserId}/trialLessons/main`);
                const trialMainDocSnap = await getDoc(trialMainDocRef);
                if (trialMainDocSnap.exists()) {
                    const trialData = trialMainDocSnap.data();
                    trialStatus = trialData.trialStatus;
                    trialExpiryDate = trialData.trialExpiryDate;
                    trialLessons = Array.isArray(trialData.lessons) ? trialData.lessons : [];
                }
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
                ];
                // Pagine che non richiedono controlli di onboarding
                const publicPages = ['/dashboard/reviews'];
                if (onboardingPages.includes(pathname) || publicPages.includes(pathname)) {
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
    if (!loadingAuth && (user || impersonateId)) {
        fetchAndRedirect();
    } else if (!loadingAuth && !user && !impersonateId) {
         redirect("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingAuth, pathname, router, toast, impersonateId]);

  if (loadingAuth || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }
  
  // Se non c'è userData (profilo impersonato o proprio), non mostrare nulla
  if (!userData) {
      return null;
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
  
  // Define effectiveUserId for UserAwardsProvider
  const effectiveUserId = impersonateId || user?.uid;
  
  return (
    <UserAwardsProvider userId={effectiveUserId}>
        <div className="flex min-h-screen w-full flex-col bg-background">
            <DashboardHeader 
                onLogout={handleLogout} 
                userData={userData} 
                showMenu={showMenu}
                impersonateId={impersonateId}
            />
            <main className="flex-1 p-4 md:p-8">
                <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
                    {children}
                </Suspense>
            </main>
        </div>
    </UserAwardsProvider>
  );
}
