
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
  medicalCertificateSubmitted: boolean
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
    const onboardingPages = ["/dashboard/regulations", "/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection", "/dashboard/medical-certificate"];

    // Step 1: Regulations check.
    if (!userData.regulationsAccepted) {
      if (pathname !== "/dashboard/regulations") {
        redirect("/dashboard/regulations")
      }
      // Render children because this is the correct page
      return (
        <div className="flex h-screen w-full bg-background">
          <main className="flex-1 p-8">{children}</main>
        </div>
      )
    }

    // Step 2: Main application flow (demographic, payment, etc.).
    if (!userData.applicationSubmitted) {
      const allowedPaths = ["/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection"];
      if (!allowedPaths.some(p => pathname.startsWith(p))) {
         // Redirect to the starting point of the application flow if not on an allowed page
         redirect("/dashboard/liberasphere");
      }
      // Render children because user is in the correct flow
      return (
        <div className="flex h-screen w-full bg-background">
          <main className="flex-1 p-8">{children}</main>
        </div>
      )
    }

    // Step 3: Medical certificate submission.
    if (!userData.medicalCertificateSubmitted) {
        if (pathname !== "/dashboard/medical-certificate") {
            redirect("/dashboard/medical-certificate");
        }
        // Render children because this is the correct page
        return (
          <div className="flex h-screen w-full bg-background">
            <main className="flex-1 p-8">{children}</main>
          </div>
        )
    }
    
    // Step 4: Onboarding is complete.
    // If they try to access any onboarding page now, redirect them to the main dashboard.
    if (onboardingPages.some(p => pathname.startsWith(p))) {
      redirect('/dashboard');
      // Show loader while redirecting
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }
  }

  // User is fully onboarded, render the main dashboard layout.
  return (
      <div className="flex h-screen w-full bg-background">
        <main className="flex-1 p-8">
            {children}
        </main>
      </div>
  )
}
