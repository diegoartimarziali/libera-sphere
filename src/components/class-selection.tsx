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
    <Card>
      <CardHeader>
        <CardTitle>Registrati a un Corso</CardTitle>
        <CardDescription>
          Seleziona la tua palestra e il tuo corso preferiti per iniziare.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="gym">Sede Palestra</Label>
              <Select>
                <SelectTrigger id="gym">
                  <SelectValue placeholder="Seleziona una palestra" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="downtown">Fitness Centro</SelectItem>
                  <SelectItem value="uptown">Forza Periferia</SelectItem>
                  <SelectItem value="suburban">Benessere Suburbano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="class">Corso</Label>
              <Select>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Seleziona un corso" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="yoga">Yoga Flow - Lun 18:00</SelectItem>
                  <SelectItem value="spin">Spin Cycle - Mar 07:00</SelectItem>
                  <SelectItem value="hiit">HIIT Blast - Mer 17:30</SelectItem>
                  <SelectItem value="zumba">Zumba Party - Gio 19:00</SelectItem>
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
