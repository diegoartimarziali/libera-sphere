
"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { differenceInDays, isPast, format, startOfDay } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle, Clock } from "lucide-react"
import { MemberSummaryCard, type MemberSummaryProps, type TrialLesson } from "@/components/dashboard/MemberSummaryCard"

interface UserData {
  name: string
  surname: string
  email: string
  isFormerMember: 'yes' | 'no';
  firstYear?: string;
  discipline: string;
  lastGrade: string;
  qualification: string;
  createdAt: Timestamp;
  associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
  associationExpiryDate?: Timestamp;
  applicationSubmitted: boolean;
  regulationsAccepted: boolean;
  isInsured?: boolean;
  medicalInfo?: {
    type: 'certificate';
    expiryDate?: Timestamp;
  };
  trialLessons?: { lessonDate: Timestamp, time: string }[];
  trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
}

interface SeasonSettings {
    label: string;
}

export default function DashboardPage() {
  const [user, authLoading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
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
            
            let membershipStatusLabel = "Non Associato";
            switch (data.associationStatus) {
                case 'pending':
                    membershipStatusLabel = 'In Attesa di Approvazione';
                    break;
                case 'active':
                    membershipStatusLabel = data.associationExpiryDate ? `Valida fino al ${format(data.associationExpiryDate.toDate(), 'dd/MM/yyyy')}` : 'Attiva';
                    break;
                case 'expired':
                    membershipStatusLabel = 'Scaduta';
                    break;
                case 'not_associated':
                default:
                    membershipStatusLabel = 'Non Associato';
                    break;
            }
            
            let medicalStatusLabel = "Non Presente";
            if (data.medicalInfo?.type === 'certificate' && data.medicalInfo.expiryDate) {
                medicalStatusLabel = `Scade il ${format(data.medicalInfo.expiryDate.toDate(), 'dd/MM/yyyy')}`;
            }

            const regulationsStatusLabel = data.regulationsAccepted ? "Accettati" : "Non Accettati";
            
            const trialLessons: TrialLesson[] | undefined = 
                (data.trialStatus === 'active' || data.trialStatus === 'pending_payment') && data.trialLessons
                ? data.trialLessons.map(l => ({
                    date: l.lessonDate.toDate(),
                    time: l.time
                }))
                : undefined;
                
            let socioDalYear: string | undefined;
            if (data.associationStatus === 'active' || data.associationStatus === 'pending') {
                if (data.isFormerMember === 'yes' && data.firstYear) {
                    socioDalYear = data.firstYear;
                } else {
                    socioDalYear = format(data.createdAt.toDate(), 'yyyy');
                }
            }
            
            let trialStatusLabel: string | undefined = undefined;
            if(data.trialStatus === 'pending_payment') trialStatusLabel = "In attesa di approvazione pagamento";
            if(data.trialStatus === 'active') trialStatusLabel = "Attiva";


            setMemberCardProps({
                name: `${data.name} ${data.surname}`,
                email: data.email,
                socioDal: socioDalYear,
                sportingSeason: (seasonDocSnap.data() as SeasonSettings)?.label || 'N/D',
                regulationsStatus: regulationsStatusLabel,
                medicalStatus: medicalStatusLabel,
                discipline: data.discipline,
                grade: data.lastGrade,
                qualifica: data.qualification,
                membershipStatus: membershipStatusLabel,
                isInsured: data.isInsured,
                trialLessons: trialLessons,
                trialStatus: trialStatusLabel
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

  const renderInfoAlert = () => {
      if (dataLoading) {
        return <Skeleton className="h-24 w-full mb-6" />;
      }
      
      if (userData?.associationStatus === 'pending') {
          return (
            <Alert className="mb-6">
              <Clock className="h-4 w-4" />
              <AlertTitle>Domanda di Associazione Inviata!</AlertTitle>
              <AlertDescription>
                La tua richiesta è in attesa di approvazione. Riceverai una notifica non appena il pagamento sarà confermato e lo stato aggiornato.
              </AlertDescription>
            </Alert>
          );
      }
      
      if (userData?.trialStatus === 'pending_payment') {
           return (
            <Alert className="mb-6">
              <Clock className="h-4 w-4" />
              <AlertTitle>Richiesta Lezioni di Prova Inviata!</AlertTitle>
              <AlertDescription>
                La tua iscrizione è in attesa di approvazione. Riceverai una notifica non appena il pagamento sarà confermato.
              </AlertDescription>
            </Alert>
          );
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
       <h1 className="text-3xl font-bold">
         {dataLoading ? <Skeleton className="h-9 w-64" /> : `Benvenuto, ${userData?.name?.split(' ')[0] || ''}!`}
      </h1>

      {renderInfoAlert()}
      
       <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          {dataLoading || !memberCardProps ? (
            <Card>
              <CardHeader className="flex flex-col items-center p-4 text-center">
                  <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-48 mx-auto" />
                      <Skeleton className="h-4 w-64 mx-auto" />
                  </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                  <div className="space-y-3">
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                  </div>
                   <Skeleton className="h-px w-full" />
                  <div className="space-y-3">
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-5 w-full" />
                  </div>
              </CardContent>
            </Card>
          ) : (
              <MemberSummaryCard {...memberCardProps} />
          )}
        </div>
      </div>

    </div>
  )
}
