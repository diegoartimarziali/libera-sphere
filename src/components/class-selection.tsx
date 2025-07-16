
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
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon } from "lucide-react"

export function ClassSelection() {
    const { toast } = useToast()
    const [currentStep, setCurrentStep] = useState(1);
    const [martialArt, setMartialArt] = useState("");
    const [dojo, setDojo] = useState("");
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);


    const handleNextStep = () => {
        if (!martialArt || !dojo) {
            toast({
                title: "Attenzione",
                description: "Per favore, seleziona un'arte marziale e un dojo.",
                variant: "destructive",
            })
            return;
        }
        setCurrentStep(2);
    }

    const handleRegister = () => {
        toast({
            title: "Registrazione Riuscita!",
            description: "Ti sei registrato al corso. Verrai contattato a breve.",
        })
    }

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
                <b>Il contributo per le lezioni di selezione è di 30€ che pagherai alla prima lezione.</b>
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
                        <SelectItem value="principianti">Principianti - Lun 18:00</SelectItem>
                        <SelectItem value="intermedi">Intermedi - Mar 19:00</SelectItem>
                        <SelectItem value="avanzati">Avanzati - Mer 17:30</SelectItem>
                        <SelectItem value="agonisti">Agonisti - Gio 19:00</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
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
                     <div className="space-y-2">
                        <Label htmlFor="name">Nome e Cognome</Label>
                        <Input id="name" placeholder="Mario Rossi" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="birthplace">nato/a a:</Label>
                        <Input id="birthplace" type="text" placeholder="Roma" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="birthdate">il:</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="birthdate"
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !birthDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {birthDate ? format(birthDate, "PPP", { locale: it }) : <span>Seleziona una data</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={birthDate}
                                onSelect={setBirthDate}
                                initialFocus
                                locale={it}
                                captionLayout="dropdown-buttons"
                                fromYear={1930}
                                toYear={new Date().getFullYear()}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="codice-fiscale">Codice Fiscale:</Label>
                        <Input id="codice-fiscale" placeholder="RSSMRA80A01H501U" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Residente in:</Label>
                        <Input id="address" placeholder="Via, Piazza, etc." required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="civic-number">N° civico:</Label>
                        <Input id="civic-number" placeholder="12/A" required />
                    </div>
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
