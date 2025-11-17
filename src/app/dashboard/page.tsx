"use client"

import { useEffect, useState, Suspense } from "react"
import { useToast } from "@/hooks/use-toast"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, Timestamp, collection, getDocs, updateDoc } from "firebase/firestore"
import { differenceInDays, isPast, format, startOfDay } from "date-fns"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useFirebaseMessaging } from "@/hooks/use-firebase-messaging"
import { useSearchParams } from "next/navigation"


import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle, Clock, Smile, Frown, DoorClosed, Mail, CheckCircle, Star } from "lucide-react"
import { MemberSummaryCard, type MemberSummaryProps, type TrialLesson } from "@/components/dashboard/MemberSummaryCard"
import { TotalAwardsCard } from "@/components/dashboard/TotalAwardsCard"
import { AttendancePrompt } from "@/components/dashboard/AttendancePrompt"
import UserBannerList from "@/components/dashboard/UserBannerList"
import Link from "next/link"

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
  taxCode?: string;
  phone?: string;
  birthDate?: Timestamp;
  birthPlace?: string;
  address?: string;
  streetNumber?: string;
  city?: string;
  zipCode?: string;
  province?: string;
  isMinor?: boolean;
  parentData?: {
      parentName: string;
      parentSurname: string;
      parentTaxCode: string;
  };
  associationStatus?: 'pending' | 'active' | 'expired' | 'not_associated';
  associationPaymentFailed?: boolean;
  associationExpiryDate?: Timestamp;
  applicationSubmitted: boolean;
  regulationsAccepted: boolean;
  regulationsAcceptedAt?: Timestamp;
  isInsured?: boolean;
  medicalInfo?: {
    type: 'certificate';
    expiryDate?: Timestamp;
  };
  medicalCertificateStatus?: 'invalid';
  trialLessons?: { eventId: string, startTime: Timestamp, endTime: Timestamp }[];
  trialStatus?: 'active' | 'completed' | 'not_applicable' | 'pending_payment';
  trialPaymentFailed?: boolean;
  trialExpiryDate?: Timestamp;
  trialOutcome?: 'declined' | 'accepted';
  subscriptionAccessStatus?: 'pending' | 'active' | 'expired';
  subscriptionPaymentFailed?: boolean;
  activeSubscription?: {
      subscriptionId: string;
      name: string;
      type: 'monthly' | 'seasonal';
      purchasedAt: Timestamp;
      expiresAt?: Timestamp;
  };
}

interface SeasonSettings {
    label: string;
}

interface Gym {
    id: string;
    name: string;
}

