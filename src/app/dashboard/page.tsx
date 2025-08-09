
"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, Timestamp, collection, getDocs } from "firebase/firestore"
import { differenceInDays, isPast, format, startOfDay } from "date-fns"
import { it } from "date-fns/locale"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle, Clock, Smile, Frown, DoorClosed } from "lucide-react"
import { MemberSummaryCard, type MemberSummaryProps, type TrialLesson } from "@/components/dashboard/MemberSummaryCard"
import { AttendancePrompt } from "@/components/dashboard/AttendancePrompt"

interface UserData {
  name: string
  surname: string
  email: string
  isFormerMember: 'yes' | 'no';
  firstYear?: string;
  discipline: string;
  gym?: string;
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
  trialLessons?: { eventId: string, startTime: Timestamp, endTime: Timestamp }[];
  trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
  trialOutcome?: 'declined' | 'accepted';
  subscriptionAccessStatus?: 'pending' | 'active' | 'expired';
  activeSubscription?: {
      name: string;
      type: 'monthly' | 'seasonal';
      expiresAt?: Timestamp;
  }
}

interface SeasonSettings {
    label: string;
}

interface Gym {
    id: string;
    name: string;
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
          const gymsCollectionRef = collection(db, "gyms");
          
          const [userDocSnap, seasonDocSnap, gymsSnapshot] = await Promise.all([
              getDoc(userDocRef),
              getDoc(seasonSettingsRef),
              getDocs(gymsCollectionRef)
          ]);
          
          const gymsMap = new Map<string, string>();
          gymsSnapshot.forEach(doc => gymsMap.set(doc.id, doc.data().name));

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
            let certStatus: 'valid' | 'expiring' | 'expired' | null = null;
            if (data.medicalInfo?.type === 'certificate' && data.medicalInfo.expiryDate) {
                const expiry = data.medicalInfo.expiryDate.toDate();
                medicalStatusLabel = `Scade il ${format(expiry, 'dd/MM/yyyy')}`;
                
                const today = startOfDay(new Date());
                const expiryDate = startOfDay(expiry);
                const daysDiff = differenceInDays(expiryDate, today);

                if (daysDiff < 0) {
                    certStatus = 'expired';
                } else if (daysDiff <= 20) {
                    certStatus = 'expiring';
                } else {
                    certStatus = 'valid';
                }
                setCertificateStatus(certStatus);
                setDaysToExpire(daysDiff);
            }

            const regulationsStatusLabel = data.regulationsAccepted ? "Accettati" : "Non Accettati";
            
            const trialLessons: TrialLesson[] | undefined = 
                (data.trialStatus === 'active' || data.trialStatus === 'pending_payment') && data.trialLessons
                ? data.trialLessons.map(l => ({
                    date: l.startTime.toDate(),
                    time: format(l.startTime.toDate(), "HH:mm")
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
            if(data.trialStatus === 'completed') trialStatusLabel = "Completata";

            let subscriptionStatusLabel: string | undefined = undefined;
            let subscriptionValidityMonth: string | undefined = undefined;

            if (data.subscriptionAccessStatus && data.activeSubscription && data.activeSubscription.type === 'monthly') {
                 switch(data.subscriptionAccessStatus) {
                    case 'pending': 
                        subscriptionStatusLabel = 'In attesa di approvazione'; 
                        break;
                    case 'expired': 
                        subscriptionStatusLabel = 'Scaduto'; 
                        break;
                    case 'active':
                         if (data.activeSubscription.expiresAt) {
                            const expiryDate = startOfDay(data.activeSubscription.expiresAt.toDate());
                            const today = startOfDay(new Date());
                            const daysDiff = differenceInDays(expiryDate, today);
                            if (isPast(expiryDate)) {
                                subscriptionStatusLabel = 'Scaduto';
                            } else if (daysDiff <= 4) {
                                subscriptionStatusLabel = 'In scadenza';
                            } else {
                                subscriptionStatusLabel = 'Attivo';
                            }
                        } else {
                            subscriptionStatusLabel = 'Attivo';
                        }
                        break;
                }
                 if (data.activeSubscription.expiresAt) {
                    subscriptionValidityMonth = format(data.activeSubscription.expiresAt.toDate(), "MMMM yyyy", { locale: it });
                }
            } else if (data.subscriptionAccessStatus && data.activeSubscription) { // Abbonamento non mensile
                 switch(data.subscriptionAccessStatus) {
                    case 'pending': 
                        subscriptionStatusLabel = 'In attesa di approvazione'; 
                        break;
                    case 'expired': 
                        subscriptionStatusLabel = 'Scaduto'; 
                        break;
                    case 'active':
                        subscriptionStatusLabel = 'Attivo';
                        break;
                 }
            }

            setMemberCardProps({
                name: `${data.name} ${data.surname}`,
                email: data.email,
                socioDal: socioDalYear,
                sportingSeason: (seasonDocSnap.data() as SeasonSettings)?.label || 'N/D',
                regulationsStatus: regulationsStatusLabel,
                medicalStatus: medicalStatusLabel,
                medicalStatusState: certStatus,
                gymName: data.gym ? `${data.gym}, ${gymsMap.get(data.gym)}` : undefined,
                discipline: data.discipline,
                grade: data.lastGrade,
                qualifica: data.qualification,
                membershipStatus: membershipStatusLabel,
                membershipStatusState: data.associationStatus,
                isInsured: data.isInsured,
                trialLessons: trialLessons,
                trialStatus: trialStatusLabel,
                trialStatusState: data.trialStatus,
                subscriptionType: data.activeSubscription?.name,
                subscriptionStatus: subscriptionStatusLabel,
                subscriptionValidity: subscriptionValidityMonth,
            });

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
      
      if (userData?.subscriptionAccessStatus === 'pending') {
          return (
            <Alert variant="warning" className="mb-6">
              <DoorClosed className="h-4 w-4" />
              <AlertTitle>Abbonamento in Attesa</AlertTitle>
              <AlertDescription>
                Il tuo accesso ai corsi sarà attivato non appena il pagamento del tuo abbonamento verrà confermato dalla segreteria.
              </AlertDescription>
            </Alert>
          );
      }
      
      if (userData?.associationStatus === 'pending') {
          return (
            <Alert variant="warning" className="mb-6">
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
            <Alert variant="warning" className="mb-6">
              <Clock className="h-4 w-4" />
              <AlertTitle>Richiesta Lezioni di Prova Inviata!</AlertTitle>
              <AlertDescription>
                La tua iscrizione è in attesa di approvazione. Riceverai una notifica non appena il pagamento sarà confermato.
              </AlertDescription>
            </Alert>
          );
      }

      if (userData?.trialOutcome === 'declined') {
          return (
            <Alert variant="info" className="mb-6">
              <Frown className="h-4 w-4" />
              <AlertTitle>Ci dispiace vederti andare</AlertTitle>
              <AlertDescription>
                Grazie per aver provato i nostri corsi. Le nostre porte per te sono sempre aperte se dovessi cambiare idea in futuro!
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
          <Alert variant="warning" className="mb-6">
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

      <AttendancePrompt />

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
