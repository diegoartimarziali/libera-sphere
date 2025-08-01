
"use client"

import { useEffect, useState, ReactNode, useCallback } from "react"
import Link from "next/link"
import { usePathname, redirect, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"

import { Loader2, Home, HeartPulse, CreditCard, LogOut, CalendarHeart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"

interface UserData {
  name: string
  email: string
  regulationsAccepted: boolean
  applicationSubmitted: boolean
  medicalCertificateSubmitted: boolean
  // Aggiungiamo altri campi opzionali per evitare errori di tipo
  [key: string]: any;
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
        if (loadingAuth) {
            return; // Aspetta che l'autenticazione finisca
        }

        if (!user) {
            redirect("/"); // Nessun utente, torna al login
            return;
        }

        // Se abbiamo già i dati, non ricaricarli
        if (userData) {
            setLoadingData(false);
            return;
        }
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const fetchedUserData = userDocSnap.data() as UserData;
                setUserData(fetchedUserData);
                
                // === LOGICA DI REINDIRIZZAMENTO ===
                const isOnboardingComplete = fetchedUserData.applicationSubmitted;

                if (isOnboardingComplete) {
                    // STATO OPERATIVO: L'utente ha finito l'onboarding. Nessun reindirizzamento forzato.
                    // Può navigare liberamente nella sua dashboard.
                } else {
                    // STATO ONBOARDING: Guida l'utente passo-passo.
                    const onboardingPages = [
                        "/dashboard/regulations", 
                        "/dashboard/medical-certificate", 
                        "/dashboard/liberasphere", 
                        "/dashboard/associates", 
                        "/dashboard/class-selection"
                    ];
                    
                    let targetPage = "";

                    if (!fetchedUserData.regulationsAccepted) {
                        targetPage = "/dashboard/regulations";
                    } else if (!fetchedUserData.medicalCertificateSubmitted) {
                        targetPage = "/dashboard/medical-certificate";
                    } else { // Ha accettato regolamenti e caricato certificato
                        targetPage = "/dashboard/liberasphere";
                    }
                    
                    // Reindirizza solo se non si trova già sulla pagina giusta o su una pagina figlio del suo step
                    const isAlreadyOnCorrectPath = pathname === targetPage || (targetPage === '/dashboard/liberasphere' && onboardingPages.some(p => pathname.startsWith(p)));

                    if (targetPage && !isAlreadyOnCorrectPath) {
                         router.push(targetPage);
                    }
                }

            } else {
                console.error("Documento utente non trovato per UID:", user.uid);
                toast({
                    variant: "destructive",
                    title: "Errore Critico",
                    description: "Impossibile trovare il tuo profilo utente. Eseguo il logout.",
                });
                await handleLogout();
            }
        } catch (error) {
            console.error("Errore nel caricamento dati o reindirizzamento:", error);
            toast({ title: "Errore di Caricamento", description: "Impossibile caricare i dati. Eseguo il logout.", variant: "destructive" });
            await handleLogout();
        } finally {
            setLoadingData(false);
        }
    };
    
    fetchAndRedirect();

  }, [user, loadingAuth, pathname, router, toast, handleLogout, userData]); // userData aggiunto per evitare re-fetch


  if (loadingAuth || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!user || !userData) {
      // Questo stato viene mostrato se il caricamento è finito ma i dati non ci sono (es. durante il logout)
      return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-muted-foreground">Reindirizzamento in corso...</p>
         </div>
      )
  }

  const isOnboarding = !userData.applicationSubmitted;

  // Se l'utente è in onboarding, mostriamo un layout semplificato
  // Questo previene la visualizzazione della sidebar con link che verrebbero comunque bloccati
  if (isOnboarding) {
     return (
        <div className="flex min-h-screen w-full bg-background">
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      )
  }

  // Layout completo della dashboard per utenti operativi
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
                <div className="w-full flex-1">
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
