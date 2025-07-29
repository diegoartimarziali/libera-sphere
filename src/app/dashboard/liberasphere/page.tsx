
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
import { Input } from "@/components/ui/input"

export default function LiberaSpherePage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [isFormerMember, setIsFormerMember] = useState<'yes' | 'no' | null>(null)
  const [firstYear, setFirstYear] = useState('')
  const [lastGrade, setLastGrade] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasPracticedBefore, setHasPracticedBefore] = useState<'yes' | 'no' | null>(null);
  const [discipline, setDiscipline] = useState<'karate' | 'aikido' | null>(null);
  const [aikidoGrade, setAikidoGrade] = useState('');


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
    
    let dataToUpdate: any = {};
    let destination = "";

    if (isFormerMember === 'yes') {
        if (!firstYear || !lastGrade || !discipline) {
            toast({ variant: "destructive", title: "Attenzione", description: "Per favore, compila tutti i campi: disciplina, anno e grado." })
            return
        }
        dataToUpdate = {
            isFormerMember,
            discipline,
            lastGrade,
            firstYear, // Note: not in the desired final structure but needed here
        };
        destination = "/dashboard/associates";
    } else { // isFormerMember === 'no'
        if (!hasPracticedBefore) {
             toast({ variant: "destructive", title: "Attenzione", description: "Per favore, specifica se hai già praticato." })
            return
        }
        
        let finalDiscipline = "";
        let finalGrade = "";

        if (hasPracticedBefore === 'no') {
            finalGrade = 'Cintura bianca';
        } else { // hasPracticedBefore === 'yes'
            if (!discipline) {
                 toast({ variant: "destructive", title: "Attenzione", description: "Seleziona la disciplina che hai praticato." });
                return;
            }
            finalDiscipline = discipline;
            
            if (discipline === 'karate') {
                if (!lastGrade) {
                    toast({ variant: "destructive", title: "Attenzione", description: "Seleziona il tuo grado di Karate." });
                    return;
                }
                finalGrade = lastGrade;
            } else { // discipline === 'aikido'
                if (!aikidoGrade.trim()) {
                     toast({ variant: "destructive", title: "Attenzione", description: "Inserisci il tuo grado di Aikido." });
                    return;
                }
                finalGrade = aikidoGrade.trim();
            }
        }
        
        dataToUpdate = {
            isFormerMember,
            hasPracticedBefore,
            discipline: finalDiscipline,
            lastGrade: finalGrade,
        };
        destination = "/dashboard/class-selection";
    }


    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, dataToUpdate);
      
      router.push(destination);

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

  const handleIsFormerMemberChange = (value: 'yes' | 'no') => {
      setIsFormerMember(value);
      // Reset other states to avoid carrying over data between choices
      setHasPracticedBefore(null);
      setDiscipline(null);
      setLastGrade('');
      setAikidoGrade('');
      setFirstYear('');
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
            onValueChange={(value) => handleIsFormerMemberChange(value as 'yes' | 'no')}
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
          
          {isFormerMember === 'no' && (
            <div className="space-y-4 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
              <h4 className="font-semibold text-foreground">Hai già praticato Karate o Aikido in altre associazioni?</h4>
              <RadioGroup
                value={hasPracticedBefore || ''}
                onValueChange={(value) => setHasPracticedBefore(value as 'yes' | 'no')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="practiced_no" />
                  <Label htmlFor="practiced_no">No, mai</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="practiced_yes" />
                  <Label htmlFor="practiced_yes">Sì, ho già praticato</Label>
                </div>
              </RadioGroup>

              {hasPracticedBefore === 'yes' && (
                  <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                      <h4 className="font-semibold text-foreground">Quale disciplina?</h4>
                       <RadioGroup
                          value={discipline || ''}
                          onValueChange={(value) => setDiscipline(value as 'karate' | 'aikido')}
                          className="space-y-2"
                      >
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="karate" id="karate" />
                              <Label htmlFor="karate">Karate</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="aikido" id="aikido" />
                              <Label htmlFor="aikido">Aikido</Label>
                          </div>
                      </RadioGroup>

                      {discipline === 'karate' && (
                          <div className="mt-4 space-y-2">
                               <Label htmlFor="lastGradeNew">Il tuo grado attuale</Label>
                               <Select value={lastGrade} onValueChange={setLastGrade}>
                                  <SelectTrigger id="lastGradeNew">
                                      <SelectValue placeholder="Seleziona il grado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {grades.map(grade => (
                                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                      )}

                      {discipline === 'aikido' && (
                          <div className="mt-4 space-y-2">
                              <Label htmlFor="aikidoGrade">Il tuo grado attuale</Label>
                              <Input 
                                id="aikidoGrade" 
                                value={aikidoGrade}
                                onChange={(e) => setAikidoGrade(e.target.value)}
                                placeholder="Es. 1° Kyu"
                              />
                          </div>
                      )}

                  </div>
              )}
            </div>
          )}

          {isFormerMember === 'yes' && (
            <div className="space-y-4 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                <h4 className="font-semibold text-foreground">Quale disciplina hai praticato con noi?</h4>
                <RadioGroup
                    value={discipline || ''}
                    onValueChange={(value) => setDiscipline(value as 'karate' | 'aikido')}
                    className="space-y-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="former_karate" id="former_karate" />
                        <Label htmlFor="former_karate">Karate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="former_aikido" id="former_aikido" />
                        <Label htmlFor="former_aikido">Aikido</Label>
                    </div>
                </RadioGroup>
                
                <h4 className="font-semibold text-foreground mt-4 pt-4 border-t">Completa i tuoi dati</h4>
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
