
"use client"

import { useEffect, useState, ReactNode } from "react"
import { usePathname, redirect } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { Loader2 } from "lucide-react"
import { isPast } from "date-fns"

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
    const onboardingPages = ["/dashboard/regulations", "/dashboard/medical-certificate", "/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection"];

    // Step 1: Regulations check.
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

    // Step 2: Medical certificate submission & validation.
    const isCertificateExpired = userData.medicalInfo?.expiryDate && isPast(userData.medicalInfo.expiryDate.toDate());
    
    if (!userData.medicalCertificateSubmitted || isCertificateExpired) {
        if (pathname !== "/dashboard/medical-certificate") {
            redirect("/dashboard/medical-certificate");
        }
        return (
          <div className="flex h-screen w-full bg-background">
            <main className="flex-1 p-8">{children}</main>
          </div>
        )
    }

    // Step 3: Main application flow (demographic, payment, etc.).
    if (!userData.applicationSubmitted) {
       const allowedPaths = ["/dashboard/liberasphere", "/dashboard/associates", "/dashboard/class-selection"];
       if (!allowedPaths.some(p => pathname.startsWith(p))) {
           // If user has chosen a path in liberasphere, direct them, otherwise to liberasphere.
           if (userData.isFormerMember === 'yes') {
               redirect("/dashboard/associates");
           } else if (userData.isFormerMember === 'no') {
               redirect("/dashboard/class-selection");
           } else {
               redirect("/dashboard/liberasphere");
           }
       }
       return (
          <div className="flex h-screen w-full bg-background">
            <main className="flex-1 p-8">{children}</main>
          </div>
       )
    }
    
    // Step 4: Onboarding is complete. Redirect away from onboarding pages to main dashboard.
    if (onboardingPages.some(p => pathname.startsWith(p))) {
      redirect('/dashboard');
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
