

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
import { useToast } from "@/components/ui/use-toast"
import { useState, useMemo, useEffect } from "react"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Separator } from "./ui/separator"
import { db } from "@/lib/firebase"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"

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
    { id: "online", label: "Carta di Credito on line (0 costi)" },
    { id: "cash", label: "Contanti o Bancomat in Palestra ( 2 euro costi di gestione)" },
];

export function ClassSelection({ setLessonSelected }: { setLessonSelected?: (value: boolean) => void }) {
    const { toast } = useToast()
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1);
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

    const [parentName, setParentName] = useState("");
    const [parentCf, setParentCf] = useState("");
    const [parentPhone, setParentPhone] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    
    const [registrationEmail, setRegistrationEmail] = useState<string | null>(null);
    const [emailError, setEmailError] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [amount, setAmount] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [secondLessonDay, setSecondLessonDay] = useState<string | undefined>(undefined);
    const [secondLessonMonth, setSecondLessonMonth] = useState<string | undefined>(undefined);
    const [secondLessonYear, setSecondLessonYear] = useState<string | undefined>(undefined);
    const [thirdLessonDay, setThirdLessonDay] = useState<string | undefined>(undefined);
    const [thirdLessonMonth, setThirdLessonMonth] = useState<string | undefined>(undefined);
    const [thirdLessonYear, setThirdLessonYear] = useState<string | undefined>(undefined);

    const [savedSecondLessonDate, setSavedSecondLessonDate] = useState<string | null>(null);
    const [savedThirdLessonDate, setSavedThirdLessonDate] = useState<string | null>(null);
    const [datesSaved, setDatesSaved] = useState(false);
    
    const baseAmount = 30;

    const availableDates = dojo ? lessonDatesByDojo[dojo] : [];
    
    const capitalize = (s: string | null) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    
    const translatePaymentMethodLocal = (method: string | null) => {
        if (!method) return 'Non specificato';
        switch (method) {
            case 'online': return 'Carta di Credito on line';
            case 'cash': return 'Contanti o Bancomat in Palestra';
            default: return method;
        }
    }

    useEffect(() => {
        // Reset lesson date if dojo changes
        setLessonDate("");
    }, [dojo]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedName = localStorage.getItem('userName');
            const storedCodiceFiscale = localStorage.getItem('codiceFiscale');
            const storedBirthDate = localStorage.getItem('birthDate');
            const storedAddress = localStorage.getItem('address');
            const storedComune = localStorage.getItem('comune');
            const storedProvincia = localStorage.getItem('provincia');
            
            if(storedName) setName(storedName);
            if(storedCodiceFiscale) setCodiceFiscale(storedCodiceFiscale);
            if (storedAddress) setAddress(storedAddress);
            if (storedComune) setComune(storedComune);
            if (storedProvincia) setProvincia(storedProvincia);

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
    
     useEffect(() => {
        if (paymentMethod) {
            if (paymentMethod === 'cash') {
                setAmount(String(baseAmount + 2));
            } else {
                setAmount(String(baseAmount));
            }
        } else {
            setAmount(undefined);
        }
    }, [paymentMethod, baseAmount]);
    
    useEffect(() => {
        if (currentStep === 2 && paymentMethod) {
             if (paymentMethod === 'cash') {
                setAmount(String(baseAmount + 2));
            } else {
                setAmount(String(baseAmount));
            }
        }
    }, [currentStep, paymentMethod, baseAmount]);

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!martialArt || !dojo || !lessonDate) {
                toast({
                    title: "Attenzione",
                    description: "Per favore, seleziona un'arte marziale, un dojo e una data.",
                    variant: "destructive",
                })
                return;
            }
        }
        if (currentStep === 2) {
             if (!paymentMethod || !amount) {
                toast({
                    title: "Attenzione",
                    description: "Per favore, seleziona un metodo di pagamento.",
                    variant: "destructive",
                })
                return;
            }
        }
        setCurrentStep(currentStep + 1);
    }

    const handleRegister = () => {
        if (isMinor) {
            if(parentEmail.toLowerCase() !== registrationEmail?.toLowerCase()) {
                setEmailError(true);
                return;
            }
        } else {
            if(emailConfirm.toLowerCase() !== registrationEmail?.toLowerCase()) {
                setEmailError(true);
                return;
            }
        }
        
        setIsSubmitting(true);
        
        try {
            if (typeof window !== 'undefined') {
                // Save all data to localStorage
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
                } else {
                    localStorage.setItem('isMinor', 'false');
                    localStorage.setItem('phone', phone);
                }
                
                if (paymentMethod) localStorage.setItem('paymentMethod', paymentMethod);
                if (amount) localStorage.setItem('paymentAmount', amount);
                
                 if (setLessonSelected) {
                    setLessonSelected(true);
                }
                localStorage.setItem('lessonSelected', 'true');

                // Open summary in a new tab
                window.open('/dashboard/selection-summary', '_blank');
                 router.push('/dashboard');
            }
            
            toast({
                title: "Riepilogo pronto!",
                description: `Controlla la nuova scheda per il riepilogo della tua iscrizione.`,
            });
            
        } catch (error) {
            console.error("Error during registration process: ", error);
            toast({
                title: "Errore",
                description: "Si è verificato un errore durante il salvataggio dei dati.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

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
        setEmailConfirm(e.target.value.toLowerCase());
        setEmailError(false);
    }

    const handleParentEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setParentEmail(e.target.value.toLowerCase());
        setEmailError(false);
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
        if (secondLessonDay && secondLessonMonth && secondLessonYear) {
            const formattedDate = `${secondLessonDay}/${secondLessonMonth}/${secondLessonYear}`;
            setSavedSecondLessonDate(formattedDate);
        }
        if (thirdLessonDay && thirdLessonMonth && thirdLessonYear) {
            const formattedDate = `${thirdLessonDay}/${thirdLessonMonth}/${thirdLessonYear}`;
            setSavedThirdLessonDate(formattedDate);
        }
        
        if ( (secondLessonDay && secondLessonMonth && secondLessonYear) || (thirdLessonDay && thirdLessonMonth && thirdLessonYear) ) {
            setDatesSaved(true);
            toast({
                title: "Date salvate!",
                description: "Le date delle lezioni sono state aggiornate.",
            });
        } else {
             toast({
                title: "Attenzione",
                description: "Per favore, seleziona almeno una data completa.",
                variant: "destructive"
            });
        }
    };

    const canSaveDates = useMemo(() => {
        return (
            secondLessonDay &&
            secondLessonMonth &&
            secondLessonYear &&
            thirdLessonDay &&
            thirdLessonMonth &&
            thirdLessonYear
        );
    }, [
        secondLessonDay,
        secondLessonMonth,
        secondLessonYear,
        thirdLessonDay,
        thirdLessonMonth,
        thirdLessonYear,
    ]);


  return (
    <>
        {currentStep === 1 && (
            <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Iscriviti alle Lezioni di Selezione</CardTitle>
                <CardDescription>
                Tre incontri per capire e farti capire più un <b>Bonus di inizio percorso di 5 lezioni gratuite</b>.
                Per garantirti la migliore esperienza possibile e un percorso di crescita personalizzato, abbiamo strutturato una modalità d’ingresso che ti permetterà di farti conoscere e di scoprire il mondo delle arti marziali.
                Le lezioni di selezione sono un passaggio fondamentale e obbligatorio per chiunque desideri unirsi alla nostra comunità, indipendentemente dall'età e dal livello di esperienza. Ti comunicheremo telefonicamente la data della prima lezione.
                <br />
                <b>Il contributo per le lezioni di selezione è di 30€.</b>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <form>
                <div className="grid w-full items-center gap-4">
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
                    <Select onValueChange={setDojo} value={dojo}>
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
                        <Select onValueChange={setLessonDate} value={lessonDate}>
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
                </form>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleNextStep}>Avanti</Button>
            </CardFooter>
            </Card>
        )}

        {currentStep === 2 && (
             <Card>
                <CardHeader>
                    <CardTitle>Prenotazione Confermata!</CardTitle>
                    <CardDescription className="font-bold">Inserisci i tuoi dati</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome e Cognome</Label>
                            <Input 
                                id="name" 
                                placeholder="Mario Rossi" 
                                required 
                                value={name}
                                onChange={handleNameChange}
                            />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="birthplace">Nato a:</Label>
                                <Input 
                                    id="birthplace" 
                                    type="text" 
                                    placeholder="Roma" 
                                    required 
                                    value={birthplace}
                                    onChange={handleBirthplaceChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data di nascita:</Label>
                                <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                                    <Select onValueChange={setDay} value={day}>
                                        <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select onValueChange={setMonth} value={month}>
                                        <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                        <SelectContent>
                                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select onValueChange={setYear} value={year}>
                                        <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="codice-fiscale">Codice Fiscale:</Label>
                        <div className="w-full md:w-1/2">
                            <Input 
                                id="codice-fiscale" 
                                placeholder="RSSMRA80A01H501U" 
                                required
                                value={codiceFiscale}
                                onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="address">Residente in:</Label>
                            <Input 
                                id="address" 
                                placeholder="Via, Piazza, etc." 
                                required 
                                value={address}
                                onChange={handleAddressChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="civic-number">N° civico:</Label>
                            <Input id="civic-number" placeholder="12/A" required value={civicNumber} onChange={(e) => setCivicNumber(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cap">C.A.P.:</Label>
                            <Input id="cap" placeholder="00100" required value={cap} onChange={(e) => setCap(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="comune">Comune:</Label>
                            <Input 
                                id="comune" 
                                placeholder="Roma" 
                                required 
                                value={comune}
                                onChange={handleComuneChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provincia">Provincia:</Label>
                            <Input 
                                id="provincia" 
                                placeholder="RM" 
                                required 
                                value={provincia}
                                onChange={(e) => setProvincia(e.target.value.toUpperCase())}
                             />
                        </div>
                    </div>

                    {!isMinor && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Numero di telefono:</Label>
                                <Input id="phone" type="tel" placeholder="3331234567" required={!isMinor} value={phone} onChange={(e) => setPhone(e.target.value)}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email-confirm">Conferma email per contatti:</Label>
                                <Input id="email-confirm" type="email" placeholder="m@example.com" required={!isMinor} value={emailConfirm} onChange={handleEmailConfirmChange}/>
                                {emailError && <p className="text-sm text-destructive">L'email di contatto deve essere uguale all'email di registrazione</p>}
                            </div>
                        </div>
                    )}

                    {isMinor && (
                        <div className="space-y-4 pt-4 mt-4 border-t">
                            <h3 className="text-lg font-semibold">Dati Genitore o tutore</h3>
                             <div className="space-y-2">
                                <Label htmlFor="parent-name">Nome e Cognome Genitore/Tutore</Label>
                                <Input 
                                    id="parent-name" 
                                    placeholder="Paolo Bianchi" 
                                    required={isMinor} 
                                    value={parentName}
                                    onChange={handleParentNameChange}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="parent-cf">Codice Fiscale Genitore/Tutore</Label>
                                <Input id="parent-cf" placeholder="BNCPLA80A01H501Z" required={isMinor} value={parentCf} onChange={(e) => setParentCf(e.target.value.toUpperCase())} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="parent-phone">Numero di telefono:</Label>
                                    <Input id="parent-phone" type="tel" placeholder="3331234567" required={isMinor} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parent-email-confirm">Conferma email per contatti:</Label>
                                    <Input 
                                        id="parent-email-confirm" 
                                        type="email" 
                                        placeholder="m@example.com" 
                                        required={isMinor}
                                        value={parentEmail}
                                        onChange={handleParentEmailChange}
                                     />
                                     {emailError && <p className="text-sm text-destructive">L'email di contatto deve essere uguale all'email di registrazione</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="pt-4 space-y-2">
                        <Separator />
                        <CardTitle className="pt-4 text-slate-400">P30</CardTitle>
                        <CardDescription className="font-bold text-black">
                            Completa la tua iscrizione scegliendo un metodo di pagamento.
                        </CardDescription>
                         
                        <Select onValueChange={setPaymentMethod} value={paymentMethod}>
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
                         <div className="space-y-2">
                            <Label htmlFor="amount">Importo</Label>
                            <Input 
                                id="amount"
                                value={amount ? `€ ${amount}` : 'L\'importo verrà calcolato in base al metodo di pagamento'}
                                disabled
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Indietro</Button>
                    <Button onClick={handleNextStep}>
                        Avanti
                    </Button>
                </CardFooter>
             </Card>
        )}

        {currentStep === 3 && (
            <Card>
                <CardHeader>
                    <CardTitle>La tua prenotazione è stata salvata. Ecco il riepilogo.</CardTitle>
                    <CardDescription className="font-bold text-foreground">
                        Questa scheda è stata salvata. La troverai cliccando sulla voce di menu Lezioni di Selezione. Ti verrà richiesta da un istruttore alla prima lezione.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Pagamento</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                           <p><b>Metodo Pagamento:</b> <span className="text-foreground font-bold">{translatePaymentMethodLocal(paymentMethod ?? null)}</span></p>
                           <p><b>Importo:</b> <span className="text-foreground font-bold">€ {amount}</span></p>
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dettagli Lezione</h3>
                        <div className="space-y-2 text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <p><b>1a Lezione:</b> <span className="text-foreground font-bold">{lessonDate}</span></p>
                                <p className="text-sm">Concordare le date delle prossime lezioni in palestra con il Maestro.</p>
                            </div>
                            <div className="flex items-start gap-4 mt-2">
                                <div className="space-y-2 flex-grow">
                                    <div className="flex items-center gap-4">
                                        <Label className="min-w-max"><b>2a Lezione:</b></Label>
                                        {datesSaved && savedSecondLessonDate ? (
                                            <span className="text-foreground font-bold">{savedSecondLessonDate}</span>
                                        ) : !datesSaved ? (
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
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <Label className="min-w-max"><b>3a Lezione:</b></Label>
                                         {datesSaved && savedThirdLessonDate ? (
                                            <span className="text-foreground font-bold">{savedThirdLessonDate}</span>
                                        ) : !datesSaved ? (
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
                                        ) : null}
                                    </div>
                                </div>
                                {!datesSaved && <Button onClick={handleSaveDates} disabled={!canSaveDates} className="bg-green-600 hover:bg-green-700 self-center">Salva</Button>}
                            </div>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold text-lg mb-2 text-primary">Dati Allievo</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                            <p><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{name}</span></p>
                            <p><b>Nato il:</b> <span className="text-foreground font-bold">{`${day}/${month}/${year}`}</span> a <span className="text-foreground font-bold">{birthplace}</span></p>
                            <p><b>Residenza:</b> <span className="text-foreground font-bold">{`${address}, ${civicNumber} - ${cap} ${comune} (${provincia})`}</span></p>
                             {!isMinor && <p><b>Telefono:</b> <span className="text-foreground font-bold">{phone}</span></p>}
                        </div>
                    </div>

                    {isMinor && (
                         <>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-lg mb-2 text-primary">Dati Genitore/Tutore</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                                    <p><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{parentName}</span></p>
                                    <p><b>Telefono:</b> <span className="text-foreground font-bold">{parentPhone}</span></p>
                                </div>
                            </div>
                        </>
                    )}

                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>Indietro</Button>
                    <Button onClick={handleRegister} disabled={isSubmitting || !datesSaved}>
                        {isSubmitting ? 'Salvataggio...' : 'Fine'}
                    </Button>
                </CardFooter>
            </Card>
        )}
    </>
  )
}

    

    





