
"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { differenceInDays, isPast, format, startOfDay } from "date-fns"
import { it } from "date-fns/locale"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle, HeartPulse } from "lucide-react"
import { MemberSummaryCard, type MemberSummaryProps, type TrialLesson } from "@/components/dashboard/MemberSummaryCard"

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
    type: 'certificate';
    expiryDate?: Timestamp;
  };
  trialLessons?: { lessonDate: Timestamp, time: string }[];
}

interface SeasonSettings {
    label: string;
}

export default function DashboardPage() {
  const [user, authLoading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [seasonSettings, setSeasonSettings] = useState<SeasonSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true)
  const [certificateStatus, setCertificateStatus] = useState<'valid' | 'expiring' | 'expired' | null>(null);
  const [daysToExpire, setDaysToExpire] = useState<number | null>(null);
  const [memberCardProps, setMemberCardProps] = useState<MemberSummaryProps | null>(null);

  useEffect(() => {
    if (authLoading) return

    if (user) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid)
          const seasonSettingsRef = doc(db, "settings", "season");
          
          const [userDocSnap, seasonDocSnap] = await Promise.all([
              getDoc(userDocRef),
              getDoc(seasonSettingsRef)
          ]);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserData;
            setUserData(data)
            
            if (seasonDocSnap.exists()) {
                setSeasonSettings(seasonDocSnap.data() as SeasonSettings);
            }
            
            let statusLabel = "Non Associato";
            switch (data.associationStatus) {
                case 'pending':
                    statusLabel = 'In Attesa';
                    break;
                case 'active':
                    statusLabel = data.associationExpiryDate ? `Valida fino al ${format(data.associationExpiryDate.toDate(), 'dd/MM/yyyy')}` : 'Attiva';
                    break;
                case 'expired':
                    statusLabel = 'Scaduta';
                    break;
                case 'not_associated':
                default:
                    statusLabel = 'Non Associato';
                    break;
            }
            
            let medicalStatusLabel = "Non Presente";
            if (data.medicalInfo?.type === 'certificate' && data.medicalInfo.expiryDate) {
                medicalStatusLabel = `Scade il ${format(data.medicalInfo.expiryDate.toDate(), 'dd/MM/yyyy')}`;
            }
            
            const trialLessons: TrialLesson[] | undefined = data.trialLessons?.map(l => ({
                date: l.lessonDate.toDate(),
                time: l.time
            }));


            setMemberCardProps({
                name: data.name,
                email: data.email,
                membershipStatus: statusLabel,
                medicalStatus: medicalStatusLabel,
                discipline: data.discipline,
                grade: data.lastGrade,
                sportingSeason: (seasonDocSnap.data() as SeasonSettings)?.label || 'N/D',
                isInsured: data.isInsured,
                trialLessons: trialLessons
            });

            if (data.medicalInfo?.type === 'certificate' && data.medicalInfo.expiryDate) {
              const expiryDate = startOfDay(data.medicalInfo.expiryDate.toDate());
              const today = startOfDay(new Date());
              const daysDiff = differenceInDays(expiryDate, today);

              setDaysToExpire(daysDiff);
              
              if (daysDiff < 0) {
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
            {daysToExpire > 0 ? `Attenzione, il tuo certificato medico scadrà tra ${daysToExpire} giorni.` : "Attenzione, il tuo certificato medico scade oggi."} Ricordati di rinnovarlo e caricare la nuova versione.
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
      
       <div className="flex justify-center">
        <div className="w-full max-w-2xl">
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
                   <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ) : (
              <MemberSummaryCard {...memberCardProps} />
          )}
        </div>
      </div>

    </div>
  )
}
