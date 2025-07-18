
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

export function AssociateForm() {
    const { toast } = useToast()
    const router = useRouter()
    
    const [name, setName] = useState("");
    const [day, setDay] = useState<string | undefined>(undefined);
    const [month, setMonth] = useState<string | undefined>(undefined);
    const [year, setYear] = useState<string | undefined>(undefined);
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

    const [codiceFiscale, setCodiceFiscale] = useState("");
    const [provincia, setProvincia] = useState("");
    const [birthplace, setBirthplace] = useState("");
    const [address, setAddress] = useState("");
    const [comune, setComune] = useState("");
    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [registrationEmail, setRegistrationEmail] = useState<string | null>(null);
    const [emailError, setEmailError] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
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

    const handleSave = () => {
        if (isMinor && parentEmail.toLowerCase() !== registrationEmail?.toLowerCase()) {
            setEmailError(true);
            return;
        }
        // Here you would typically send the data to a backend/Firebase
        if (typeof window !== 'undefined') {
            localStorage.setItem('userName', name);
            localStorage.setItem('codiceFiscale', codiceFiscale);
            if (birthDate) {
                localStorage.setItem('birthDate', `${day}/${month}/${year}`);
            }
            localStorage.setItem('address', address);
            localStorage.setItem('comune', comune);
            localStorage.setItem('provincia', provincia);
            // Mark as having submitted data
            localStorage.setItem('lessonSelected', 'true'); // Using this as a proxy for data submission
        }
        toast({
            title: "Dati Salvati!",
            description: "I tuoi dati sono stati registrati con successo.",
        })
        // Force a re-render or redirect to update the view
        router.refresh();
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

    const handleParentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const capitalized = value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        setParentName(capitalized);
    };

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
    <Card>
        <CardHeader>
            <CardTitle>Inserisci i tuoi dati</CardTitle>
            <CardDescription>Completa con le tue informazioni per la domanda di associazione.</CardDescription>
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
                <Input 
                    id="codice-fiscale" 
                    placeholder="RSSMRA80A01H501U" 
                    required
                    value={codiceFiscale}
                    onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                />
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
                    <Input id="civic-number" placeholder="12/A" required />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cap">C.A.P.:</Label>
                    <Input id="cap" placeholder="00100" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="comune">Comune:</Label>
                    <Input 
                        id="comune" 
                        placeholder="Roma" 
                        required 
                        value={comune}
                        onChange={(e) => setComune(e.target.value)}
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
                        <Input id="phone" type="tel" placeholder="3331234567" required={!isMinor} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email-confirm">Conferma email per contatti:</Label>
                        <Input id="email-confirm" type="email" placeholder="m@example.com" required={!isMinor} />
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
                        <Input id="parent-cf" placeholder="BNCPLA80A01H501Z" required={isMinor} />
                    </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent-phone">Numero di telefono:</Label>
                            <Input id="parent-phone" type="tel" placeholder="3331234567" required={isMinor} />
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
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Annulla</Button>
            <Button onClick={handleSave}>Salva e Procedi all'Associazione</Button>
        </CardFooter>
    </Card>
  )
}
