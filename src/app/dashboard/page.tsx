
"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { differenceInDays, isPast, format } from "date-fns"
import { it } from "date-fns/locale"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { MemberSummaryCard, type MemberSummaryProps } from "@/components/dashboard/MemberSummaryCard"

interface UserData {
  name: string
  email: string
  isFormerMember: 'yes' | 'no';
  discipline: string;
  lastGrade: string;
  associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
  associationExpiryDate?: Timestamp;
  isInsured?: boolean;
  medicalInfo?: {
    expiryDate?: Timestamp;
    bookingDate?: Timestamp;
    type: 'certificate' | 'booking';
  };
}

const getCurrentSportingSeason = (): string => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11 (Gennaio è 0)

    // La stagione inizia a Settembre (mese 8)
    if (currentMonth >= 8) {
        return `${currentYear}/${currentYear + 1}`;
    } else {
        return `${currentYear - 1}/${currentYear}`;
    }
};

export default function DashboardPage() {
  const [user, authLoading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [certificateStatus, setCertificateStatus] = useState<'valid' | 'expiring' | 'expired' | 'booked' | null>(null);
  const [daysToExpire, setDaysToExpire] = useState<number | null>(null);
  const [memberCardProps, setMemberCardProps] = useState<MemberSummaryProps | null>(null);

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
            
            let statusLabel = "Non Associato";
            if (data.associationStatus === 'pending') {
                statusLabel = 'In Attesa';
            } else if (data.associationStatus === 'active' && data.associationExpiryDate) {
                statusLabel = `Valida fino al ${format(data.associationExpiryDate.toDate(), 'dd/MM/yyyy')}`;
            } else if (data.associationStatus === 'expired') {
                statusLabel = 'Scaduta';
            } else if (data.associationStatus === 'not_associated') {
                statusLabel = 'Non Associato';
            }

            setMemberCardProps({
                name: data.name,
                email: data.email,
                membershipStatus: statusLabel,
                discipline: data.discipline,
                grade: data.lastGrade,
                sportingSeason: getCurrentSportingSeason(),
                isInsured: data.isInsured,
            });

            if (data.medicalInfo?.type === 'certificate' && data.medicalInfo.expiryDate) {
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
            } else if (data.medicalInfo?.type === 'booking') {
                setCertificateStatus('booked');
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
      return <Skeleton className="h-24 w-full mb-6" />;
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
    
    if (certificateStatus === 'booked') {
        return (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Visita Medica Prenotata</AlertTitle>
          <AlertDescription>
            Ricorda di caricare il certificato medico non appena sarà disponibile per completare la tua iscrizione.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {renderCertificateAlert()}
      
      <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {dataLoading ? <Skeleton className="h-9 w-64" /> : `Benvenuto, ${userData?.name?.split(' ')[0] || ''}!`}
          </h1>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dataLoading || !memberCardProps ? (
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-px w-full" />
                <div className="space-y-3">
                   <Skeleton className="h-5 w-full" />
                   <Skeleton className="h-5 w-full" />
                   <Skeleton className="h-5 w-full" />
                   <Skeleton className="h-5 w-full" />
                   <Skeleton className="h-5 w-full" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-6 w-full" />
            </CardFooter>
          </Card>
        ) : (
            <MemberSummaryCard {...memberCardProps} />
        )}
      </div>

    </div>
  )
}
