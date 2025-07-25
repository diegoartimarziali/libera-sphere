

"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Star, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { format, differenceInDays, parse, formatDistanceToNowStrict, lastDayOfMonth, isWithinInterval } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Separator } from "./ui/separator"
import { Button } from "./ui/button"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, Unsubscribe } from "firebase/firestore"

const kanjiList = ['道', '力', '心', '技', '武', '空', '合', '気', '侍'];

const capitalizeName = (name: string) => {
    if (!name) return "";
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

interface StageParticipation {
    tutti: number;
    cintureNere: number;
    insegnanti: number;
}

interface TotalStages {
    tutti: number;
    cintureNere: number;
    insegnanti: number;
}


export function MemberSummaryCard() {
  const [userName, setUserName] = useState("Utente");
  const [codiceFiscale, setCodiceFiscale] = useState<string | null>(null);
  const [birthDateString, setBirthDateString] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [comune, setComune] = useState<string | null>(null);
  const [provincia, setProvincia] = useState<string | null>(null);
  const [randomKanji, setRandomKanji] = useState<string | null>(null);
  const [regulationsAccepted, setRegulationsAccepted] = useState(false);
  const [acceptanceDate, setAcceptanceDate] = useState<string | null>(null);
  const [lessonDate, setLessonDate] = useState<string | null>(null);
  const [selectedDojo, setSelectedDojo] = useState<string | null>(null);
  const [associationStatus, setAssociationStatus] = useState<'none' | 'requested' | 'approved'>('none');
  const [associationDate, setAssociationDate] = useState<string | null>(null);
  const [membershipDuration, setMembershipDuration] = useState<string | null>(null);
  const [birthplace, setBirthplace] = useState<string | null>(null);
  const [civicNumber, setCivicNumber] = useState<string | null>(null);
  const [cap, setCap] = useState<string | null>(null);
  const [certificateExpiration, setCertificateExpiration] = useState<Date | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [firstAssociationYear, setFirstAssociationYear] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [isInsured, setIsInsured] = useState(false);
  const [martialArt, setMartialArt] = useState<string | null>(null);
  const [isSelectionPassportComplete, setIsSelectionPassportComplete] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const [monthlyStatus, setMonthlyStatus] = useState<'valido' | 'in_scadenza' | 'scaduto' | 'non_attivo'>('non_attivo');
  
  const [participation, setParticipation] = useState<StageParticipation>({ tutti: 0, cintureNere: 0, insegnanti: 0 });
  const [totalStages, setTotalStages] = useState<TotalStages>({ tutti: 0, cintureNere: 0, insegnanti: 0 });
  const [loadingParticipation, setLoadingParticipation] = useState(true);


  useEffect(() => {
    // This effect runs once to get all static data from localStorage
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setUserName(capitalizeName(storedName));
      }
      setCodiceFiscale(localStorage.getItem("codiceFiscale"));
      setBirthDateString(localStorage.getItem("birthDate"));
      setBirthplace(localStorage.getItem("birthplace"));
      setAddress(localStorage.getItem("address"));
      setCivicNumber(localStorage.getItem("civicNumber"));
      setCap(localStorage.getItem("cap"));
      setComune(localStorage.getItem("comune"));
      setProvincia(localStorage.getItem("provincia"));
      setMartialArt(localStorage.getItem("martialArt"));

      const storedRegulations = localStorage.getItem('regulationsAccepted');
      if (storedRegulations === 'true') {
        setRegulationsAccepted(true);
        setAcceptanceDate(localStorage.getItem('regulationsAcceptanceDate'));
      }
      const storedLessonDate = localStorage.getItem('lessonDate');
      if (storedLessonDate) {
        setLessonDate(storedLessonDate);
      }
      const storedDojo = localStorage.getItem('selectedDojo');
      if (storedDojo) {
        setSelectedDojo(storedDojo);
      }
      
      const isApproved = localStorage.getItem('associationApproved') === 'true';
      const isRequested = localStorage.getItem('associationRequested') === 'true';
      const storedApprovalDate = localStorage.getItem('associationApprovalDate');
      const storedRequestDate = localStorage.getItem('associationRequestDate');


      if (isApproved) {
        setAssociationStatus('approved');
        setAssociationDate(storedApprovalDate || storedRequestDate);
      } else if (isRequested) {
        setAssociationStatus('requested');
        setAssociationDate(storedRequestDate);
      } else {
        setAssociationStatus('none');
      }

      if (isApproved && (storedApprovalDate || storedRequestDate)) {
        try {
            const dateToParse = storedApprovalDate || storedRequestDate;
            const parsedDate = parse(dateToParse!, 'dd/MM/yyyy', new Date());
            if (!isNaN(parsedDate.getTime())) {
                const duration = formatDistanceToNowStrict(parsedDate, { locale: it });
                setMembershipDuration(duration);
            }
        } catch (error) {
            console.error("Error parsing association date:", error);
        }
      }

      const storedCertExp = localStorage.getItem('medicalCertificateExpirationDate');
      if (storedCertExp) {
        setCertificateExpiration(new Date(storedCertExp));
      }

      const storedAppointmentDate = localStorage.getItem('medicalAppointmentDate');
       if (storedAppointmentDate) {
        setAppointmentDate(new Date(storedAppointmentDate));
      }

      setFirstAssociationYear(localStorage.getItem('firstAssociationYear'));
      setGrade(localStorage.getItem('grade'));

      const storedIsInsured = localStorage.getItem('isInsured');
      if (storedIsInsured === 'true') {
          setIsInsured(true);
      }
      const storedIsSelectionPassportComplete = localStorage.getItem('isSelectionPassportComplete');
      if (storedIsSelectionPassportComplete === 'true') {
          setIsSelectionPassportComplete(true);
      }
      
      const plan = localStorage.getItem('subscriptionPlan');
      const status = localStorage.getItem('subscriptionStatus');
      setSubscriptionPlan(plan);
      setSubscriptionStatus(status);
      
      const storedExpiry = localStorage.getItem('subscriptionExpiry');
      if (storedExpiry) {
        setSubscriptionExpiry(new Date(storedExpiry));
      }
      
      if (plan === 'mensile' && status === 'valido') {
        const paymentDateStr = localStorage.getItem('subscriptionPaymentDate');
        if (paymentDateStr) {
            const paymentDate = new Date(paymentDateStr);
            const today = new Date();
            if (paymentDate.getFullYear() === today.getFullYear() && paymentDate.getMonth() === today.getMonth()) {
                const endOfMonth = lastDayOfMonth(today);
                const warningDate = new Date(endOfMonth);
                warningDate.setDate(warningDate.getDate() - 3);

                if (today > endOfMonth) {
                    setMonthlyStatus('scaduto');
                } else if (today >= warningDate) {
                    setMonthlyStatus('in_scadenza');
                } else {
                    setMonthlyStatus('valido');
                }
            } else {
                 setMonthlyStatus('scaduto');
            }
        } else {
            setMonthlyStatus('non_attivo'); 
        }
      } else if (!plan) {
          setMonthlyStatus('non_attivo');
      }

    }
    const kanji = kanjiList[Math.floor(Math.random() * kanjiList.length)];
    if(kanji) {
      setRandomKanji(kanji);
    }

    // Set up Firestore listeners for dynamic data
    let unsubscribes: Unsubscribe[] = [];
    const userEmail = localStorage.getItem('registrationEmail');

    if (userEmail) {
        setLoadingParticipation(true);

        // Listener for all available stages to get total counts
        const allStagesQuery = query(collection(db, "events"), where("isDeleted", "!=", true));
        const unsubscribeAllStages = onSnapshot(allStagesQuery, (snapshot) => {
            const totals: TotalStages = { tutti: 0, cintureNere: 0, insegnanti: 0 };
            snapshot.forEach(doc => {
                const stageData = doc.data();
                switch (stageData.participants) {
                    case 'Tutti':
                        totals.tutti++;
                        break;
                    case 'Cinture nere':
                        totals.cintureNere++;
                        break;
                    case 'Insegnanti':
                        totals.insegnanti++;
                        break;
                }
            });
            setTotalStages(totals);
        });

        // Listener for user's registrations to get their participation counts
        const userRegistrationsQuery = query(collection(db, "eventRegistrations"), where("userEmail", "==", userEmail));
        const unsubscribeUserRegistrations = onSnapshot(userRegistrationsQuery, (snapshot) => {
            const userParticipation: StageParticipation = { tutti: 0, cintureNere: 0, insegnanti: 0 };
            snapshot.forEach(doc => {
                const regData = doc.data();
                switch (regData.stageType) {
                    case 'Tutti':
                        userParticipation.tutti++;
                        break;
                    case 'Cinture nere':
                        userParticipation.cintureNere++;
                        break;
                    case 'Insegnanti':
                        userParticipation.insegnanti++;
                        break;
                }
            });
            setParticipation(userParticipation);
            setLoadingParticipation(false);
        });
        
        unsubscribes.push(unsubscribeAllStages, unsubscribeUserRegistrations);
    } else {
      setLoadingParticipation(false);
    }
    
    // Cleanup function
    return () => {
        unsubscribes.forEach(unsub => unsub());
    };

  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const renderAssociationBadge = () => {
    switch (associationStatus) {
      case 'approved':
        return <span className="font-medium text-green-700">Valida</span>;
      case 'requested':
        return <span className="font-medium text-orange-500">Domanda inviata in data {associationDate}</span>;
      default:
        return <span className="font-medium text-red-600">Non Associato</span>;
    }
  }

  const renderCertificateStatus = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (certificateExpiration) {
        const expirationFormatted = format(certificateExpiration, "dd/MM/yyyy");
        const daysUntilExpiration = differenceInDays(certificateExpiration, today);

        if (daysUntilExpiration < 0) {
            return (
                <div className="flex items-center text-red-600 font-medium">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    <span>Scaduto il {expirationFormatted}</span>
                </div>
            );
        }

        if (daysUntilExpiration <= 30) {
            return (
                <div className="flex items-center text-orange-500 font-medium">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    <span>In scadenza il {expirationFormatted}</span>
                </div>
            );
        }

        return (
            <div className="flex items-center text-green-600 font-medium">
                <CheckCircle className="mr-2 h-5 w-5" />
                <span>Valido fino al {expirationFormatted}</span>
            </div>
        );
    }
    
    if (appointmentDate) {
        const appointmentFormatted = format(appointmentDate, "dd/MM/yyyy");
        return (
            <div className="flex items-center text-red-600 font-medium">
                <AlertTriangle className="mr-2 h-5 w-5" />
                <span>Prenotata il {appointmentFormatted}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center text-red-600 font-medium">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <span>Mancante</span>
        </div>
    );
  };
  
   const renderSubscriptionStatus = () => {
        if (subscriptionPlan === 'stagionale') {
            if (subscriptionStatus === 'valido' && subscriptionExpiry) {
                return <span className="font-medium text-green-700">Valido fino al {format(subscriptionExpiry, "dd/MM/yyyy")}</span>;
            } else if (subscriptionStatus === 'in_attesa') {
                return <span className="font-medium text-orange-500">In attesa di approvazione</span>;
            }
        } else if (subscriptionPlan === 'mensile') {
             if (subscriptionStatus === 'in_attesa') {
                return <span className="font-medium text-orange-500">In attesa di approvazione</span>;
            }
            switch (monthlyStatus) {
                case 'valido':
                    const currentMonth = format(new Date(), 'MMMM', { locale: it });
                    return <span className="font-medium text-green-700">Attivo per {currentMonth}</span>;
                case 'in_scadenza':
                    return <span className="font-medium text-orange-500">In scadenza</span>;
                case 'scaduto':
                    return <span className="font-medium text-red-600">Scaduto</span>;
                case 'non_attivo':
                    return <span className="font-medium text-red-600">Non attivo</span>;
            }
        }
        return <span className="font-medium text-red-600">Non attivo</span>;
  };

  const renderParticipationStatus = (count: number, total: number) => {
      const statusText = `${count} su ${total}`;
      if (total === 0 || count === 0) {
          return <span className="font-medium text-red-600">{statusText}</span>;
      }
      return <span className="font-medium text-green-700">{statusText}</span>;
  }


  const simulateApproval = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('associationApproved', 'true');
        const approvalDate = localStorage.getItem('associationRequestDate') || format(new Date(), "dd/MM/yyyy");
        localStorage.setItem('associationApprovalDate', approvalDate);
        localStorage.setItem('isInsured', 'true'); // Set insured status on approval
        localStorage.removeItem('associationRequested');
        setAssociationStatus('approved');
        setAssociationDate(approvalDate);
        setIsInsured(true);
        window.location.reload();
    }
  }

  const simulateSubscriptionApproval = () => {
     if (typeof window !== 'undefined') {
        localStorage.setItem('subscriptionStatus', 'valido');
        if (localStorage.getItem('subscriptionPlan') === 'mensile') {
            localStorage.setItem('subscriptionPaymentDate', new Date().toISOString());
        }
        setSubscriptionStatus('valido');
        window.location.reload();
    }
  }

  const capitalizeFirstLetter = (string: string | null) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const showAssociationYear = associationStatus === 'approved' || associationStatus === 'requested' || (firstAssociationYear && !isSelectionPassportComplete);
  const showAdminButtons = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benvenuto, {userName.split(' ')[0]}!</CardTitle>
        <CardDescription>
            Ecco la tua situazione. 
            {showAdminButtons && associationStatus === 'requested' && <Button onClick={simulateApproval} variant="outline" size="sm" className="ml-4 text-xs p-1 h-auto">Simula Approvazione Associazione</Button>}
            {showAdminButtons && subscriptionStatus === 'in_attesa' && <Button onClick={simulateSubscriptionApproval} variant="outline" size="sm" className="ml-4 text-xs p-1 h-auto">Simula Approvazione Abbonamento</Button>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-5xl font-serif bg-primary/10 text-primary">
              {randomKanji ? randomKanji : getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <div className="font-semibold text-2xl">{userName}</div>
            <div className="text-muted-foreground">{codiceFiscale}</div>
            <div className="text-muted-foreground">n° Tessera: <span className="font-bold"></span></div>
            {martialArt && (
              <div className="font-bold uppercase text-2xl mt-1 tracking-wider">{martialArt}</div>
            )}
            <div className="text-foreground flex justify-center gap-4 text-black">
              {showAssociationYear && <span>Associato dal: <span className="font-bold">{firstAssociationYear}</span></span>}
              <span>Grado attuale: <span className="font-bold">{grade || 'Nessuno'}</span></span>
              <span>Palestra di: <span className="font-bold">{capitalizeFirstLetter(selectedDojo)}</span></span>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg">
            {/* --- Left Column: Personal & Admin Info --- */}
            <div className="grid gap-2">
              <div className="flex items-center pt-2 gap-2">
                <span className="text-muted-foreground">Regolamenti:</span>
                {regulationsAccepted ? (
                    <span className="font-medium text-green-700">
                        Accettati il {acceptanceDate}
                    </span>
                ) : (
                    <span className="font-medium text-red-600">Non Accettati</span>
                )}
              </div>
               <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Assicurato:</span>
                 {isInsured ? (
                    <span className="font-medium text-green-700">Sì</span>
                  ) : (
                    <span className="font-medium text-red-600">No</span>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Associazione:</span>
                {renderAssociationBadge()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Certificato medico:</span>
                {renderCertificateStatus()}
              </div>
               <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Abbonamento ai corsi:</span>
                {renderSubscriptionStatus()}
              </div>
            </div>

            {/* --- Right Column: Martial Arts Info --- */}
            <div className="grid gap-2">
              <div className="text-muted-foreground">
                  Prossimo esame: <span className="font-medium text-red-600">Nessuno</span>
              </div>
               {loadingParticipation ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <div className="text-muted-foreground">
                      Stage (Tutti): {renderParticipationStatus(participation.tutti, totalStages.tutti)}
                  </div>
                  <div className="text-muted-foreground">
                      Stage (Cinture Nere): {renderParticipationStatus(participation.cintureNere, totalStages.cintureNere)}
                  </div>
                  <div className="text-muted-foreground">
                      Stage (Insegnanti): {renderParticipationStatus(participation.insegnanti, totalStages.insegnanti)}
                  </div>
                </>
              )}
              <div className="text-muted-foreground">
                  Regolarità allenamenti: <span className="font-medium text-red-600">N/D</span>
              </div>
              <div className="text-muted-foreground">
                  Taiso: <span className="font-medium text-red-600">N/D</span>
              </div>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
