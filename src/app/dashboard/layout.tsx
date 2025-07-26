

"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  PanelLeft,
  Users,
  FileText,
  LogOut,
  Landmark,
  HelpCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname, useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { isAfter, startOfToday, parse, lastDayOfMonth, addDays, parseISO, isValid } from "date-fns"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

// Custom Dumbbell Icon
const DumbbellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15.5 15.5c-1 0-1.5 1-1.5 2s.5 2 1.5 2 1.5-1 1.5-2-.5-2-1.5-2zM4.5 9.5c-1 0-1.5 1-1.5 2s.5 2 1.5 2 1.5-1 1.5-2-.5-2-1.5-2z" />
    <path d="M18 6.5V15a2 2 0 002 2h1" />
    <path d="M6 6.5V15a2 2 0 01-2 2H3" />
    <path d="M12 8V6.5a4.5 4.5 0 00-9 0V15" />
    <path d="M12 8h1a4.5 4.5 0 014.5 4.5V15" />
  </svg>
)

const KanjiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="24" fontFamily="serif">
      道
    </text>
  </svg>
)

const isAssociatedForCurrentSeason = (approvalDateStr: string | null): boolean => {
    if (!approvalDateStr) return false;

    try {
        const approvalDate = parse(approvalDateStr, 'dd/MM/yyyy', new Date());
        if (!isValid(approvalDate)) return false;

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11

        let seasonStartYear = currentYear;
        // If we are before September (month 8), the season started last year.
        if (currentMonth < 8) { 
            seasonStartYear = currentYear - 1;
        }

        const seasonStart = new Date(seasonStartYear, 8, 1); // September 1st
        const seasonEnd = new Date(seasonStartYear + 1, 7, 31); // August 31st

        return approvalDate >= seasonStart && approvalDate <= seasonEnd;

    } catch (error) {
        console.error("Error parsing association date:", error);
        return false;
    }
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = React.useState<any>(null);
  const [loadingAuth, setLoadingAuth] = React.useState(true);
  const [isDataReady, setIsDataReady] = React.useState(false);
  
  const [isMedicalBlocked, setIsMedicalBlocked] = React.useState(false);
  const [isSubscriptionBlocked, setIsSubscriptionBlocked] = React.useState(false);
  
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
        } else {
          // This case is unlikely if registration is always creating a doc, but good for safety
          setUserData({ uid: user.uid, email: user.email, name: user.displayName || 'Utente' });
        }
        setIsDataReady(true); // Data is ready (or we know it doesn't exist)
        setLoadingAuth(false);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  React.useEffect(() => {
    if (!isDataReady || !userData) {
      // Don't do any logic until user data is loaded
      return;
    }
    
    const currentPath = pathname;
    const essentialPages = ['/dashboard/aiuto', '/dashboard/medical-certificate', '/dashboard/subscription'];
    const isAssociatedThisSeason = userData.associationStatus === 'approved' && isAssociatedForCurrentSeason(userData.associationApprovalDate);

    // --- Priority 1: Health & Payment Blocks (ONLY FOR ACTIVE MEMBERS) ---
    if (isAssociatedThisSeason) {
        // Medical Certificate Block
        const appointmentDateStr = userData.medicalCertificate?.appointmentDate;
        const certificateDateStr = userData.medicalCertificate?.expirationDate;
        let blockUserMedical = false;
        if (appointmentDateStr && !certificateDateStr) {
            const appointmentDate = parseISO(appointmentDateStr);
            if (isValid(appointmentDate)) {
                const today = startOfToday();
                if (isAfter(today, appointmentDate)) {
                    blockUserMedical = true;
                }
            }
        }
        setIsMedicalBlocked(blockUserMedical);
        
        // Subscription Block
        let blockUserSubscription = false;
        if (userData.subscription?.plan === 'mensile' && userData.subscription?.status !== 'in_attesa') {
            const paymentDateStr = userData.subscription?.paymentDate;
            if (paymentDateStr) {
                const paymentDate = parseISO(paymentDateStr);
                if (isValid(paymentDate)) {
                    const today = new Date();
                    const endOfMonth = lastDayOfMonth(paymentDate);
                    const gracePeriodEnd = addDays(endOfMonth, 5);

                    if (isAfter(today, gracePeriodEnd)) {
                        blockUserSubscription = true;
                    }
                }
            } else {
                blockUserSubscription = true; // No payment date for an active subscription is a problem
            }
        }
        setIsSubscriptionBlocked(blockUserSubscription);

        if (blockUserMedical && !essentialPages.includes(currentPath)) {
            router.push('/dashboard/medical-certificate');
            return;
        }
        if (blockUserSubscription && !essentialPages.includes(currentPath)) {
            router.push('/dashboard/subscription');
            return;
        }
    }


    // --- Priority 2: Onboarding Flow ---
    
    // Step 1: User must accept regulations
    if (!userData.regulationsAccepted) {
        if (currentPath !== '/dashboard/regulations') {
            router.push('/dashboard/regulations');
        }
        return;
    }

    // Step 2: User must define their status (new or former member)
    if (userData.isFormerMember === null) {
        if (currentPath !== '/dashboard/liberasphere') {
            router.push('/dashboard/liberasphere');
        }
        return;
    }
    
    // Step 3: Check if user is fully operational
    const isOperational = 
        isAssociatedThisSeason ||
        (userData.isFormerMember === 'no' && userData.isSelectionPassportComplete);

    // If user is NOT operational and is on a page other than their required next step, redirect them.
    if (!isOperational) {
        if (userData.isFormerMember === 'no' && currentPath !== '/dashboard/class-selection') {
            router.push('/dashboard/class-selection');
        } else if (userData.isFormerMember === 'yes' && currentPath !== '/dashboard/associates') {
             router.push('/dashboard/associates');
        }
    }
    
  }, [isDataReady, userData, pathname, router]);

  const handleLogout = async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      try {
        await signOut(auth);
        if (typeof window !== 'undefined') {
            localStorage.clear();
        }
        router.push('/');
      } catch (error) {
        console.error("Logout failed:", error);
      }
  };
  
  const handleGoToUpload = () => {
    setIsMedicalBlocked(false);
    router.push('/dashboard/medical-certificate');
  }

  const handleGoToSubscription = () => {
    setIsSubscriptionBlocked(false);
    router.push('/dashboard/subscription');
  }

  if (loadingAuth || !isDataReady || !userData) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
    );
  }

  const isAssociatedThisSeason = userData.associationStatus === 'approved' && isAssociatedForCurrentSeason(userData.associationApprovalDate);
  const associationRequested = userData.associationStatus === 'requested';
  const hasSeasonalSubscription = userData.subscription?.plan === 'stagionale';

  // --- Navigation Items Logic ---
  const allNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Scheda personale", condition: () => isAssociatedThisSeason || associationRequested },
    { href: "/dashboard/help", icon: HelpCircle, label: "Aiuto", condition: () => true },
    { href: "/dashboard/regulations", icon: FileText, label: "Regolamenti", condition: () => !userData.regulationsAccepted },
    { href: "/dashboard/liberasphere", icon: Users, label: "LiberaSphere", condition: () => userData.regulationsAccepted && userData.isFormerMember === null },
    { href: "/dashboard/class-selection", icon: DumbbellIcon, label: "Passaporto Selezioni", condition: () => userData.regulationsAccepted && userData.isFormerMember === 'no' && !userData.isSelectionPassportComplete },
    { href: "/dashboard/associates", icon: Users, label: "Associati", condition: () => userData.regulationsAccepted && userData.isFormerMember === 'yes' && !isAssociatedThisSeason && !associationRequested },
    { href: "/dashboard/medical-certificate", icon: HeartPulse, label: "Certificato Medico", condition: () => isAssociatedThisSeason },
    { href: "/dashboard/subscription", icon: CreditCard, label: "Abbonamento", condition: () => isAssociatedThisSeason && !hasSeasonalSubscription },
    { href: "/dashboard/events", icon: Calendar, label: "Stage ed Esami", condition: () => isAssociatedThisSeason },
    { href: "/dashboard/payments", icon: Landmark, label: "Storico Pagamenti", condition: () => isAssociatedThisSeason || associationRequested },
  ];
  
  const bottomNavItems = [
    { href: "/", icon: LogOut, label: "Esci", onClick: handleLogout, condition: () => true },
  ];

  const navItems = isMedicalBlocked 
    ? allNavItems.filter(item => ['/dashboard/help', '/dashboard/medical-certificate'].includes(item.href))
    : isSubscriptionBlocked 
    ? allNavItems.filter(item => ['/dashboard/help', '/dashboard/subscription'].includes(item.href))
    : allNavItems.filter(item => item.condition());

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
        return React.cloneElement(child, {
            // @ts-ignore
            userData,
        });
    }
    return child;
  });

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <AlertDialog open={isMedicalBlocked} onOpenChange={(open) => !open && setIsMedicalBlocked(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Accesso Bloccato
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il termine per la presentazione del certificato medico è scaduto. Per legge, non è più possibile accedere ai corsi o alle altre attività.
              <br /><br />
              Carica il tuo certificato medico per sbloccare l'accesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleGoToUpload}>
              Vai al Caricamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isSubscriptionBlocked} onOpenChange={(open) => !open && setIsSubscriptionBlocked(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Abbonamento Scaduto
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il tuo abbonamento mensile è scaduto. Per continuare a partecipare ai corsi, è necessario rinnovare.
              <br /><br />
              Procedi al rinnovo per sbloccare l'accesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleGoToSubscription}>
              Rinnova Abbonamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5 flex-1">
          <Link
            href="#"
            className="group flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-stone-800 text-amber-400 md:h-8 md:text-base"
          >
            <KanjiIcon className="h-4 w-4 transition-all group-hover:scale-110" />
            <span>LiberaSphere</span>
          </Link>
          <div className="flex-1 w-full">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="w-full mt-auto">
             {bottomNavItems.map(item => item.condition() && (
              <a
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Apri/Chiudi Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                    href="#"
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-stone-800 text-lg font-semibold text-amber-400 md:text-base"
                >
                    <KanjiIcon className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">LiberaSphere</span>
                </Link>
                {navItems.map(item => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
                 {bottomNavItems.map(item => item.condition() && (
                    <a
                        key={item.label}
                        href={item.href}
                        onClick={item.onClick}
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 space-y-4">
            {childrenWithProps}
        </main>
      </div>
    </div>
  )
}
