

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
  Dumbbell,
  Shield,
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
  const [loading, setLoading] = React.useState(true);
  
  const [isMedicalBlocked, setIsMedicalBlocked] = React.useState(false);
  const [isSubscriptionBlocked, setIsSubscriptionBlocked] = React.useState(false);
  
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData(data);
          } else {
            // This case might happen if registration succeeded but Firestore doc creation failed.
            // Forcing a logout is a safe way to handle this inconsistency.
            await signOut(auth);
            router.push('/');
            return;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Also force logout on data fetching error
          await signOut(auth);
          router.push('/');
          return;
        }
      } else {
        router.push('/');
      }
      // We set loading to false only after we have a user and their data, or we know there's no user.
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  React.useEffect(() => {
    // This effect handles redirection logic and runs ONLY when userData or pathname changes.
    // It is crucial that `loading` is false and `userData` is populated.
    if (loading || !userData) {
      return;
    }
    
    const currentPath = pathname;
    const isAssociatedThisSeason = userData.associationStatus === 'approved' && isAssociatedForCurrentSeason(userData.associationApprovalDate);

    // --- PRIORITY 1: Critical Blocks for ACTIVE members ---
    if (isAssociatedThisSeason) {
        const essentialPages = ['/dashboard/aiuto', '/dashboard/medical-certificate', '/dashboard/subscription'];
        
        // Medical Certificate Block
        const appointmentDateStr = userData.medicalCertificate?.appointmentDate;
        const certificateDateStr = userData.medicalCertificate?.expirationDate;
        let blockUserMedical = false;
        if (appointmentDateStr && !certificateDateStr) {
            const appointmentDate = parseISO(appointmentDateStr);
            if (isValid(appointmentDate) && isAfter(startOfToday(), appointmentDate)) {
                blockUserMedical = true;
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
                blockUserSubscription = true; 
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


    // --- PRIORITY 2: Onboarding Flow ---
    const isOperational = isAssociatedThisSeason || (userData.isSelectionPassportComplete);

    // Step 1: Regulations
    if (!userData.regulationsAccepted) {
        if (currentPath !== '/dashboard/regulations') {
            router.push('/dashboard/regulations');
        }
        return;
    }

    // Step 2: LiberaSphere Status
    if (userData.isFormerMember === null) {
        if (currentPath !== '/dashboard/liberasphere') {
            router.push('/dashboard/liberasphere');
        }
        return;
    }
    
    // Step 3: Redirect to correct module if not yet operational
    if (!isOperational) {
        if (userData.isFormerMember === 'no' && currentPath !== '/dashboard/class-selection') {
            router.push('/dashboard/class-selection');
        } else if (userData.isFormerMember === 'yes' && currentPath !== '/dashboard/associates') {
             router.push('/dashboard/associates');
        }
    }
    
  }, [userData, pathname, router, loading]);

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

  if (loading || !userData) {
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
    { href: "/dashboard/class-selection", icon: Dumbbell, label: "Passaporto Selezioni", condition: () => userData.regulationsAccepted && userData.isFormerMember === 'no' && !userData.isSelectionPassportComplete },
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
            <Shield className="h-4 w-4 transition-all group-hover:scale-110" />
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
                    <Shield className="h-5 w-5 transition-all group-hover:scale-110" />
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
