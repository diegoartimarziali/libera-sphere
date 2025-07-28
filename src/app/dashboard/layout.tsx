
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
  applicationSubmitted: boolean
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loadingAuth] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    if (loadingAuth) return;
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
    const onboardingPages = ["/dashboard/regulations", "/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection"];

    // Step 1: Regulations check. This is the first gate.
    if (!userData.regulationsAccepted) {
      if (pathname !== "/dashboard/regulations") {
        redirect("/dashboard/regulations")
      }
      return (
        <div className="flex h-screen w-full bg-background">
          <main className="flex-1 p-8">{children}</main>
        </div>
      )
    }

    // Step 2: Onboarding Flow. User has accepted regulations but not submitted application.
    if (!userData.applicationSubmitted) {
      const allowedPaths = ["/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection"];
      // If the user is not on one of the allowed onboarding pages, redirect them to the start of their specific flow.
      if (!allowedPaths.some(p => pathname.startsWith(p))) {
         if (userData.isFormerMember === null) {
            redirect("/dashboard/liberasphere");
         } else if (userData.isFormerMember === 'yes') {
            redirect("/dashboard/associates");
         } else { // isFormerMember === 'no'
            redirect("/dashboard/class-selection");
         }
      }
       return (
        <div className="flex h-screen w-full bg-background">
          <main className="flex-1 p-8">{children}</main>
        </div>
      )
    }
    
    // Step 3: Onboarding is complete. User can access the main dashboard.
    // If they try to access any onboarding page, redirect them to the main dashboard.
    if (onboardingPages.some(p => pathname.startsWith(p))) {
      redirect('/dashboard');
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
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