function DashboardContent() {
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth)
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const [userData, setUserData] = useState<UserData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [certificateStatus, setCertificateStatus] = useState<'valid' | 'expiring' | 'expired' | null>(null);
  const [daysToExpire, setDaysToExpire] = useState<number | null>(null);
  const [memberCardProps, setMemberCardProps] = useState<MemberSummaryProps | null>(null);
  const [showDataCorrectionMessage, setShowDataCorrectionMessage] = useState(false);
  const [showSubscriptionActivatedMessage, setShowSubscriptionActivatedMessage] = useState(false);
  const [grades, setGrades] = useState<string[]>([]);
  const [exams, setExams] = useState<Array<{ fromGrade: string; toGrade: string; stars?: number }>>([]);
  const [showAssociationApprovedAlert, setShowAssociationApprovedAlert] = useState(false);

  useFirebaseMessaging((payload) => {
    // Use toast instead of alert for a better UX
    toast({
      title: payload?.notification?.title || 'Nuova notifica',
      description: payload?.notification?.body,
      duration: 5000
    });
  });

  useEffect(() => {
    // Define effectiveUserId at the top so it's available everywhere in this effect
    const effectiveUserId = impersonateId || user?.uid;

    // Logica: se l'ultima lezione di prova è passata (dopo le 20:30), aggiorna trialStatus a 'completed'
    async function checkAndCompleteTrialStatus() {
      if (!user && !impersonateId) return;
      if (!effectiveUserId) return;
      const trialMainDocRef = doc(db, `users/${effectiveUserId}/trialLessons/main`);
      const trialMainDocSnap = await getDoc(trialMainDocRef);
      if (!trialMainDocSnap.exists()) return;
      const trialData = trialMainDocSnap.data();
      const trialLessons = Array.isArray(trialData.lessons) ? trialData.lessons : [];
      if (trialLessons.length === 0) return;
      // Trova la lezione con endTime più alto
      const lastLesson = trialLessons.reduce((prev, curr) => {
        if (!prev.endTime || !curr.endTime) return prev;
        return prev.endTime.toMillis() > curr.endTime.toMillis() ? prev : curr;
      });
      if (!lastLesson.endTime) return;
      const now = new Date();
      const lessonEnd = lastLesson.endTime.toDate();
      // Costruisci la data di oggi alle 20:30
      const lessonEndLimit = new Date(lessonEnd);
      lessonEndLimit.setHours(20, 30, 0, 0);
      if (now > lessonEndLimit) {
        // Aggiorna trialStatus solo se non è già 'completed'
        if (trialData.trialStatus !== 'completed') {
          await updateDoc(trialMainDocRef, { trialStatus: 'completed' });
        }
      }
    }
    checkAndCompleteTrialStatus();
    // Check for the data correction message flag on component mount
    const submissionTimestamp = sessionStorage.getItem('showDataCorrectionMessage');
    if (!localStorage.getItem('showDataCorrectionMessageExpired') && submissionTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const timeSinceSubmission = new Date().getTime() - new Date(submissionTimestamp).getTime();
      if (timeSinceSubmission < oneHour) {
        setShowDataCorrectionMessage(true);
        // Show toast only once
        if (!sessionStorage.getItem('dataCorrectionToastShown')) {
          toast({
            title: "Controlla i tuoi dati",
            description: "Se hai notato errori, invia entro 1 ora una email di correzione a: segreteria@artimarzialivalledaosta.com.",
            variant: "default",
          });
          sessionStorage.setItem('dataCorrectionToastShown', 'true');
        }
      } else {
        // Clean up se l'ora è passata e segna come scaduto
        sessionStorage.removeItem('showDataCorrectionMessage');
        sessionStorage.removeItem('dataCorrectionToastShown');
        localStorage.setItem('showDataCorrectionMessageExpired', 'true');
      }
    }
    
    // Check for subscription activation message
    const subActivationTimestamp = sessionStorage.getItem('showSubscriptionActivatedMessage');
     if (subActivationTimestamp) {
        setShowSubscriptionActivatedMessage(true);
        // Clean up immediately after showing
        sessionStorage.removeItem('showSubscriptionActivatedMessage');
    }

    if (authLoading) return

    // Evita fetch se authLoading è true o (user non c'è e non c'è impersonateId)
    if (authLoading || (!user && !impersonateId)) return;
    if (effectiveUserId) {
      const fetchUserData = async () => {
        try {
          // Ottieni snapshot delle palestre
          const gymsSnapshot = await getDocs(collection(db, "gyms"));
          const gymsMap = new Map<string, string>();
          gymsSnapshot.forEach((doc: any) => gymsMap.set(doc.id, doc.data().name));

          // Ottieni snapshot utente
          const userDocSnap = await getDoc(doc(db, `users/${effectiveUserId}`));
          // Ottieni config karate
          const karateConfigSnap = await getDoc(doc(db, "config/karate"));
          // Ottieni stato pagamento abbonamento
          const paymentStatusSnap = await getDoc(doc(db, `users/${effectiveUserId}/payments/status`));
          // Ottieni stagione sportiva
          const seasonDocSnap = await getDoc(doc(db, "config/season"));
          // Ottieni lezioni di prova
          const trialMainDocSnap = await getDoc(doc(db, `users/${effectiveUserId}/trialLessons/main`));

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserData;
            // Carico grades da config/karate
            const gradesArr = (karateConfigSnap.exists() && Array.isArray(karateConfigSnap.data()?.grades)) ? karateConfigSnap.data()!.grades as string[] : [];
            setGrades(gradesArr);
            // Carico exams da budoPassExtra
            const examsArr = (data as any)?.budoPassExtra?.exams || [];
            setExams(examsArr);
            // Leggi lezioni di prova e stato dal documento unico 'main'
            let trialStatus = data.trialStatus;
            let trialExpiryDate = data.trialExpiryDate;
            let trialLessonsArr: { eventId: string; startTime: Timestamp; endTime: Timestamp }[] = [];
            if (trialMainDocSnap.exists()) {
              const trialData = trialMainDocSnap.data();
              trialStatus = trialData.trialStatus;
              trialExpiryDate = trialData.trialExpiryDate;
              trialLessonsArr = Array.isArray(trialData.lessons) ? trialData.lessons : [];
            }
            // Leggi stato pagamento abbonamento
            let subscriptionAccessStatus = data.subscriptionAccessStatus;
            let paymentStatus = undefined;
            if (paymentStatusSnap.exists()) {
              const paymentStatusData = paymentStatusSnap.data();
              paymentStatus = paymentStatusData.status;
              if (paymentStatus === 'completed') {
                subscriptionAccessStatus = 'active';
                // Se il pagamento è completato e lo stato delle lezioni è ancora 'pending_payment', aggiorna a 'active'
                if (trialStatus === 'pending_payment') {
                  const trialMainDocRef = doc(db, `users/${effectiveUserId}/trialLessons/main`);
                  await updateDoc(trialMainDocRef, { trialStatus: 'active' });
                  // Rileggi il documento main aggiornato
                  const updatedTrialMainDocSnap = await getDoc(trialMainDocRef);
                  if (updatedTrialMainDocSnap.exists()) {
                    const updatedTrialData = updatedTrialMainDocSnap.data();
                    trialStatus = updatedTrialData.trialStatus;
                    trialExpiryDate = updatedTrialData.trialExpiryDate;
                    trialLessonsArr = Array.isArray(updatedTrialData.lessons) ? updatedTrialData.lessons : [];
                  }
                }
              } else if (paymentStatus === 'pending') {
                subscriptionAccessStatus = 'pending';
              } else if (paymentStatus === 'expired') {
                subscriptionAccessStatus = 'expired';
              }
            }
            setUserData({ ...data, trialStatus, trialExpiryDate, trialLessons: trialLessonsArr, subscriptionAccessStatus });
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
              const today = startOfDay(new Date());
              const expiryDate = startOfDay(expiry);
              const daysDiff = differenceInDays(expiryDate, today);
              if (daysDiff < 0) {
                certStatus = 'expired';
                medicalStatusLabel = 'SCADUTO';
              } else if (daysDiff <= 30) {
                certStatus = 'expiring';
                medicalStatusLabel = `Scade il ${format(expiry, 'dd/MM/yyyy')}`;
              } else {
                certStatus = 'valid';
                medicalStatusLabel = `Scade il ${format(expiry, 'dd/MM/yyyy')}`;
              }
              setCertificateStatus(certStatus);
              setDaysToExpire(daysDiff);
            }
            const regulationsStatusLabel = data.regulationsAccepted 
              ? "Accettati"
              : "Non Accettati";
            // Nuovo: usa trialLessonsArr e trialStatus
            const trialLessons: TrialLesson[] | undefined = 
              (trialStatus === 'active' || trialStatus === 'pending_payment') && trialLessonsArr.length > 0
              ? trialLessonsArr.map(l => ({
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
            if(trialStatus === 'pending_payment' && trialLessonsArr.length > 0) {
              trialStatusLabel = "In attesa di approvazione pagamento";
            } else if(trialStatus === 'active') {
              trialStatusLabel = "Attiva";
            } else if(trialStatus === 'completed') {
              trialStatusLabel = "Completata";
            } else if(trialLessonsArr.length > 0) {
              trialStatusLabel = "Lezioni di prova prenotate";
            }
            let subscriptionStatusLabel: string | undefined = undefined;
            let subscriptionValidityMonth: string | undefined = undefined;
            if (data.subscriptionPaymentFailed) {
              subscriptionStatusLabel = "Non Approvato";
            } else if (subscriptionAccessStatus && data.activeSubscription && data.activeSubscription.type === 'monthly') {
               switch(subscriptionAccessStatus) {
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
            } else if (subscriptionAccessStatus && data.activeSubscription) { // Abbonamento non mensile
               switch(subscriptionAccessStatus) {
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
              regulationsAccepted: data.regulationsAccepted,
              regulationsAcceptedAt: data.regulationsAcceptedAt?.toDate(),
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
              trialStatusState: trialStatus,
              subscriptionType: data.activeSubscription?.name,
              subscriptionStatus: subscriptionStatusLabel,
              subscriptionValidity: subscriptionValidityMonth,
              taxCode: data.taxCode,
              phone: data.phone,
              birthDate: data.birthDate instanceof Timestamp ? data.birthDate.toDate() : undefined,
              birthPlace: data.birthPlace,
              fullAddress: data.address ? `${data.address}, ${data.streetNumber}, ${data.zipCode} ${data.city} (${data.province})` : undefined,
              isMinor: data.isMinor,
              parentData: data.parentData,
              grades: gradesArr,
              exams: examsArr,
            });
          }
        } catch (error) {
          console.error("Error fetching user data for dashboard:", error)
        } finally {
          setDataLoading(false)
        }
      }
      fetchUserData();
    } else {
      setDataLoading(false);
    }
  }, [user, authLoading, impersonateId]);

  // Aggiorna subscriptionAccessStatus a 'expired' se la data di scadenza è passata
  useEffect(() => {
    if (
      userData?.activeSubscription?.expiresAt &&
      userData?.activeSubscription?.type === 'monthly'
    ) {
      const expiryDate = userData.activeSubscription.expiresAt.toDate();
      const today = new Date();
      if (expiryDate < today && userData.subscriptionAccessStatus === 'active') {
        setUserData({
          ...userData,
          subscriptionAccessStatus: 'expired',
        });
      }
    }
  }, [userData]);

  const handleRenewCertificate = async () => {
    if (!user) return;
    // Rimuovi lo stato invalid prima di reindirizzare
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { medicalCertificateStatus: null });
    router.push('/dashboard/renew-medical-certificate');
  }

  // Sposto la logica di useEffect per il messaggio di associazione approvata qui, nel corpo del componente
  useEffect(() => {
    if (
      userData?.associationStatus === 'active' &&
      userData.subscriptionAccessStatus !== 'active' &&
      userData.subscriptionAccessStatus !== 'pending' &&
      !sessionStorage.getItem('associationApprovedAlertShown')
    ) {
      sessionStorage.setItem('associationApprovedAlertShown', 'true');
      setShowAssociationApprovedAlert(true);
    }
  }, [userData]);

  function renderInfoAlerts() {
    const alerts = [];

    if (userData?.associationPaymentFailed) {
        alerts.push(
            <Alert key="assoc-failed" variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Domanda di Associazione Rifiutata</AlertTitle>
                <AlertDescription>
                    La tua domanda non è stata approvata in quanto l'importo non è stato trasferito sul nostro conto corrente. Verifica ed effettua un nuovo pagamento.
                </AlertDescription>
                 <Button onClick={() => router.push('/dashboard/associates?step=2')} variant="secondary" className="mt-4">
                    Procedi al Pagamento
                </Button>
            </Alert>
        );
    }
    
     if (userData?.trialPaymentFailed) {
        alerts.push(
            <Alert key="trial-failed" variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pagamento Lezioni di Prova Fallito</AlertTitle>
                <AlertDescription>
                    La tua iscrizione alle lezioni di prova non è andata a buon fine. Per favore, ripeti la procedura di iscrizione.
                </AlertDescription>
                 <Button onClick={() => router.push('/dashboard/class-selection')} variant="secondary" className="mt-4">
                    Iscriviti alle Lezioni
                </Button>
            </Alert>
        );
    }

    if (userData?.subscriptionPaymentFailed) {
    alerts.push(
      <div key="sub-failed" className="mb-6 w-full max-w-lg p-4 rounded-lg border-2 font-semibold text-base text-center" style={{ background: '#FFEAEA', color: '#B91C1C', borderColor: '#B91C1C', margin: '0 auto' }}>
        <div className="flex items-center justify-center mb-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-xl font-bold">Pagamento Abbonamento Fallito</span>
        </div>
        <div className="mb-2">La tua richiesta di abbonamento non è andata a buon fine. Per favore, procedi a un nuovo acquisto.</div>
        <Button onClick={() => router.push('/dashboard/subscriptions')} variant="secondary" style={{ color: '#B91C1C', borderColor: '#B91C1C', background: '#fff' }} className="mt-2 font-bold">
          Vai agli Abbonamenti
        </Button>
      </div>
    );
    }

    if (userData?.medicalCertificateStatus === 'invalid') {
        alerts.push(
            <Alert key="cert-invalid" variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Certificato Medico non Valido</AlertTitle>
                <AlertDescription>
                    Il certificato che hai caricato è stato respinto. Caricane uno nuovo per ripristinare la tua copertura assicurativa e l'accesso completo alle attività.
                </AlertDescription>
                <Button onClick={handleRenewCertificate} variant="secondary" className="mt-4">
                    Aggiorna Certificato
                </Button>
            </Alert>
        );
    }

  // Mostra il toast solo se non è scaduto
  if (showDataCorrectionMessage && !localStorage.getItem('showDataCorrectionMessageExpired')) {
  alerts.push(
    <Alert key="data-correction" variant="warning" className="mb-6">
      <Mail className="h-4 w-4" />
      <AlertTitle>Controlla i tuoi dati</AlertTitle>
      <AlertDescription>
        Se hai notato errori, invia entro 1 ora una email di correzione a: <a href="mailto:segreteria@artimarzialivalledaosta.com" className="font-semibold underline">segreteria@artimarzialivalledaosta.com</a>.
      </AlertDescription>
    </Alert>
  );
  }

    if (showSubscriptionActivatedMessage && userData?.activeSubscription) {
        alerts.push(
          <Alert key="sub-activated" variant="success" className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Abbonamento Attivato!</AlertTitle>
              <AlertDescription>
                  Il tuo abbonamento "{userData.activeSubscription.name}" è attivo!
              </AlertDescription>
          </Alert>
        );
    }

    if (
      showAssociationApprovedAlert && userData?.subscriptionAccessStatus !== 'expired'
    ) {
      alerts.push(
        <Alert key="sub-choice" variant="success" className="mb-6">
          <Smile className="h-4 w-4" />
          <AlertTitle>Associazione Approvata!</AlertTitle>
          <AlertDescription>
            La tua Associazione è stata Approvata. Ora puoi procedere alla scelta del tuo Abbonamento dal menu: Abbonamenti.
          </AlertDescription>
        </Alert>
      );
    }

    if (userData?.subscriptionAccessStatus === 'pending') {
        alerts.push(
          <Alert key="sub-pending" variant="warning" className="mb-6">
            <DoorClosed className="h-4 w-4" />
            <AlertTitle>Abbonamento in Attesa</AlertTitle>
            <AlertDescription>
              Il tuo accesso ai corsi sarà attivato non appena il pagamento del tuo abbonamento verrà confermato dalla segreteria.
            </AlertDescription>
          </Alert>
        );
    }
    
    if (userData?.associationStatus === 'pending') {
        alerts.push(
          <Alert key="assoc-pending" variant="warning" className="mb-6 bg-orange-100 border-orange-500 text-orange-700">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Domanda di Associazione Inviata!</AlertTitle>
            <AlertDescription className="text-orange-700">
              La tua richiesta è in attesa di approvazione. Riceverai una notifica non appena il pagamento sarà confermato e lo stato aggiornato.
            </AlertDescription>
          </Alert>
        );
    }
    
    if (userData?.trialStatus === 'pending_payment') {
         alerts.push(
          <Alert key="trial-pending" variant="warning" className="mb-6">
            <Clock className="h-4 w-4" />
            <AlertTitle>Richiesta Lezioni di Prova Inviata!</AlertTitle>
            <AlertDescription>
              La tua iscrizione è in attesa di approvazione. Riceverai una notifica non appena il pagamento sarà confermato.
            </AlertDescription>
          </Alert>
        );
    }

    if (userData?.trialOutcome === 'declined') {
        alerts.push(
          <Alert key="trial-declined" variant="info" className="mb-6">
            <Frown className="h-4 w-4" />
            <AlertTitle>Ci dispiace vederti andare</AlertTitle>
            <AlertDescription>
              Grazie per aver provato i nostri corsi. Le nostre porte per te sono sempre aperte se dovessi cambiare idea in futuro!
            </AlertDescription>
          </Alert>
        );
    }
    
    if (certificateStatus === 'expired') {
      alerts.push(
        <div key="cert-expired" className="mb-6 w-full max-w-2xl mx-auto">
          <Alert variant="destructive" className="bg-white">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Certificato Medico Scaduto!</AlertTitle>
            <AlertDescription>
              Il tuo certificato medico è scaduto. Per continuare le attività, devi caricarne uno nuovo.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    if (certificateStatus === 'expiring' && daysToExpire !== null) {
      alerts.push(
        <div key="cert-expiring" className="mb-6 w-full max-w-2xl mx-auto">
          <Alert variant="warning" className="bg-white">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Certificato Medico in Scadenza</AlertTitle>
            <AlertDescription>
              {daysToExpire > 0 ? `Attenzione, il tuo certificato medico scadrà tra ${daysToExpire} giorni.` : "Attenzione, il tuo certificato medico scade oggi."} Ricordati di rinnovarlo e caricare la nuova versione.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (userData?.subscriptionAccessStatus === 'expired' && userData?.activeSubscription?.type === 'monthly') {
      alerts.push(
        <Alert key="sub-expired" variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Abbonamento Mensile Scaduto</AlertTitle>
          <AlertDescription>
            Il tuo abbonamento mensile è scaduto. Per continuare ad accedere ai corsi, acquista un nuovo abbonamento dal menu Abbonamenti.
          </AlertDescription>
          <Button onClick={() => router.push('/dashboard/subscriptions')} variant="secondary" className="mt-4">
            Vai agli Abbonamenti
          </Button>
        </Alert>
      );
    }

    return alerts.length > 0 ? <>{alerts}</> : null;
  }

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold text-center">
         {dataLoading ? <Skeleton className="h-8 w-56 mx-auto" /> : `Benvenuto, ${userData?.name?.split(' ')[0] || ''}!`}
      </h1>

      <Suspense fallback={<div><Skeleton className="h-24 w-full mb-6" /></div>}>
        <AttendancePrompt />
        <UserBannerList userId={impersonateId || user?.uid} />
      </Suspense>

      {dataLoading ? <Skeleton className="h-24 w-full mb-6" /> : renderInfoAlerts()}
      
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <TotalAwardsCard userId={impersonateId || user?.uid} />
          
          {/* Icona Leggi Recensioni */}
          <div className="mt-4 flex justify-center">
            <Button asChild variant="outline" className="border-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 font-semibold">
              <Link href="/dashboard/reviews" className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Leggi recensioni
              </Link>
            </Button>
          </div>
        </div>
        <div className="w-full max-w-2xl mt-2">
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

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
            <DashboardContent />
        </Suspense>
    )
}
