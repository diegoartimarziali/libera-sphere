
"use client"

import { useEffect, useState, ReactNode } from "react"
import Link from "next/link"
import { usePathname, redirect, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { isPast } from "date-fns"

import { Loader2, Home, HeartPulse, CreditCard, LogOut, CalendarHeart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"

interface MedicalInfo {
    type: 'certificate';
    expiryDate?: Timestamp;
    fileUrl?: string;
}

interface UserData {
  name: string
  email: string
  regulationsAccepted: boolean
  isFormerMember: 'yes' | 'no' | null
  applicationSubmitted: boolean
  medicalCertificateSubmitted: boolean
  medicalInfo?: MedicalInfo;
}

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


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loadingAuth] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loadingAuth) return;

    if (!user) {
      redirect("/")
      return
    }

    const fetchUserData = async () => {
      setLoadingData(true);
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          const fetchedUserData = userDocSnap.data() as UserData;
          setUserData(fetchedUserData);
          
          const isStillOnboarding = !fetchedUserData.regulationsAccepted || !fetchedUserData.medicalCertificateSubmitted || !fetchedUserData.applicationSubmitted;
          const currentOnboardingPage = ["/dashboard/regulations", "/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection", "/dashboard/medical-certificate"].find(p => pathname.startsWith(p));

          // Se l'utente ha completato l'onboarding e sta cercando di accedere a una pagina di onboarding (escluso certificato medico)
          if (!isStillOnboarding && currentOnboardingPage && pathname !== '/dashboard/medical-certificate') {
              redirect('/dashboard');
              return;
          }
          
          // Se l'utente è nel mezzo dell'onboarding, reindirizzalo al passo corretto
          if (isStillOnboarding) {
              if (!fetchedUserData.regulationsAccepted && pathname !== "/dashboard/regulations") {
                  redirect("/dashboard/regulations");
                  return;
              }
              if (fetchedUserData.regulationsAccepted && !fetchedUserData.medicalCertificateSubmitted && pathname !== "/dashboard/medical-certificate") {
                  redirect("/dashboard/medical-certificate");
                  return;
              }
               if (fetchedUserData.regulationsAccepted && fetchedUserData.medicalCertificateSubmitted && !fetchedUserData.applicationSubmitted && !pathname.startsWith('/dashboard/liberasphere') && !pathname.startsWith('/dashboard/associates') && !pathname.startsWith('/dashboard/class-selection')) {
                  redirect("/dashboard/liberasphere");
                  return;
              }
          }

        } else {
          // Documento non trovato, potrebbe essere una race condition subito dopo la registrazione.
          // Invece di sloggare, aspettiamo un po' e il prossimo cambio di path/reload risolverà.
          console.warn("User document not found for UID:", user.uid, "Might be a race condition.");
        }
      } catch (error) {
        console.error("Error fetching user data in layout:", error)
        toast({ title: "Errore", description: "Impossibile caricare i dati utente.", variant: "destructive" });
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchUserData()
    
  }, [user, loadingAuth, pathname, toast, router]);


  const handleLogout = async () => {
      try {
          await signOut(auth);
          router.push('/');
          toast({ title: "Logout effettuato", description: "Sei stato disconnesso con successo." });
      } catch (error) {
          console.error("Error during logout:", error);
          toast({ variant: "destructive", title: "Errore di logout", description: "Impossibile disconnettersi. Riprova." });
      }
  }

  if (loadingAuth || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!userData) {
      return (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4">Caricamento dati utente...</p>
         </div>
      )
  }

  const simplifiedLayoutPages = ["/dashboard/regulations", "/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection"];
  const needsSimplifiedLayout = simplifiedLayoutPages.some(p => pathname.startsWith(p)) || (pathname.startsWith("/dashboard/medical-certificate") && !userData.applicationSubmitted);

  if (needsSimplifiedLayout) {
     return (
        <div className="flex min-h-screen w-full bg-background">
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      )
  }

  // Layout completo della dashboard per utenti che hanno finito l'onboarding
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
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
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4 flex-1">
                    <NavLink href="/dashboard" icon={Home}>Scheda Personale</NavLink>
                    <NavLink href="/dashboard/medical-certificate" icon={HeartPulse}>Certificato Medico</NavLink>
                    <NavLink href="/dashboard/subscriptions" icon={CreditCard}>Abbonamenti</NavLink>
                    <NavLink href="/dashboard/stages" icon={CalendarHeart}>Stages</NavLink>
                </nav>
            </div>
        </aside>
        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                 {/* Qui potrebbe andare un menu mobile in futuro */}
                <div className="w-full flex-1">
                   {/* Spazio per breadcrumbs o titolo pagina */}
                </div>
                 <div className="flex items-center gap-4 ml-auto">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        {userData?.name}
                    </span>
                    <Button variant="outline" size="icon" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">Logout</span>
                    </Button>
                 </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                {children}
            </main>
        </div>
    </div>
  )
}
