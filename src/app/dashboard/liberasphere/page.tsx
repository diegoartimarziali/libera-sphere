
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
import { cn } from "@/lib/utils"

// Definiamo i dati statici per le palestre
const gymOptions = {
    karate: [
        { id: "aosta", name: "Aosta" },
        { id: "villeneuve", name: "Villeneuve" },
        { id: "verres", name: "Verres" }
    ],
    aikido: [
        { id: "aosta", name: "Aosta" }
    ]
};

export default function LiberaSpherePage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  
  // Stati per il flusso unificato
  const [isFormerMember, setIsFormerMember] = useState<'yes' | 'no' | null>(null)
  const [discipline, setDiscipline] = useState<'karate' | 'aikido' | null>(null);
  const [gym, setGym] = useState('');
  const [hasPracticedBefore, setHasPracticedBefore] = useState<'yes' | 'no' | null>(null);
  const [lastGrade, setLastGrade] = useState('');
  const [aikidoGrade, setAikidoGrade] = useState('');
  const [firstYear, setFirstYear] = useState('');


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
  
  const handleIsFormerMemberChange = (value: 'yes' | 'no') => {
      setIsFormerMember(value);
      // Resetta tutti gli altri stati per evitare dati sporchi tra le selezioni
      setDiscipline(null);
      setGym('');
      setHasPracticedBefore(null);
      setLastGrade('');
      setAikidoGrade('');
      setFirstYear('');
  };
  
  const handleDisciplineChange = (value: 'karate' | 'aikido') => {
      setDiscipline(value);
      // Resetta gli stati dipendenti quando cambia la disciplina
      setGym('');
      setHasPracticedBefore(null);
      setLastGrade('');
      setAikidoGrade('');
      if (value === 'aikido') {
          setGym('Aosta'); // Se aikido, imposta automaticamente la palestra
      }
  }

  const isContinueDisabled = () => {
    if (!isFormerMember) return true;

    if (isFormerMember === 'yes') {
        return !discipline || !gym || !firstYear || !lastGrade;
    }

    if (isFormerMember === 'no') {
        if (!discipline || !gym) return true;
        if (!hasPracticedBefore) return true;
        if (hasPracticedBefore === 'yes') {
            const finalGrade = discipline === 'karate' ? lastGrade : aikidoGrade.trim();
            return !finalGrade;
        }
    }

    return false;
  }

  const handleContinue = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Errore", description: "Utente non autenticato." });
      return;
    }

    if (isContinueDisabled()) {
       toast({ variant: "destructive", title: "Attenzione", description: "Per favore, compila tutti i campi richiesti." });
       return;
    }

    setIsLoading(true);
    const userDocRef = doc(db, "users", user.uid);
    
    let dataToUpdate: any = { isFormerMember };
    let destination = "";

    try {
        dataToUpdate.discipline = discipline;
        dataToUpdate.gym = gym;
        
        if (isFormerMember === 'yes') {
            dataToUpdate.firstYear = firstYear;
            dataToUpdate.lastGrade = lastGrade;
            destination = "/dashboard/associates";
        } else { // isFormerMember === 'no'
            dataToUpdate.firstYear = new Date().getFullYear().toString();
            dataToUpdate.hasPracticedBefore = hasPracticedBefore;

            if (hasPracticedBefore === 'yes') {
                 const finalGrade = discipline === 'karate' ? lastGrade : aikidoGrade.trim();
                 dataToUpdate.pastExperience = { discipline, grade: finalGrade };
                 dataToUpdate.lastGrade = finalGrade;
            } else { // hasPracticedBefore === 'no'
                dataToUpdate.pastExperience = { discipline, grade: "Cintura bianca" };
                dataToUpdate.lastGrade = "Cintura bianca";
            }
            destination = "/dashboard/class-selection";
        }

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

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Benvenuto!</CardTitle>
          <CardDescription>
            Per iniziare, dicci qualcosa di te.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
             <h4 className="font-semibold text-foreground">1. Sei già stato dei nostri?</h4>
             <RadioGroup 
                value={isFormerMember || ''} 
                onValueChange={(value) => handleIsFormerMemberChange(value as 'yes' | 'no')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <Label htmlFor="no" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground", isFormerMember === 'no' && 'border-primary')}>
                  <RadioGroupItem value="no" id="no" className="sr-only" />
                  <span className="text-center font-semibold">No, è la mia prima volta</span>
                </Label>
                <Label htmlFor="yes" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground", isFormerMember === 'yes' && 'border-primary')}>
                  <RadioGroupItem value="yes" id="yes" className="sr-only" />
                  <span className="text-center font-semibold">Sì, sono già stato socio</span>
                </Label>
              </RadioGroup>
          </div>
         
          {isFormerMember === 'no' && (
            <div className="space-y-6 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">2. Quale disciplina vuoi praticare?</h4>
                <RadioGroup
                    value={discipline || ''}
                    onValueChange={(value) => handleDisciplineChange(value as 'karate' | 'aikido')}
                    className="grid grid-cols-2 gap-4"
                >
                    <Label htmlFor="karate_new" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'karate' && "border-primary")}>
                        <RadioGroupItem value="karate" id="karate_new" className="sr-only" />
                        <span>Karate</span>
                    </Label>
                    <Label htmlFor="aikido_new" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'aikido' && "border-primary")}>
                        <RadioGroupItem value="aikido" id="aikido_new" className="sr-only" />
                        <span>Aikido</span>
                    </Label>
                </RadioGroup>
              </div>

               {discipline && (
                    <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                         <div>
                            <Label htmlFor="gym_new">In quale palestra vuoi fare le tue selezioni?</Label>
                             {discipline === 'karate' ? (
                                <Select value={gym} onValueChange={setGym}>
                                    <SelectTrigger id="gym_new">
                                        <SelectValue placeholder="Seleziona la palestra" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gymOptions.karate.map(g => (
                                            <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input value="Aosta" disabled />
                            )}
                         </div>
                    </div>
                )}
              
              {gym && (
                <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                    <h4 className="font-semibold text-foreground">3. Hai già praticato {discipline === 'karate' ? 'Karate' : 'Aikido'} in altre associazioni?</h4>
                    <RadioGroup
                        value={hasPracticedBefore || ''}
                        onValueChange={(value) => setHasPracticedBefore(value as 'yes' | 'no')}
                        className="flex gap-4"
                    >
                        <Label htmlFor="practiced_no" className={cn("flex items-center space-x-2 p-2 border rounded-md cursor-pointer flex-1 justify-center bg-background", hasPracticedBefore === 'no' && 'border-primary')}>
                            <RadioGroupItem value="no" id="practiced_no" />
                            <span>No, mai</span>
                        </Label>
                         <Label htmlFor="practiced_yes" className={cn("flex items-center space-x-2 p-2 border rounded-md cursor-pointer flex-1 justify-center bg-background", hasPracticedBefore === 'yes' && 'border-primary')}>
                            <RadioGroupItem value="yes" id="practiced_yes" />
                            <span>Sì, ho già praticato</span>
                        </Label>
                    </RadioGroup>
                </div>
              )}

              {hasPracticedBefore === 'yes' && (
                  <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                      <h4 className="font-semibold text-foreground">4. Qual è il tuo grado attuale?</h4>
                      {discipline === 'karate' && (
                          <div className="space-y-2">
                               <Select value={lastGrade} onValueChange={setLastGrade}>
                                  <SelectTrigger>
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
                          <div className="space-y-2">
                              <Input 
                                value={aikidoGrade}
                                onChange={(e) => setAikidoGrade(e.target.value)}
                                placeholder="Es. 1° Kyu, Shodan, ecc."
                              />
                          </div>
                      )}
                  </div>
              )}
            </div>
          )}

          {isFormerMember === 'yes' && (
            <div className="space-y-6 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">2. Quale disciplina hai praticato con noi?</h4>
                    <RadioGroup
                        value={discipline || ''}
                        onValueChange={(value) => handleDisciplineChange(value as 'karate' | 'aikido')}
                        className="grid grid-cols-2 gap-4"
                    >
                       <Label htmlFor="karate_former" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'karate' && "border-primary")}>
                            <RadioGroupItem value="karate" id="karate_former" className="sr-only" />
                            <span>Karate</span>
                        </Label>
                        <Label htmlFor="aikido_former" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'aikido' && "border-primary")}>
                            <RadioGroupItem value="aikido" id="aikido_former" className="sr-only" />
                            <span>Aikido</span>
                        </Label>
                    </RadioGroup>
                </div>
                
                {discipline && (
                    <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                         <div>
                            <Label htmlFor="gym">In quale palestra?</Label>
                             {discipline === 'karate' ? (
                                <Select value={gym} onValueChange={setGym}>
                                    <SelectTrigger id="gym">
                                        <SelectValue placeholder="Seleziona la palestra" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gymOptions.karate.map(g => (
                                            <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input value="Aosta" disabled />
                            )}
                         </div>
                    </div>
                )}
                
                {gym && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t mt-4 animate-in fade-in-50">
                         <div>
                            <Label htmlFor="firstYear">Primo Anno di Associazione</Label>
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
                            <Label htmlFor="lastGrade">Il Tuo Grado Attuale</Label>
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
                )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleContinue} disabled={isContinueDisabled() || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prosegui
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

    