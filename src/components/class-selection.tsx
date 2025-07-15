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
import { useToast } from "@/hooks/use-toast"

export function ClassSelection() {
    const { toast } = useToast()

    const handleRegister = () => {
        toast({
            title: "Registrazione Riuscita!",
            description: "Ti sei registrato al corso.",
        })
    }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>3 Lezioni di Selezione</CardTitle>
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
              <Select>
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
              <Select>
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
        <Button onClick={handleRegister}>Registrati</Button>
      </CardFooter>
    </Card>
  )
}
