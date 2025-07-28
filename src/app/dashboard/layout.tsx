
"use client"

import { useEffect, useState, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { Loader2 } from "lucide-react"

// Definizione del tipo per i dati utente
interface UserData {
  name: string
  email: string
  regulationsAccepted: boolean
  isFormerMember: 'yes' | 'no' | null
  // Aggiungi qui altri campi se necessario
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loadingAuth, errorAuth] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Se l'autenticazione è in corso, non fare nulla
    if (loadingAuth) {
      return
    }

    // Se non c'è un utente loggato, reindirizza alla home
    if (!user) {
      router.replace("/")
      return
    }

    // Se c'è un utente, recupera i suoi dati da Firestore
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data() as UserData)
        } else {
          // L'utente è autenticato ma non ha un documento in Firestore, errore critico
          console.error("No user data found in Firestore!")
          router.replace("/") // O a una pagina di errore
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        router.replace("/") // O a una pagina di errore
      } finally {
        setLoadingData(false)
      }
    }

    fetchUserData()
  }, [user, loadingAuth, router])

  // Logica di reindirizzamento basata sui dati utente
  useEffect(() => {
    if (loadingData || !userData) {
      return
    }

    const { regulationsAccepted, isFormerMember } = userData

    // 1. Controllo Regolamenti
    if (!regulationsAccepted) {
      if (pathname !== "/dashboard/regulations") {
        router.replace("/dashboard/regulations")
      }
      return
    }

    // 2. Controllo Scelta Socio
    if (isFormerMember === null) {
      if (pathname !== "/dashboard/liberasphere") {
        router.replace("/dashboard/liberasphere")
      }
      return
    }
    
    // Se tutti i controlli sono passati, l'utente può accedere alle altre pagine.
    // Potremmo aggiungere un reindirizzamento alla dashboard principale se l'utente
    // tenta di accedere alle pagine di onboarding che ha già completato.
    if (pathname === '/dashboard/regulations' || pathname === '/dashboard/liberasphere') {
      router.replace('/dashboard');
    }

  }, [userData, loadingData, pathname, router])
  
  // Mostra una schermata di caricamento mentre l'autenticazione o il fetch dei dati sono in corso
  if (loadingAuth || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  // Se i dati sono stati caricati e i reindirizzamenti gestiti, mostra il contenuto della pagina
  return (
      <div className="flex h-screen w-full bg-background">
        {/* Qui andrà la sidebar in futuro */}
        <main className="flex-1 p-8">
            {children}
        </main>
      </div>
  )
}
