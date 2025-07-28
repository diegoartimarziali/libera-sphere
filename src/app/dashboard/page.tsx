
"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { differenceInDays, isPast, format } from "date-fns"
import { it } from "date-fns/locale"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle } from "lucide-react"

interface MedicalInfo {
  expiryDate?: Timestamp;
}

interface UserData {
  name: string
  medicalInfo?: MedicalInfo;
}

export default function DashboardPage() {
  const [user, authLoading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [certificateStatus, setCertificateStatus] = useState<'valid' | 'expiring' | 'expired' | null>(null);
  const [daysToExpire, setDaysToExpire] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return

    if (user) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserData;
            setUserData(data)
            
            if (data.medicalInfo?.expiryDate) {
              const expiryDate = data.medicalInfo.expiryDate.toDate();
              const today = new Date();
              const daysDiff = differenceInDays(expiryDate, today);

              setDaysToExpire(daysDiff);

              if (isPast(expiryDate)) {
                setCertificateStatus('expired');
              } else if (daysDiff <= 20) {
                setCertificateStatus('expiring');
              } else {
                setCertificateStatus('valid');
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data for dashboard:", error)
        } finally {
          setDataLoading(false)
        }
      }
      fetchUserData()
    } else {
        setDataLoading(false)
    }
  }, [user, authLoading])

  const renderCertificateAlert = () => {
    if (dataLoading) {
      return <Skeleton className="h-24 w-full" />;
    }
    
    if (certificateStatus === 'expired') {
      return (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Certificato Medico Scaduto!</AlertTitle>
          <AlertDescription>
            Il tuo certificato medico è scaduto. Per continuare le attività, devi caricarne uno nuovo.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (certificateStatus === 'expiring' && daysToExpire !== null) {
      return (
        <Alert className="mb-6 border-yellow-500 text-yellow-700 [&>svg]:text-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Certificato Medico in Scadenza</AlertTitle>
          <AlertDescription>
            Attenzione, il tuo certificato medico scadrà tra {daysToExpire} giorni. Ricordati di rinnovarlo e caricare la nuova versione.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return (
    <div>
      {renderCertificateAlert()}
      
      <h1 className="text-3xl font-bold">
        {dataLoading ? <Skeleton className="h-9 w-1/2" /> : `Benvenuto in LiberaSphere, ${userData?.name?.split(' ')[0] || ''}!`}
      </h1>
      <div className="mt-4 text-muted-foreground">
        {dataLoading ? <Skeleton className="h-5 w-3/4" /> : "Questa è la tua dashboard. Da qui potrai gestire la tua iscrizione e le tue attività."}
      </div>
    </div>
  )
}
