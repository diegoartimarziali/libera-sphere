
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
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { Copy, Loader2 } from "lucide-react"
import { db, auth } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { format } from "date-fns"

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => String(currentYear - i));

const SUMUP_ASSOCIATION_LINK = 'https://pay.sumup.com/b2c/Q9ZH35JE';

export function AssociateForm({ setHasUserData, userData }: { setHasUserData: (value: boolean) => void, userData?: any }) {
    const { toast } = useToast()
    const router = useRouter()
    
    const [martialArt, setMartialArt] = useState<string | undefined>();
    const [dojo, setDojo] = useState<string | undefined>();

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
    
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [amount, setAmount] = useState<string | undefined>();
    const [emailError, setEmailError] = useState(false);
    const [showBankTransferDialog, setShowBankTransferDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const bankDetails = {
        iban: "IT12A345B678C901D234E567F890",
        beneficiary: "Associazione Libera Energia ASD",
        cause: `Quota associativa ${name}`
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: "Copiato!", description: "Dettagli bancari copiati negli appunti." });
        }, (err) => {
            toast({ title: "Errore", description: "Impossibile copiare i dettagli.", variant: "destructive" });
        });
    }

    useEffect(() => {
        if (userData) {
            setName(userData.name || "");
            setCodiceFiscale(userData.codiceFiscale || "");
            if (userData.birthDate) {
                const [dayStr, monthStr, yearStr] = userData.birthDate.split('/');
                if (dayStr && monthStr && yearStr) {
                    setDay(dayStr);
                    setMonth(monthStr);
                    setYear(yearStr);
                }
            }
            setBirthplace(userData.birthplace || "");
            setAddress(userData.address || "");
            setCivicNumber(userData.civicNumber || "");
            setCap(userData.cap || "");
            setComune(userData.comune || "");
            setProvincia(userData.provincia || "");
            setPhone(userData.phone || "");
            setParentName(userData.parentName || "");
            setParentCf(userData.parentCf || "");
            setParentPhone(userData.parentPhone || "");
            setParentEmail(userData.parentEmail || "");
            setEmailConfirm(userData.email || "");
            setMartialArt(userData.martialArt);
            setDojo(userData.selectedDojo);
        }
    }, [userData]);

    useEffect(() => {
        if (paymentMethod === 'online' || paymentMethod === 'bank') {
            setAmount("120");
        } else if (paymentMethod === 'cash') {
            setAmount("122");
        } else {
            setAmount(undefined);
        }
    }, [paymentMethod]);

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
        if (!user || !paymentMethod || !amount) {
            toast({ title: "Errore", description: "Dati utente o di pagamento mancanti.", variant: "destructive" });
            throw new Error("Dati mancanti");
        }

        const dataToUpdate: any = {
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
            paymentMethod,
            paymentAmount: amount,
            associationStatus: 'requested',
            associationRequestDate: format(new Date(), "dd/MM/yyyy"),
            martialArt,
            selectedDojo
        };

        if (isMinor) {
            dataToUpdate.parentName = parentName;
            dataToUpdate.parentCf = parentCf;
            dataToUpdate.parentPhone = parentPhone;
            dataToUpdate.parentEmail = parentEmail;
        } else {
            dataToUpdate.phone = phone;
        }
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, dataToUpdate);

        } catch (error) {
            console.error("Error writing data to Firestore: ", error);
            toast({ title: "Errore Database", description: "Impossibile salvare i dati.", variant: "destructive" });
            throw error;
        }
    };
    
    const handlePayment = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            await saveDataToFirestore();

            if (paymentMethod === 'online') {
                const paymentUrl = encodeURIComponent(SUMUP_ASSOCIATION_LINK);
                const returnUrl = encodeURIComponent('/dashboard');
                router.push(`/dashboard/payment-gateway?url=${paymentUrl}&returnTo=${returnUrl}`);
            } else if (paymentMethod === 'bank') {
                setShowBankTransferDialog(true);
            } else if (paymentMethod === 'cash') {
                toast({
                    title: "Dati Salvati e Domanda Inviata!",
                    description: `Presentati in segreteria per completare il pagamento di ${amount}€.`,
                });
                router.push('/dashboard');
                setIsSubmitting(false);
            }
        } catch (error) {
             // Error is already toasted, just stop submitting
             setIsSubmitting(false);
        }
    };

     const handleConfirmBankTransfer = async () => {
        setShowBankTransferDialog(false);
        setIsSubmitting(false);
        toast({
            title: "Dati Salvati e Domanda Inviata!",
            description: "Effettua il bonifico usando i dati forniti. La tua domanda verrà approvata alla ricezione del pagamento.",
        });
        router.push('/dashboard');
    };

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

    const handleEmailConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value.toLowerCase();
        setEmailConfirm(newEmail);
        if (userData?.email && newEmail && newEmail.toLowerCase() !== userData.email.toLowerCase()) {
            setEmailError(true);
        } else {
            setEmailError(false);
        }
    }

    const handleParentEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value.toLowerCase();
        setParentEmail(newEmail);
        if (userData?.email && newEmail && newEmail.toLowerCase() !== userData.email.toLowerCase()) {
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

    // Sequential validation states
    const isCourseSelectionComplete = !!(martialArt && dojo);
    const isNameComplete = isCourseSelectionComplete && name.trim() !== '';
    const isBirthInfoComplete = isNameComplete && birthplace.trim() !== '' && !!birthDate;
    const isCfComplete = isBirthInfoComplete && codiceFiscale.trim().length === 16;
    const isAddressComplete = isCfComplete && address.trim() !== '' && civicNumber.trim() !== '';
    const isLocationComplete = isAddressComplete && cap.trim() !== '' && comune.trim() !== '' && provincia.trim() !== '';
    
    const isStudentInfoComplete = useMemo(() => {
        if (!isLocationComplete) return false;
        if (isMinor) return true; // Parent info is checked separately
        return phone.trim() !== '' && emailConfirm.trim() !== '' && !emailError;
    }, [isLocationComplete, isMinor, phone, emailConfirm, emailError]);

    const isParentInfoComplete = useMemo(() => {
        if (!isMinor) return true; // Not applicable
        return parentName.trim() !== '' && parentCf.trim().length === 16 && parentPhone.trim() !== '' && parentEmail.trim() !== '' && !emailError;
    }, [isMinor, parentName, parentCf, parentPhone, parentEmail, emailError]);
    
    const isFormComplete = useMemo(() => !!(
        isStudentInfoComplete &&
        isParentInfoComplete &&
        paymentMethod
    ), [isStudentInfoComplete, isParentInfoComplete, paymentMethod]);


  return (
    <>
    <Card>
        <CardHeader>
            <CardTitle className="bg-blue-600 text-white p-6 -mt-6 -mx-6 rounded-t-lg mb-6">Domanda di Associazione</CardTitle>
            <CardDescription className="text-foreground font-bold">Compila i dati per inviare la tua domanda di associazione.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="name">Nome e Cognome</Label>
                    <Input 
                        id="name" 
                        placeholder="Mario Rossi" 
                        required 
                        value={name}
                        onChange={handleNameChange}
                        disabled={!isCourseSelectionComplete}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthplace">nato a:</Label>
                        <Input 
                            id="birthplace" 
                            type="text" 
                            placeholder="Roma" 
                            required 
                            value={birthplace}
                            onChange={handleBirthplaceChange}
                            disabled={!isNameComplete}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Data di nascita:</Label>
                        <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                            <Select onValueChange={setDay} value={day} disabled={!isNameComplete}>
                                <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={setMonth} value={month} disabled={!isNameComplete}>
                                <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={setYear} value={year} disabled={!isNameComplete}>
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
                        disabled={!isBirthInfoComplete}
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
                        disabled={!isCfComplete}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="civic-number">N° civico:</Label>
                    <Input id="civic-number" placeholder="12/A" required value={civicNumber} onChange={(e) => setCivicNumber(e.target.value)} disabled={!isCfComplete}/>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cap">C.A.P.:</Label>
                    <Input id="cap" placeholder="00100" required value={cap} onChange={(e) => setCap(e.target.value)} disabled={!isAddressComplete}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="comune">Comune:</Label>
                    <Input 
                        id="comune" 
                        placeholder="Roma" 
                        required 
                        value={comune}
                        onChange={handleComuneChange}
                        disabled={!isAddressComplete}
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
                        disabled={!isAddressComplete}
                    />
                </div>
            </div>

            <p className="pt-4 text-sm text-foreground font-bold text-center">
                Chiede di essere ammesso in qualità di socio all'associazione Libera Energia.
            </p>

            {!isMinor && isLocationComplete && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Numero di telefono:</Label>
                        <Input id="phone" type="tel" placeholder="3331234567" required={!isMinor} value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email-confirm">Conferma email per contatti:</Label>
                        <Input id="email-confirm" type="email" placeholder="m@example.com" required={!isMinor} value={emailConfirm} onChange={handleEmailConfirmChange}/>
                        {emailError && <p className="text-sm text-destructive">L'email di contatto deve essere uguale all'email di registrazione</p>}
                    </div>
                </div>
            )}

            {isMinor && isLocationComplete && (
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
                        <Input id="parent-cf" placeholder="BNCPLA80A01H501Z" required={isMinor} value={parentCf} onChange={(e) => setParentCf(e.target.value.toUpperCase())} disabled={parentName.trim() === ''}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent-phone">Numero di telefono:</Label>
                            <Input id="parent-phone" type="tel" placeholder="3331234567" required={isMinor} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} disabled={parentCf.trim().length !== 16} />
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
                                disabled={parentPhone.trim() === ''}
                                 />
                            {emailError && <p className="text-sm text-destructive">L'email di contatto deve essere uguale all'email di registrazione</p>}
                        </div>
                    </div>
                </div>
            )}

            <Separator />
            <div className="space-y-4">
                <Label className="font-bold">Contributo associativo: € {amount || '120'}</Label>
                 <Select 
                    onValueChange={setPaymentMethod} 
                    value={paymentMethod} 
                    disabled={!isStudentInfoComplete || !isParentInfoComplete}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Scegli un metodo di pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="online">Carta di credito on line</SelectItem>
                        <SelectItem value="bank">Bonifico Bancario</SelectItem>
                        <SelectItem value="cash">Contanti o Bancomat in palestra (+ 2 € costi di gestione)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handlePayment} disabled={!isFormComplete || isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Procedi con il Pagamento'}
            </Button>
        </CardFooter>
    </Card>

    <AlertDialog open={showBankTransferDialog} onOpenChange={(open) => {
        if (!open) {
            setIsSubmitting(false); // Reset on close
        }
        setShowBankTransferDialog(open);
    }}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Dati per Bonifico Bancario</AlertDialogTitle>
                <AlertDialogDescription>
                    Effettua il bonifico utilizzando i dati seguenti. La tua associazione verrà confermata alla ricezione del pagamento.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 my-4">
                <div className="space-y-1">
                    <Label className="text-muted-foreground">Beneficiario</Label>
                    <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">{bankDetails.beneficiary}</span>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.beneficiary)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-muted-foreground">IBAN</Label>
                    <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">{bankDetails.iban}</span>
                         <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.iban)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-muted-foreground">Importo</Label>
                     <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">€ {amount}</span>
                         <Button variant="ghost" size="icon" onClick={() => copyToClipboard(amount || '')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-muted-foreground">Causale</Label>
                    <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">{bankDetails.cause}</span>
                         <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.cause)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogAction onClick={handleConfirmBankTransfer}>Ho capito, procedi</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
