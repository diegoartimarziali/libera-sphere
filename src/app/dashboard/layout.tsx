
"use client"

import { useEffect, useState, ReactNode } from "react"
import { usePathname, redirect } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { Loader2 } from "lucide-react"

interface UserData {
  name: string
  email: string
  regulationsAccepted: boolean
  isFormerMember: 'yes' | 'no' | null
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loadingAuth] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    if (loadingAuth) {
      return
    }
    if (!user) {
      redirect("/")
      return
    }

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data() as UserData)
        } else {
          console.error("User document not found in Firestore!")
          redirect("/") 
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        redirect("/")
      } finally {
        setLoadingData(false)
      }
    }

    fetchUserData()
  }, [user, loadingAuth])

  if (loadingAuth || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  if (userData) {
    if (!userData.regulationsAccepted) {
      if (pathname !== "/dashboard/regulations") {
        redirect("/dashboard/regulations")
      }
    } else if (userData.isFormerMember === null) {
      if (pathname !== "/dashboard/liberasphere") {
        redirect("/dashboard/liberasphere")
      }
    } else if (pathname === '/dashboard/regulations' || pathname === '/dashboard/liberasphere') {
      // Se l'onboarding è completo, reindirizza alla dashboard principale
      if(userData.isFormerMember === 'yes' && pathname !== '/dashboard/associates') {
        redirect('/dashboard/associates')
      } else if (userData.isFormerMember === 'no' && pathname !== '/dashboard/class-selection') {
        redirect('/dashboard/class-selection')
      } else if (pathname !== '/dashboard') {
         redirect('/dashboard');
      }
    }
  }

  return (
      <div className="flex h-screen w-full bg-background">
        <main className="flex-1 p-8">
            {children}
        </main>
      </div>
  )
}
