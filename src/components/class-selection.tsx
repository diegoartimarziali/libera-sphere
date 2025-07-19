
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

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => String(currentYear - i));

const lessonDatesByDojo: { [key: string]: string[] } = {
    aosta: ["1 Settembre 2024", "8 Settembre 2024", "15 Settembre 2024"],
    villeneuve: ["2 Settembre 2024", "9 Settembre 2024", "16 Settembre 2024"],
    verres: ["3 Settembre 2024", "10 Settembre 2024", "17 Settembre 2024"],
};

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

    const availableDates = dojo ? lessonDatesByDojo[dojo] : [];

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
            setCurrentStep(2);
        } else {
             handleRegister();
        }
    }

    const handleRegister = () => {
        if (isMinor) {
             if(parentEmail.toLowerCase() !== registrationEmail?.toLowerCase()){
                setEmailError(true);
                return;
            }
        } else {
            if(emailConfirm.toLowerCase() !== registrationEmail?.toLowerCase()) {
                setEmailError(true);
                return;
            }
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem('userName', name);
            localStorage.setItem('codiceFiscale', codiceFiscale);
            localStorage.setItem('lessonDate', lessonDate);
            localStorage.setItem('selectedDojo', dojo);
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
                localStorage.setItem('parentName', parentName);
                localStorage.setItem('parentCf', parentCf);
                localStorage.setItem('parentPhone', parentPhone);
                localStorage.setItem('parentEmail', parentEmail);
            } else {
                localStorage.setItem('phone', phone);
            }

            localStorage.setItem('lessonSelected', 'true');
        }
        if (setLessonSelected) {
            setLessonSelected(true);
        }
        toast({
            title: "Registrazione Riuscita!",
            description: "Ti sei registrato al corso. Verrai contattato a breve.",
        })
        router.push('/dashboard');
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
                <b>Il contributo per le lezioni di selezione è di 30€ che pagherai alla prima lezione, direttamente in palestra.</b>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <form>
                <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="gym">Arte marziale scelta</Label>
                    <Select onValueChange={setMartialArt} value={martialArt}>
                        <SelectTrigger id="gym">
                        <SelectValue placeholder="Seleziona un'arte marziale" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                        <SelectItem value="karate">Karate</SelectItem>
                        <SelectItem value="aikido">Aikido</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="dojo">Dojo di</Label>
                    <Select onValueChange={setDojo} value={dojo}>
                        <SelectTrigger id="dojo">
                        <SelectValue placeholder="Seleziona un dojo" />
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
                        <Label htmlFor="lesson-date">Data prima lezione</Label>
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
                    <CardTitle>Inserisci i tuoi dati</CardTitle>
                    <CardDescription>Completa con le tue informazioni per finalizzare l'iscrizione.</CardDescription>
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
                                <Label htmlFor="birthplace">nato/a a:</Label>
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
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>Indietro</Button>
                    <Button onClick={handleRegister}>Conferma Iscrizione</Button>
                </CardFooter>
             </Card>
        )}
    </>
  )
}
