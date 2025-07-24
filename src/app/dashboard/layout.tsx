

"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  PanelLeft,
  Settings,
  Users,
  Info,
  FileText,
  LogOut,
  Landmark,
  HelpCircle,
  AlertTriangle,
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
import { isAfter, startOfToday } from "date-fns"

// Custom Dumbbell Icon
const DumbbellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
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
    viewBox="0 0 24"
    fill="currentColor"
    {...props}
  >
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="24" fontFamily="serif">
      道
    </text>
  </svg>
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = React.useState(false);
  const [regulationsAccepted, setRegulationsAccepted] = React.useState(false);
  const [associated, setAssociated] = React.useState(false);
  const [associationRequested, setAssociationRequested] = React.useState(false);
  const [lessonSelected, setLessonSelected] = React.useState(false);
  const [inLiberasphere, setInLiberasphere] = React.useState(false);
  const [selectionPassportComplete, setSelectionPassportComplete] = React.useState(false);
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [hasSeasonalSubscription, setHasSeasonalSubscription] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient) {
      const storedLiberasphere = !!localStorage.getItem('isFormerMember');
      const storedRegulations = localStorage.getItem('regulationsAccepted') === 'true';
      const storedAssociation = localStorage.getItem('associated') === 'true';
      const storedLessonSelected = localStorage.getItem('lessonSelected') === 'true';
      const storedAssociationRequested = localStorage.getItem('associationRequested') === 'true';
      const storedSelectionPassportComplete = localStorage.getItem('isSelectionPassportComplete') === 'true';
      const storedSubscriptionPlan = localStorage.getItem('subscriptionPlan');

      const appointmentDateStr = localStorage.getItem('medicalAppointmentDate');
      const certificateDateStr = localStorage.getItem('medicalCertificateExpirationDate');
      
      let blockUser = false;
      if (appointmentDateStr && !certificateDateStr) {
          const appointmentDate = new Date(appointmentDateStr);
          const today = startOfToday();
          if (isAfter(today, appointmentDate)) {
              blockUser = true;
          }
      }
      
      setInLiberasphere(storedLiberasphere);
      setRegulationsAccepted(storedRegulations);
      setAssociated(storedAssociation);
      setLessonSelected(storedLessonSelected);
      setAssociationRequested(storedAssociationRequested);
      setSelectionPassportComplete(storedSelectionPassportComplete);
      setHasSeasonalSubscription(storedSubscriptionPlan === 'stagionale');
      setIsBlocked(blockUser);

      // Redirect logic
      if (blockUser) {
        if (pathname !== '/dashboard/medical-certificate' && pathname !== '/dashboard/aiuto') {
            router.push('/dashboard/medical-certificate');
        }
      } else if (!storedLiberasphere && pathname !== '/dashboard/liberasphere' && pathname !== '/dashboard/aiuto') {
        router.push('/dashboard/liberasphere');
      } else if (storedLiberasphere && !storedRegulations && pathname !== '/dashboard/regulations' && pathname !== '/dashboard/aiuto' && pathname !== '/dashboard/liberasphere') {
         router.push('/dashboard/regulations');
      }
    }
  }, [isClient, pathname, router]);
  
  const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (typeof window !== 'undefined') {
          localStorage.clear();
      }
      router.push('/');
  };
  
  const handleGoToUpload = () => {
    setIsBlocked(false);
    router.push('/dashboard/medical-certificate');
  }

  const allNavItems = [
    { href: "/dashboard/aiuto", icon: HelpCircle, label: "Aiuto", condition: () => true }, // Always show Aiuto
    { href: "/dashboard/medical-certificate", icon: HeartPulse, label: "Certificato Medico", condition: () => true }, // Always show Certificato Medico
    { href: "/dashboard/liberasphere", icon: Users, label: "LiberaSphere", condition: () => !isBlocked && !inLiberasphere },
    { href: "/dashboard/regulations", icon: FileText, label: "Regolamenti", condition: () => !isBlocked && inLiberasphere && !regulationsAccepted },
    { href: "/dashboard", icon: LayoutDashboard, label: "Scheda personale", condition: () => !isBlocked && regulationsAccepted },
    { href: "/dashboard/class-selection", icon: DumbbellIcon, label: "Lezioni Selezione", condition: () => !isBlocked && regulationsAccepted && !lessonSelected && localStorage.getItem('isFormerMember') === 'no'},
    { href: "/dashboard/associates", icon: Users, label: "Associati", condition: () => !isBlocked && regulationsAccepted && !associationRequested && !selectionPassportComplete },
    { href: "/dashboard/subscription", icon: CreditCard, label: "Abbonamento ai Corsi", condition: () => !isBlocked && regulationsAccepted && !selectionPassportComplete && !hasSeasonalSubscription },
    { href: "/dashboard/events", icon: Calendar, label: "Stage ed Esami", condition: () => !isBlocked && regulationsAccepted && !selectionPassportComplete },
    { href: "/dashboard/payments", icon: Landmark, label: "Pagamenti", condition: () => !isBlocked && regulationsAccepted && !selectionPassportComplete },
  ]
  
  const bottomNavItems = [
    { href: "/", icon: LogOut, label: "Esci", onClick: handleLogout, condition: () => true },
  ]

  const navItems = isBlocked
    ? allNavItems.filter(item => item.href === '/dashboard/aiuto' || item.href === '/dashboard/medical-certificate')
    : allNavItems.filter(item => {
        if (item.condition) {
            return item.condition();
        }
        return true;
      });

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
        return React.cloneElement(child, {
            // @ts-ignore
            setRegulationsAccepted,
            setAssociated,
            setLessonSelected,
            setAssociationRequested,
        });
    }
    return child;
  });

  if (!isClient) {
    // Render a loading state or nothing on the server to avoid hydration mismatch
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <AlertDialog open={isBlocked} onOpenChange={setIsBlocked}>
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
              <Link
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
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
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={item.onClick}
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
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
