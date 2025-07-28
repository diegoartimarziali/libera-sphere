
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function LiberaSpherePage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [isFormerMember, setIsFormerMember] = useState<'yes' | 'no' | null>(null)
  const [firstYear, setFirstYear] = useState('')
  const [lastGrade, setLastGrade] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const currentYear = new Date().getFullYear();
  const startYear = 2016;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());

  const grades = [
    "Cintura bianca",
    "Cintura bianca gialla",
    "Cintura gialla",
    "Cintura arancio",
    "Cintura verde",
    "Cintura blu",
    "Cintura viola",
    "Cintura marrone 2° kyu",
    "Cintura marrone 1° kyu",
    "Cintura nera 1 dan",
    "Cintura nera 2 dan",
    "Cintura nera 3 dan",
    "Cintura nera 4° dan"
  ];

  const handleContinue = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Errore", description: "Utente non autenticato." })
      return
    }

    if (!isFormerMember) {
      toast({ variant: "destructive", title: "Attenzione", description: "Devi selezionare un'opzione." })
      return
    }
    
    let dataToUpdate: any = { isFormerMember };

    if (isFormerMember === 'yes') {
        if (!firstYear || !lastGrade) {
            toast({ variant: "destructive", title: "Attenzione", description: "Per favore, compila anno e grado." })
            return
        }
        dataToUpdate.firstYear = firstYear;
        dataToUpdate.lastGrade = lastGrade;
    }

    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, dataToUpdate);
      
      window.location.reload();

    } catch (error) {
      console.error("Error updating user choice:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Non è stato possibile salvare la tua scelta. Riprova.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Benvenuto!</CardTitle>
          <CardDescription>
            Aiutaci a capire il tuo percorso. Sei già stato dei nostri in passato?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={isFormerMember || ''} 
            onValueChange={(value) => setIsFormerMember(value as 'yes' | 'no')}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no">No, è la mia prima volta</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes">Si, sono già stato socio</Label>
            </div>
          </RadioGroup>

          {isFormerMember === 'yes' && (
            <div className="space-y-4 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                <h4 className="font-semibold text-foreground">Da che anno sei con noi?</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <div>
                        <Label htmlFor="firstYear">Primo Anno di Iscrizione</Label>
                        <Select value={firstYear} onValueChange={setFirstYear}>
                            <SelectTrigger id="firstYear">
                                <SelectValue placeholder="Seleziona l'anno" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                     <div>
                        <Label htmlFor="lastGrade">Il tuo grado attuale</Label>
                        <Select value={lastGrade} onValueChange={setLastGrade}>
                            <SelectTrigger id="lastGrade">
                                <SelectValue placeholder="Seleziona il grado" />
                            </SelectTrigger>
                            <SelectContent>
                                {grades.map(grade => (
                                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleContinue} disabled={!isFormerMember || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prosegui
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
