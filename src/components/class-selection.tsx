

"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useState, useMemo, useEffect } from "react"
import { format, parse, isAfter } from "date-fns"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Separator } from "./ui/separator"
import { Gift, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { cn } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { Textarea } from "./ui/textarea"
import { db, auth } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => String(currentYear - i));
const futureYears = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

const lessonDatesByDojo: { [key: string]: string[] } = {
    aosta: ["1 Settembre 2024", "8 Settembre 2024", "15 Settembre 2024"],
    villeneuve: ["2 Settembre 2024", "9 Settembre 2024", "16 Settembre 2024"],
    verres: ["3 Settembre 2024", "10 Settembre 2024", "17 Settembre 2024"],
};

const paymentOptions = [
    { id: "online", label: "Carta di Credito on line" },
    { id: "cash", label: "Contanti o Bancomat in Palestra ( 2 euro costi di gestione)" },
];

const SUMUP_PAYMENT_LINK = 'https://pay.sumup.com/b2c/Q25VI0NJ';


export function ClassSelection({ setLessonSelected, initialStep = 1, userData }: { setLessonSelected?: (value: boolean) => void, initialStep?: number, userData?: any }) {
    const { toast } = useToast()
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [martialArt, setMartialArt] = useState("");
    const [dojo, setDojo] = useState("");
    const [lessonDate, setLessonDate] = useState("");
    
    const [name, setName] = useState("");
    const [day, setDay] = useState<string | undefined>(undefined);
    const [month, setMonth] = useState<string | undefined>(undefined);
    const [year, setYear] = useState<string | undefined>(undefined);
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

    const [codiceFiscale, setCodiceFiscale] = useState("");
    const [provincia, setProvincia] = useState("");
    const [birthplace, setBirthplace] = useState("");
    const [address, setAddress] = useState("");
    const [civicNumber, setCivicNumber] = useState("");
    const [cap, setCap] = useState("");
    const [comune, setComune] = useState("");
    const [phone, setPhone] = useState("");

    const [parentName, setParentName] = useState("");
    const [parentCf, setParentCf] = useState("");
    const [parentPhone, setParentPhone] = useState("");
    
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [amount, setAmount] = useState<string | undefined>();
    const [bonusAccepted, setBonusAccepted] = useState(false);

    const [secondLessonDay, setSecondLessonDay] = useState<string | undefined>(undefined);
    const [secondLessonMonth, setSecondLessonMonth] = useState<string | undefined>(undefined);
    const [secondLessonYear, setSecondLessonYear] = useState<string | undefined>(undefined);
    const [thirdLessonDay, setThirdLessonDay] = useState<string | undefined>(undefined);
    const [thirdLessonMonth, setThirdLessonMonth] = useState<string | undefined>(undefined);
    const [thirdLessonYear, setThirdLessonYear] = useState<string | undefined>(undefined);

    const [savedSecondLessonDate, setSavedSecondLessonDate] = useState<string | null>(null);
    const [savedThirdLessonDate, setSavedThirdLessonDate] = useState<string | null>(null);
    const [datesSaved, setDatesSaved] = useState(false);
    const [associationEnabled, setAssociationEnabled] = useState(false);
    const [associationChoice, setAssociationChoice] = useState<string | undefined>();
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [feedback, setFeedback] = useState('');

    const [summaryData, setSummaryData] = useState({
        firstLesson: '',
        paymentMethod: '',
        paymentDate: null as string | null,
        amount: '',
        name: '',
        age: null as number | null,
        comune: '',
        phone: '',
        isMinor: false,
        parentName: '',
        parentPhone: ''
    });

    const availableDates = dojo ? lessonDatesByDojo[dojo] : [];
    
    const translatePaymentMethodLocal = (method: string | null) => {
        if (!method) return 'Non specificato';
        switch (method) {
            case 'cash': return 'Contanti o Bancomat in Palestra';
            case 'online': return 'Carta di Credito on line';
            default: return method;
        }
    }

    const handleMartialArtChange = (value: string) => {
        setMartialArt(value);
        if (value === 'aikido') {
            setDojo('aosta');
        } else {
            setDojo('');
        }
        setLessonDate("");
    };

    useEffect(() => {
        if (paymentMethod === 'online') {
            setAmount("30");
        } else if (paymentMethod === 'cash') {
            setAmount("32");
        } else {
            setAmount(undefined);
        }
    }, [paymentMethod]);

    useEffect(() => {
        setCurrentStep(initialStep);
        if (userData?.lessonSelected && userData?.selectionDetails) {
            const { selectionDetails } = userData;
            setDatesSaved(true);
            setSavedSecondLessonDate(selectionDetails.secondLessonDate);
            setSavedThirdLessonDate(selectionDetails.thirdLessonDate);

            if (selectionDetails.secondLessonDate) {
                 try {
                    const secondLessonDate = parse(selectionDetails.secondLessonDate, 'd MMMM yyyy', new Date(), { locale: it });
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (!isNaN(secondLessonDate.getTime()) && isAfter(today, secondLessonDate)) {
                        setAssociationEnabled(true);
                    }
                } catch (e) {
                    console.error("Error parsing second lesson date", e);
                    setAssociationEnabled(false);
                }
            }
        }


        if (initialStep === 2) {
            let age = null;
            if (userData.birthDate) {
                const [day, month, year] = userData.birthDate.split('/');
                const birthDateObj = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
                const today = new Date();
                age = today.getFullYear() - birthDateObj.getFullYear();
                const m = today.getMonth() - birthDateObj.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                    age--;
                }
            }
            
            let paymentDate = userData.paymentDate;
            if (userData.paymentMethod === 'online' && !paymentDate) {
                paymentDate = format(new Date(), "dd/MM/yyyy HH:mm");
            } else if (userData.paymentMethod === 'cash') {
                paymentDate = null;
            }

            setSummaryData({
                firstLesson: userData.lessonDate || '',
                paymentMethod: userData.paymentMethod || '',
                paymentDate: paymentDate,
                amount: userData.paymentAmount || '',
                name: userData.name || '',
                age: age,
                comune: userData.comune || '',
                phone: userData.phone || '',
                isMinor: userData.isMinor,
                parentName: userData.parentName || '',
                parentPhone: userData.parentPhone || ''
            });
        }
    }, [initialStep, userData]);

    useEffect(() => {
        setLessonDate("");
    }, [dojo]);

    useEffect(() => {
        if(userData){
            setName(userData.name || "");
            setCodiceFiscale(userData.codiceFiscale || "");
            setAddress(userData.address || "");
            setComune(userData.comune || "");
            setProvincia(userData.provincia || "");
            setBirthplace(userData.birthplace || "");
            setCivicNumber(userData.civicNumber || "");
            setCap(userData.cap || "");
            setPhone(userData.phone || "");
            setParentName(userData.parentName || "");
            setParentCf(userData.parentCf || "");
            setParentPhone(userData.parentPhone || "");
           
            if (userData.birthDate) {
                const parts = userData.birthDate.split('/');
                if (parts.length === 3) {
                    setDay(parts[0]);
                    setMonth(parts[1]);
                    setYear(parts[2]);
                }
            }
        }
    }, [userData]);

    useEffect(() => {
        if (day && month && year) {
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1 && date.getDate() === parseInt(day)) {
                setBirthDate(date);
            } else {
                setBirthDate(undefined);
            }
        } else {
            setBirthDate(undefined);
        }
    }, [day, month, year]);
    
    const saveDataToFirestore = async () => {
        const user = auth.currentUser;
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato", variant: "destructive" });
            return;
        }

        const dataToUpdate = {
            martialArt,
            selectedDojo,
            lessonDate,
            name,
            codiceFiscale,
            birthDate: birthDate ? format(birthDate, "dd/MM/yyyy") : '',
            birthplace,
            address,
            civicNumber,
            cap,
            comune,
            provincia,
            isMinor,
            parentName: isMinor ? parentName : '',
            parentCf: isMinor ? parentCf : '',
            parentPhone: isMinor ? parentPhone : '',
            phone: isMinor ? '' : phone,
            paymentMethod,
            paymentAmount: amount,
            isSelectionPassportComplete: true,
            paymentDate: paymentMethod === 'cash' ? null : format(new Date(), "dd/MM/yyyy HH:mm")
        };

        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, dataToUpdate);
        } catch (error) {
            console.error("Error updating user data:", error);
            toast({ title: "Errore", description: "Impossibile salvare i dati.", variant: "destructive" });
            throw error;
        }
    };
    
    const handleNextStep = async () => {
        try {
            await saveDataToFirestore();
            window.location.reload(); 
        } catch (error) {
            // Error is already toasted
        }
    };

    const handleOnlinePayment = async () => {
        try {
            await saveDataToFirestore();
            const paymentUrl = encodeURIComponent(SUMUP_PAYMENT_LINK);
            const returnUrl = encodeURIComponent('/dashboard/class-selection');
            router.push(`/dashboard/payment-gateway?url=${paymentUrl}&returnTo=${returnUrl}`);
        } catch (error) {
            // Error is already toasted
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const capitalized = value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        setName(capitalized);
    };

    const handleBirthplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        setBirthplace(capitalized);
    };
    
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const capitalized = value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        setAddress(capitalized);
    };

    const handleComuneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        setComune(capitalized);
    };

    const handleParentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const capitalized = value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        setParentName(capitalized);
    };
    
    const isMinor = useMemo(() => {
        if (!birthDate) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age < 18;
    }, [birthDate]);

    const handleSaveDates = async () => {
        const user = auth.currentUser;
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato", variant: "destructive" });
            return;
        }

        const formatDateStr = (day: string | undefined, month: string | undefined, year: string | undefined): string => {
            if (!day || !month || !year) return '';
            const monthLabel = months.find(m => m.value === month)?.label;
            if (!monthLabel) return '';
            return `${day} ${monthLabel} ${year}`;
        }
        
        const secondDate = formatDateStr(secondLessonDay, secondLessonMonth, secondLessonYear);
        const thirdDate = formatDateStr(thirdLessonDay, thirdLessonMonth, thirdLessonYear);

        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                lessonSelected: true,
                selectionDetails: {
                    secondLessonDate: secondDate,
                    thirdLessonDate: thirdDate
                }
            });

             toast({
                title: "Date salvate!",
                description: "Le date delle lezioni sono state aggiornate.",
            });
            window.location.reload();
        } catch (error) {
             console.error("Error saving dates:", error);
            toast({ title: "Errore", description: "Impossibile salvare le date.", variant: "destructive" });
        }
    };

    const canSaveDates = useMemo(() => {
        const secondDateValid = !!(secondLessonDay && secondLessonMonth && secondLessonYear);
        const thirdDateValid = !!(thirdLessonDay && thirdLessonMonth && thirdLessonYear);
        return secondDateValid && thirdDateValid;
    }, [
        secondLessonDay,
        secondLessonMonth,
        secondLessonYear,
        thirdLessonDay,
        thirdLessonMonth,
        thirdLessonYear,
    ]);

    const handleExit = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid), {
                isSelectionPassportComplete: true, // Should already be set but good to be sure
                isInsured: true
            });
             router.push('/dashboard');
        } catch(error) {
            console.error("Error finalising selection passport", error);
            toast({title: "Errore", description: "Si è verificato un problema, riprova."})
        }
    }
    
    const handleAssociationChoiceChange = (choice: 'yes' | 'no') => {
        if (!associationEnabled) return;
        setAssociationChoice(choice);
        if (choice === 'no') {
            setShowLeaveConfirm(true);
        }
    }

    const handleLeaveConfirm = () => {
        // Here you would implement the logic to delete user data
        console.log("Feedback:", feedback);
        toast({
            title: "Dati cancellati",
            description: "Il tuo account e i tuoi dati verranno eliminati a breve.",
        });
        setShowLeaveConfirm(false);
        // Potentially clear data and redirect
        // auth.signOut();
        // router.push('/');
    }

    const handleLeaveCancel = () => {
        setShowLeaveConfirm(false);
        setAssociationChoice(undefined); // Reset the choice
    }

    const handleAssociateClick = () => {
        router.push('/dashboard/associates?fromSelection=true');
    };

    // Sequential validation state
    const isCourseSectionComplete = !!(martialArt && dojo && lessonDate);
    const isPersonalInfoComplete = !!(name && birthDate && birthplace && codiceFiscale && address && civicNumber && cap && comune && provincia);
    const isContactInfoComplete = useMemo(() => {
        if (!isPersonalInfoComplete) return false;
        if (isMinor) {
            return !!(parentName && parentCf && parentPhone);
        }
        return !!phone;
    }, [isMinor, isPersonalInfoComplete, parentName, parentCf, parentPhone, phone]);
    
    const isPaymentSectionComplete = !!(paymentMethod);

    const isFormCompleteForCash = isCourseSectionComplete && isPersonalInfoComplete && isContactInfoComplete && isPaymentSectionComplete && bonusAccepted && paymentMethod === 'cash';
    const isFormCompleteForOnline = isCourseSectionComplete && isPersonalInfoComplete && isContactInfoComplete && isPaymentSectionComplete && paymentMethod === 'online';
    
    return (
    <>
        {currentStep === 1 && (
            <Card>
                <CardHeader>
                    <CardTitle className="bg-primary text-primary-foreground p-6 -mt-6 -mx-6 rounded-t-lg mb-6">Lezioni Selezione</CardTitle>
                    <CardDescription className="text-foreground font-bold">
                       Tre incontri per capire e farti capire più un Bonus di inizio percorso di 5 lezioni gratuite. Per garantirti la migliore esperienza possibile e un percorso di crescita personalizzato, abbiamo strutturato una modalità d’ingresso che ti permetterà di farti conoscere e di scoprire il mondo delle arti marziali. Le lezioni di selezione sono un passaggio fondamentale e obbligatorio per chiunque desideri unirsi alla nostra comunità, indipendentemente dall'età e dal livello di esperienza. Ti comunicheremo telefonicamente la data della prima lezione.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Course Selection */}
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="gym">Corso di:</Label>
                            <Select onValueChange={handleMartialArtChange} value={martialArt}>
                                <SelectTrigger id="gym">
                                <SelectValue placeholder="Seleziona un corso" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                <SelectItem value="karate">Karate</SelectItem>
                                <SelectItem value="aikido">Aikido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="dojo">Palestra di:</Label>
                            <Select onValueChange={setDojo} value={dojo} disabled={!martialArt || martialArt === 'aikido'}>
                                <SelectTrigger id="dojo">
                                <SelectValue placeholder="Seleziona una palestra" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                    <SelectItem value="aosta">Aosta</SelectItem>
                                    <SelectItem value="villeneuve">Villeneuve</SelectItem>
                                    <SelectItem value="verres">Verres</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {dojo && (
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="lesson-date">1a Lezione</Label>
                                <Select onValueChange={setLessonDate} value={lessonDate} disabled={!dojo}>
                                    <SelectTrigger id="lesson-date">
                                    <SelectValue placeholder="Seleziona una data" />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                    {availableDates.map(date => (
                                        <SelectItem key={date} value={date}>{date}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    
                    {/* Personal Info */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome e Cognome</Label>
                                <Input id="name" placeholder="Mario Rossi" required value={name} onChange={handleNameChange} disabled={!isCourseSectionComplete} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="birthplace">Nato a:</Label>
                                    <Input id="birthplace" type="text" placeholder="Roma" required value={birthplace} onChange={handleBirthplaceChange} disabled={!isCourseSectionComplete}/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Data di nascita:</Label>
                                    <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                                        <Select onValueChange={setDay} value={day} disabled={!isCourseSectionComplete}>
                                            <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                            <SelectContent>{Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select onValueChange={setMonth} value={month} disabled={!isCourseSectionComplete}>
                                            <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select onValueChange={setYear} value={year} disabled={!isCourseSectionComplete}>
                                            <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                                            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="codice-fiscale">Codice Fiscale:</Label>
                            <div className="w-full md:w-1/2">
                                <Input id="codice-fiscale" placeholder="RSSMRA80A01H501U" required value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())} disabled={!isCourseSectionComplete} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Residente in:</Label>
                                <Input id="address" placeholder="Via, Piazza, etc." required value={address} onChange={handleAddressChange} disabled={!isCourseSectionComplete} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="civic-number">N° civico:</Label>
                                <Input id="civic-number" placeholder="12/A" required value={civicNumber} onChange={(e) => setCivicNumber(e.target.value)} disabled={!isCourseSectionComplete} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cap">C.A.P.:</Label>
                                <Input id="cap" placeholder="00100" required value={cap} onChange={(e) => setCap(e.target.value)} disabled={!isCourseSectionComplete} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="comune">Comune:</Label>
                                <Input id="comune" placeholder="Roma" required value={comune} onChange={handleComuneChange} disabled={!isCourseSectionComplete} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="provincia">Provincia:</Label>
                                <Input id="provincia" placeholder="RM" required value={provincia} onChange={(e) => setProvincia(e.target.value.toUpperCase())} disabled={!isCourseSectionComplete}/>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info (Adult or Minor) */}
                    <div className="space-y-4">
                        {!isMinor ? (
                             <div className="space-y-2">
                                <Label htmlFor="phone">Numero di telefono:</Label>
                                <Input id="phone" type="tel" placeholder="3331234567" required={!isMinor} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isPersonalInfoComplete} />
                            </div>
                        ) : (
                            <div className="space-y-4 pt-4 mt-4 border-t">
                                <h3 className="text-lg font-semibold">Dati Genitore o tutore</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="parent-name">Nome e Cognome Genitore/Tutore</Label>
                                    <Input id="parent-name" placeholder="Paolo Bianchi" required={isMinor} value={parentName} onChange={handleParentNameChange} disabled={!isPersonalInfoComplete} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parent-cf">Codice Fiscale Genitore/Tutore</Label>
                                    <Input id="parent-cf" placeholder="BNCPLA80A01H501Z" required={isMinor} value={parentCf} onChange={(e) => setParentCf(e.target.value.toUpperCase())} disabled={!isPersonalInfoComplete} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parent-phone">Numero di telefono:</Label>
                                    <Input id="parent-phone" type="tel" placeholder="3331234567" required={isMinor} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} disabled={!isPersonalInfoComplete} />
                                </div>
                            </div>
                        )}
                    </div>

                     {/* Payment */}
                    <div className="space-y-4 pt-4">
                        <Label className="text-sm font-bold text-black" htmlFor="payment-method">Completa la tua iscrizione scegliendo un metodo di pagamento.</Label>
                        <Select onValueChange={setPaymentMethod} value={paymentMethod} disabled={!isContactInfoComplete}>
                            <SelectTrigger id="payment-method">
                                <SelectValue placeholder="Seleziona un metodo di pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentOptions.map(option => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {paymentMethod && (
                            <div className="space-y-2">
                                <Label htmlFor="amount">Importo</Label>
                                <Input id="amount" value={amount ? `€ ${amount}`: ''} disabled />
                            </div>
                        )}
                        {paymentMethod === 'online' && (
                            <div className="mt-2">
                                <Button onClick={handleOnlinePayment} className="w-full" disabled={!isFormCompleteForOnline}>Procedi con il Pagamento</Button>
                            </div>
                        )}
                    </div>

                    {/* Bonus */}
                    <div className="space-y-4">
                        <Separator />
                        <div className="flex items-center space-x-2 pt-4">
                            <Checkbox id="bonus-benvenuto" onCheckedChange={(checked) => setBonusAccepted(!!checked)} checked={bonusAccepted} disabled={!isPaymentSectionComplete || paymentMethod === 'online'} />
                            <Label htmlFor="bonus-benvenuto" className="flex items-center gap-2 text-base font-normal">
                                <Gift className="h-5 w-5 text-primary" />
                                Assicurati il tuo Bonus di Benvenuto!
                            </Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleNextStep} disabled={!isFormCompleteForCash}>
                        Avanti
                    </Button>
                </CardFooter>
            </Card>
        )}
        
        {currentStep === 2 && (
             <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ci spiace che tu voglia lasciarci</AlertDialogTitle>
                        <AlertDialogDescription>
                            Puoi spiegarci il perchè e cosa dobbiamo migliorare?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea 
                        placeholder="Il tuo feedback..." 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Se procedi i tuoi dati verranno cancellati ed il tuo account eliminato.
                    </p>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleLeaveCancel}>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveConfirm}>Procedi</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>

                <Card>
                    <CardHeader>
                        <CardTitle className="bg-green-600 text-white p-4 -mt-6 -mx-6 rounded-t-lg mb-4">Passaporto Selezioni</CardTitle>
                        <CardDescription className="text-foreground font-bold">Questa scheda ti verrà richiesta alla prima lezione.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground items-center">
                        <div>
                            <p><b>Metodo Pagamento:</b> <span className="text-foreground font-bold">{translatePaymentMethodLocal(summaryData.paymentMethod ?? null)}</span></p>
                            {summaryData.paymentDate && <p><b>Data Pagamento:</b> <span className="text-foreground font-bold">{summaryData.paymentDate}</span></p>}
                        </div>
                        <div className="flex items-center gap-4">
                                <p><b>Importo:</b> <span className="text-foreground font-bold">€ {summaryData.amount}</span></p>
                        </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                            <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Lezione</h3>
                            <div className="space-y-2 text-muted-foreground">
                                <div className="flex flex-col items-start">
                                    <p><b>1a Lezione:</b> <span className="text-foreground font-bold">{summaryData.firstLesson}</span></p>
                                    <Separator className="my-2" />
                                    <p className="text-foreground">Date da concordare col Maestro:</p>
                                </div>
                                <div className="flex items-start gap-4 mt-2">
                                    <div className="space-y-2 flex-grow">
                                        <div className="flex items-center gap-4">
                                            <Label className="min-w-max"><b>2a Lezione:</b></Label>
                                            {datesSaved ? (
                                                <span className="text-foreground font-bold">{savedSecondLessonDate}</span>
                                            ) : (
                                                <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 flex-grow">
                                                    <Select onValueChange={setSecondLessonDay} value={secondLessonDay}>
                                                        <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select onValueChange={setSecondLessonMonth} value={secondLessonMonth}>
                                                        <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                                        <SelectContent>
                                                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select onValueChange={setSecondLessonYear} value={secondLessonYear}>
                                                        <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                                                        <SelectContent>
                                                            {futureYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <Label className="min-w-max"><b>3a Lezione:</b></Label>
                                            {datesSaved ? (
                                                <span className="text-foreground font-bold">{savedThirdLessonDate}</span>
                                            ) : (
                                                <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 flex-grow">
                                                    <Select onValueChange={setThirdLessonDay} value={thirdLessonDay}>
                                                        <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select onValueChange={setThirdLessonMonth} value={thirdLessonMonth}>
                                                        <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                                        <SelectContent>
                                                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select onValueChange={setThirdLessonYear} value={thirdLessonYear}>
                                                        <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                                                        <SelectContent>
                                                            {futureYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {(!datesSaved && !datesSaved) && <Button onClick={handleSaveDates} disabled={!canSaveDates} className="bg-green-600 hover:bg-green-700 self-center">Salva</Button>}
                                </div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div>
                            <h3 className="font-semibold text-lg mb-2 text-primary">Dati Allievo</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                                <p><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{summaryData.name}</span></p>
                                <p><b>Età:</b> <span className="text-foreground font-bold">{summaryData.age !== null ? `${summaryData.age} anni` : ''}</span></p>
                                <p><b>Residenza:</b> <span className="text-foreground font-bold">{summaryData.comune}</span></p>
                                {!summaryData.isMinor && <p><b>Telefono:</b> <span className="text-foreground font-bold">{summaryData.phone}</span></p>}
                            </div>
                        </div>

                        {summaryData.isMinor && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold text-lg mb-2 text-primary">Dati Genitore/Tutore</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                                        <p><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{summaryData.parentName}</span></p>
                                        <p><b>Telefono:</b> <span className="text-foreground font-bold">{summaryData.parentPhone}</span></p>
                                    </div>
                                </div>
                            </>
                        )}

                    </CardContent>
                    <CardFooter className="flex flex-col items-stretch gap-4">
                        <div className="self-end">
                            <Button onClick={handleExit}>
                                Esci
                            </Button>
                        </div>
                        <Separator />
                        <div className={cn("flex justify-between items-center w-full", !associationEnabled && "opacity-50 pointer-events-none")}>
                            <p className={cn("text-sm", associationEnabled ? "font-bold text-foreground" : "text-muted-foreground")}>Vuoi associarti e proseguire il tuo percorso?</p>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="associate-yes" 
                                        disabled={!associationEnabled} 
                                        checked={associationChoice === 'yes'} 
                                        onCheckedChange={(checked) => handleAssociationChoiceChange(checked ? 'yes' : undefined)}
                                    />
                                    <Label htmlFor="associate-yes">SI</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                     <Checkbox 
                                        id="associate-no" 
                                        disabled={!associationEnabled}
                                        checked={associationChoice === 'no'}
                                        onCheckedChange={(checked) => { if(checked) handleAssociationChoiceChange('no')}}
                                    />
                                    <Label htmlFor="associate-no">NO</Label>
                                </div>
                                <Button 
                                    onClick={handleAssociateClick}
                                    disabled={!associationEnabled || associationChoice !== 'yes'} 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Associati
                                </Button>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </AlertDialog>
        )}
    </>
  )
}

    