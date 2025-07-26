
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
import { Loader2 } from "lucide-react"

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => String(currentYear - i));

export function AssociateForm({ initialData, onFormSubmit }: { initialData?: any, onFormSubmit: (data: any) => void }) {
    const { toast } = useToast()
    
    // Form state
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
    const [martialArt, setMartialArt] = useState<string | undefined>();
    const [dojo, setDojo] = useState<string | undefined>();
    
    // Control state
    const [isFormComplete, setIsFormComplete] = useState(false);
    const [registrationEmail, setRegistrationEmail] = useState<string | null>(null);

    useEffect(() => {
        // Pre-fill form if initialData is provided (e.g., when editing)
        if (initialData) {
            setName(initialData.name || "");
            if (initialData.birthDate) {
                const parts = initialData.birthDate.split('/');
                if (parts.length === 3) {
                    setDay(parts[0]);
                    setMonth(parts[1]);
                    setYear(parts[2]);
                }
            }
            setCodiceFiscale(initialData.codiceFiscale || "");
            setProvincia(initialData.provincia || "");
            setBirthplace(initialData.birthplace || "");
            setAddress(initialData.address || "");
            setCivicNumber(initialData.civicNumber || "");
            setCap(initialData.cap || "");
            setComune(initialData.comune || "");
            setPhone(initialData.phone || "");
            setParentName(initialData.parentName || "");
            setParentCf(initialData.parentCf || "");
            setParentPhone(initialData.parentPhone || "");
            setMartialArt(initialData.martialArt || undefined);
            setDojo(initialData.selectedDojo || undefined);
            setRegistrationEmail(initialData.email || "");
        }
    }, [initialData]);


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

    useEffect(() => {
        const checkFormCompleteness = () => {
            const isCourseSelectionComplete = !!(martialArt && dojo);
            const isStudentDataComplete = !!(name && birthDate && birthplace && codiceFiscale);
            const isAddressComplete = !!(address && civicNumber && cap && comune && provincia);
            const isContactComplete = isMinor ? !!(parentName && parentCf && parentPhone) : !!(phone);
            
            setIsFormComplete(isCourseSelectionComplete && isStudentDataComplete && isAddressComplete && isContactComplete);
        };
        checkFormCompleteness();
    }, [name, birthDate, birthplace, codiceFiscale, address, civicNumber, cap, comune, provincia, phone, parentName, parentCf, parentPhone, martialArt, dojo, isMinor]);


    const handleMartialArtChange = (value: string) => {
        setMartialArt(value);
        if (value === 'aikido') {
            setDojo('aosta');
        } else {
            setDojo(undefined);
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

    const handleSubmit = () => {
        if (!isFormComplete) {
             toast({ title: "Modulo Incompleto", description: "Per favore, compila tutti i campi obbligatori.", variant: "destructive" });
            return
        };

        const formData = {
            name,
            codiceFiscale,
            birthDate: birthDate ? `${day}/${month}/${year}` : '',
            birthplace,
            address,
            civicNumber,
            cap,
            comune,
            provincia,
            isMinor,
            martialArt,
            selectedDojo: dojo,
            phone: isMinor ? '' : phone,
            parentName: isMinor ? parentName : '',
            parentCf: isMinor ? parentCf : '',
            parentPhone: isMinor ? parentPhone : '',
            parentEmail: isMinor ? registrationEmail : '',
            email: isMinor ? '' : registrationEmail,
        };
        
        onFormSubmit(formData);
    };
    
  return (
    <Card>
        <CardHeader>
            <CardTitle className="bg-blue-600 text-white p-6 -mt-6 -mx-6 rounded-t-lg mb-6">Domanda di Associazione</CardTitle>
            <CardDescription className="text-foreground font-bold">Compila tutti i dati per inviare la tua domanda di associazione.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Sezione Corso */}
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">Scelta del Corso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="martial-art">Corso di:</Label>
                        <Select onValueChange={handleMartialArtChange} value={martialArt}>
                            <SelectTrigger id="martial-art">
                                <SelectValue placeholder="Seleziona un corso" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="karate">Karate</SelectItem>
                                <SelectItem value="aikido">Aikido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dojo">Palestra di:</Label>
                        <Select onValueChange={setDojo} value={dojo} disabled={martialArt === 'aikido' || !martialArt}>
                            <SelectTrigger id="dojo">
                                <SelectValue placeholder="Seleziona una palestra" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aosta">Aosta</SelectItem>
                                <SelectItem value="verres">Verres</SelectItem>
                                <SelectItem value="villeneuve">Villeneuve</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Sezione Anagrafica */}
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">Dati Anagrafici Allievo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome e Cognome</Label>
                        <Input id="name" placeholder="Mario Rossi" required value={name} onChange={handleNameChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="birthplace">Nato a:</Label>
                            <Input id="birthplace" type="text" placeholder="Roma" required value={birthplace} onChange={handleBirthplaceChange}/>
                        </div>
                        <div className="space-y-2">
                            <Label>Data di nascita:</Label>
                            <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                                <Select onValueChange={setDay} value={day}>
                                    <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                    <SelectContent>{Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={setMonth} value={month}>
                                    <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                    <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={setYear} value={year}>
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
                        <Input id="codice-fiscale" placeholder="RSSMRA80A01H501U" required value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())} />
                    </div>
                </div>
            </div>
            
            {/* Sezione Residenza */}
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">Dati di Residenza</h3>
                 <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="address">Residente in:</Label>
                        <Input id="address" placeholder="Via, Piazza, etc." required value={address} onChange={handleAddressChange} />
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
                        <Input id="comune" placeholder="Roma" required value={comune} onChange={handleComuneChange}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="provincia">Provincia:</Label>
                        <Input id="provincia" placeholder="RM" required value={provincia} onChange={(e) => setProvincia(e.target.value.toUpperCase())}/>
                    </div>
                </div>
            </div>

            {/* Sezione Contatti (Adulto) o Dati Genitore (Minore) */}
            {birthDate && (
                <div className="space-y-4 p-4 border rounded-lg">
                    {isMinor ? (
                        <>
                            <h3 className="text-lg font-semibold">Dati Genitore/Tutore</h3>
                            <p className="text-sm text-muted-foreground">L'email del genitore per le comunicazioni sarà quella usata per la registrazione: <b>{registrationEmail}</b></p>
                            <div className="space-y-2">
                                <Label htmlFor="parent-name">Nome e Cognome Genitore/Tutore</Label>
                                <Input id="parent-name" placeholder="Paolo Bianchi" required={isMinor} value={parentName} onChange={handleParentNameChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="parent-cf">Codice Fiscale Genitore/Tutore</Label>
                                <Input id="parent-cf" placeholder="BNCPLA80A01H501Z" required={isMinor} value={parentCf} onChange={(e) => setParentCf(e.target.value.toUpperCase())}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="parent-phone">Numero di telefono Genitore/Tutore:</Label>
                                <Input id="parent-phone" type="tel" placeholder="3331234567" required={isMinor} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                            </div>
                        </>
                    ) : (
                         <>
                            <h3 className="text-lg font-semibold">Dati di Contatto</h3>
                            <p className="text-sm text-muted-foreground">L'email per le comunicazioni sarà quella usata per la registrazione: <b>{registrationEmail}</b></p>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Numero di telefono:</Label>
                                <Input id="phone" type="tel" placeholder="3331234567" required={!isMinor} value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button 
                className="bg-blue-600 hover:bg-blue-700" 
                onClick={handleSubmit} 
                disabled={!isFormComplete}
            >
                Vai al Riepilogo
            </Button>
        </CardFooter>
    </Card>
  )
}
