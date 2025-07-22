
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
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Separator } from "./ui/separator"
import { Gift, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

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


export function ClassSelection({ setLessonSelected, initialStep = 1 }: { setLessonSelected?: (value: boolean) => void, initialStep?: number }) {
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
    const [emailConfirm, setEmailConfirm] = useState("");
    const [emailError, setEmailError] = useState(false);

    const [parentName, setParentName] = useState("");
    const [parentCf, setParentCf] = useState("");
    const [parentPhone, setParentPhone] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    
    const [registrationEmail, setRegistrationEmail] = useState<string | null>(null);
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

    const [summaryData, setSummaryData] = useState({
        firstLesson: '',
        paymentMethod: '',
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
        if (typeof window !== 'undefined') {
            const savedDatesFlag = localStorage.getItem('selectionLessonDatesSaved') === 'true';
            
            if (savedDatesFlag) {
                setDatesSaved(true);
                setSavedSecondLessonDate(localStorage.getItem('savedSecondLessonDate'));
                setSavedThirdLessonDate(localStorage.getItem('savedThirdLessonDate'));
            }

            if (initialStep === 2) {
                const storedBirthDate = localStorage.getItem('birthDate');
                let age = null;
                if (storedBirthDate) {
                    const [day, month, year] = storedBirthDate.split('/');
                    const birthDateObj = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
                    const today = new Date();
                    age = today.getFullYear() - birthDateObj.getFullYear();
                    const m = today.getMonth() - birthDateObj.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                        age--;
                    }
                }

                setSummaryData({
                    firstLesson: localStorage.getItem('lessonDate') || '',
                    paymentMethod: localStorage.getItem('paymentMethod') || '',
                    amount: localStorage.getItem('paymentAmount') || '',
                    name: localStorage.getItem('userName') || '',
                    age: age,
                    comune: localStorage.getItem('comune') || '',
                    phone: localStorage.getItem('phone') || '',
                    isMinor: localStorage.getItem('isMinor') === 'true',
                    parentName: localStorage.getItem('parentName') || '',
                    parentPhone: ''
                });
            }
        }
    }, [initialStep]);

    useEffect(() => {
        // Reset lesson date if dojo changes
        setLessonDate("");
    }, [dojo]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedCodiceFiscale = localStorage.getItem('codiceFiscale') || '';
            const storedBirthDate = localStorage.getItem('birthDate');
            const storedAddress = localStorage.getItem('address') || '';
            const storedComune = localStorage.getItem('comune') || '';
            const storedProvincia = localStorage.getItem('provincia') || '';
            const storedBirthplace = localStorage.getItem('birthplace') || '';
            const storedCivicNumber = localStorage.getItem('civicNumber') || '';
            const storedCap = localStorage.getItem('cap') || '';
            const storedPhone = localStorage.getItem('phone') || '';
            const storedParentName = localStorage.getItem('parentName') || '';
            const storedParentCf = localStorage.getItem('parentCf') || '';
            const storedParentPhone = localStorage.getItem('parentPhone') || '';
            
            setCodiceFiscale(storedCodiceFiscale);
            setAddress(storedAddress);
            setComune(storedComune);
            setProvincia(storedProvincia);
            setBirthplace(storedBirthplace);
            setCivicNumber(storedCivicNumber);
            setCap(storedCap);
            setPhone(storedPhone);
            setParentName(storedParentName);
            setParentCf(storedParentCf);
            setParentPhone(storedParentPhone);
           
            if (storedBirthDate) {
                const parts = storedBirthDate.split('/');
                if (parts.length === 3) {
                    setDay(parts[0]);
                    setMonth(parts[1]);
                    setYear(parts[2]);
                }
            }

            setRegistrationEmail(localStorage.getItem('registrationEmail'));
        }
    }, []);

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
    
    const saveDataToLocalStorage = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('martialArt', martialArt);
            localStorage.setItem('selectedDojo', dojo);
            localStorage.setItem('lessonDate', lessonDate);
            localStorage.setItem('userName', name);
            localStorage.setItem('codiceFiscale', codiceFiscale);
            if (birthDate) {
                localStorage.setItem('birthDate', `${day}/${month}/${year}`);
            }
            localStorage.setItem('birthplace', birthplace);
            localStorage.setItem('address', address);
            localStorage.setItem('civicNumber', civicNumber);
            localStorage.setItem('cap', cap);
            localStorage.setItem('comune', comune);
            localStorage.setItem('provincia', provincia);
            
            if (isMinor) {
                localStorage.setItem('isMinor', 'true');
                localStorage.setItem('parentName', parentName);
                localStorage.setItem('parentCf', parentCf);
                localStorage.setItem('parentPhone', parentPhone);
                localStorage.setItem('parentEmail', parentEmail);
            } else {
                localStorage.setItem('isMinor', 'false');
                localStorage.setItem('phone', phone);
                localStorage.setItem('emailConfirm', emailConfirm);
            }
            
            if (paymentMethod) localStorage.setItem('paymentMethod', paymentMethod);
            if (amount) localStorage.setItem('paymentAmount', amount);
        }
    };
    
    const handleNextStep = () => {
        saveDataToLocalStorage();
        setCurrentStep(2);
        if (typeof window !== 'undefined') {
            const storedBirthDate = localStorage.getItem('birthDate');
            let age = null;
            if (storedBirthDate) {
                const [day, month, year] = storedBirthDate.split('/');
                const birthDateObj = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
                const today = new Date();
                age = today.getFullYear() - birthDateObj.getFullYear();
                const m = today.getMonth() - birthDateObj.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                    age--;
                }
            }
            setSummaryData({
                firstLesson: localStorage.getItem('lessonDate') || '',
                paymentMethod: localStorage.getItem('paymentMethod') || '',
                amount: localStorage.getItem('paymentAmount') || '',
                name: localStorage.getItem('userName') || '',
                age: age,
                comune: localStorage.getItem('comune') || '',
                phone: localStorage.getItem('phone') || '',
                isMinor: localStorage.getItem('isMinor') === 'true',
                parentName: localStorage.getItem('parentName') || '',
                parentPhone: ''
            });
        }
    };

    const handleOnlinePayment = () => {
        if (typeof window !== 'undefined') {
            saveDataToLocalStorage();
            window.location.href = SUMUP_PAYMENT_LINK;
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
    
    const handleEmailConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value.toLowerCase();
        setEmailConfirm(newEmail);
        if (registrationEmail && newEmail && newEmail !== registrationEmail.toLowerCase()) {
            setEmailError(true);
        } else {
            setEmailError(false);
        }
    }

    const handleParentEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value.toLowerCase();
        setParentEmail(newEmail);
        if (registrationEmail && newEmail && newEmail !== registrationEmail.toLowerCase()) {
            setEmailError(true);
        } else {
            setEmailError(false);
        }
    }
    
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

    const handleSaveDates = () => {
        const formatDate = (day: string | undefined, month: string | undefined, year: string | undefined): string => {
            if (!day || !month || !year) return '';
            return `${day} ${months.find(m => m.value === month)?.label} ${year}`;
        }
        
        const secondDate = formatDate(secondLessonDay, secondLessonMonth, secondLessonYear);
        const thirdDate = formatDate(thirdLessonDay, thirdLessonMonth, thirdLessonYear);

        if (typeof window !== 'undefined') {
            localStorage.setItem('selectionLessonDatesSaved', 'true');
            localStorage.setItem('savedSecondLessonDate', secondDate);
            localStorage.setItem('savedThirdLessonDate', thirdDate);
        }

        setSavedSecondLessonDate(secondDate);
        setSavedThirdLessonDate(thirdDate);
        setDatesSaved(true);
        toast({
            title: "Date salvate!",
            description: "Le date delle lezioni sono state aggiornate.",
        });
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

    const handleExit = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('isSelectionPassportComplete', 'true');
            if(setLessonSelected) setLessonSelected(true);
        }
        router.push('/dashboard');
    }

    // Sequential validation state
    const isCourseSectionComplete = !!(martialArt && dojo && lessonDate);
    const isPersonalInfoComplete = !!(name && birthDate && birthplace && codiceFiscale && address && civicNumber && cap && comune && provincia);
    const isContactInfoComplete = useMemo(() => {
        if (!isPersonalInfoComplete) return false;
        if (isMinor) {
            return !!(parentName && parentCf && parentPhone && parentEmail && !emailError);
        }
        return !!(phone && emailConfirm && !emailError);
    }, [isMinor, isPersonalInfoComplete, parentName, parentCf, parentPhone, parentEmail, phone, emailConfirm, emailError]);
    
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
                            <Select onValueChange={setMartialArt} value={martialArt}>
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
                            <Select onValueChange={setDojo} value={dojo} disabled={!martialArt}>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Numero di telefono:</Label>
                                    <Input id="phone" type="tel" placeholder="3331234567" required={!isMinor} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isPersonalInfoComplete} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email-confirm">Conferma email per contatti:</Label>
                                    <Input id="email-confirm" type="email" placeholder="m@example.com" required={!isMinor} value={emailConfirm} onChange={handleEmailConfirmChange} disabled={!isPersonalInfoComplete}/>
                                    {emailError && <p className="text-sm text-destructive">L'email di contatto deve essere uguale all'email di registrazione</p>}
                                </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="parent-phone">Numero di telefono:</Label>
                                        <Input id="parent-phone" type="tel" placeholder="3331234567" required={isMinor} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} disabled={!isPersonalInfoComplete} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="parent-email-confirm">Conferma email per contatti:</Label>
                                        <Input id="parent-email-confirm" type="email" placeholder="m@example.com" required={isMinor} value={parentEmail} onChange={handleParentEmailChange} disabled={!isPersonalInfoComplete} />
                                        {emailError && <p className="text-sm text-destructive">L'email di contatto deve essere uguale all'email di registrazione</p>}
                                    </div>
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
            <Card>
                <CardHeader>
                     <CardTitle className="bg-green-600 text-white p-4 -mt-6 -mx-6 rounded-t-lg mb-4">Passaporto Selezioni</CardTitle>
                     <CardDescription className="text-foreground font-bold">Questa scheda ti verrà richiesta alla prima lezione.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground items-center">
                       <p><b>Metodo Pagamento:</b> <span className="text-foreground font-bold">{translatePaymentMethodLocal(summaryData.paymentMethod ?? null)}</span></p>
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
                <CardFooter className="flex justify-end">
                    <Button onClick={handleExit}>
                        Esci
                    </Button>
                </CardFooter>
            </Card>
        )}
    </>
  )
}
