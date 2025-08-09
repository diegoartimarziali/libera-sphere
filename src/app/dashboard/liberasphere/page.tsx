"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, collection, getDocs, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Gym {
    id: string;
    name: string;
    disciplines: string[];
    address: string;
    streetNumber: string;
    city: string;
}

export default function LiberaSpherePage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [gymsLoading, setGymsLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  
  // Stati per il flusso unificato
  const [isFormerMember, setIsFormerMember] = useState<'yes' | 'no' | null>(null)
  const [discipline, setDiscipline] = useState<'Karate' | 'Aikido' | null>(null);
  const [gym, setGym] = useState(''); // Ora conterrà l'ID
  const [hasPracticedBefore, setHasPracticedBefore] = useState<'yes' | 'no' | null>(null);
  const [lastGrade, setLastGrade] = useState('');
  const [qualification, setQualification] = useState('');
  const [firstYear, setFirstYear] = useState('');
  

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [grades, setGrades] = useState<string[]>([]);

  useEffect(() => {
    const fetchGyms = async () => {
        try {
            const gymsCollection = collection(db, 'gyms');
            const gymsSnapshot = await getDocs(gymsCollection);
            const gymsList = gymsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Gym[];
            setGyms(gymsList);
        } catch (error) {
            console.error("Error fetching gyms:", error);
            toast({
                variant: "destructive",
                title: "Errore di caricamento",
                description: "Impossibile caricare le palestre dal database."
            });
        } finally {
            setGymsLoading(false);
        }
    };
    fetchGyms();
  }, [toast]);
  
  useEffect(() => {
        const fetchGrades = async () => {
            if (!discipline) {
                setGrades([]);
                return;
            }
            setGradesLoading(true);
            setLastGrade(''); // Resetta il grado selezionato quando cambia la disciplina

            try {
                const docRef = doc(db, "config", discipline.toLowerCase());
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().grades) {
                    setGrades(docSnap.data().grades);
                } else {
                    toast({
                        variant: "destructive",
                        title: `Gradi per ${discipline} non trovati`,
                        description: "Assicurati di aver configurato i gradi in Firestore.",
                    });
                    setGrades([]);
                }
            } catch (error) {
                 console.error("Error fetching grades:", error);
                 toast({
                    variant: "destructive",
                    title: "Errore di caricamento",
                    description: "Impossibile caricare i gradi dal database."
                });
            } finally {
                setGradesLoading(false);
            }
        };

        fetchGrades();
    }, [discipline, toast]);


  const currentYear = new Date().getFullYear();
  const startYear = 2016;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());
  
  const qualifications = [
      "Nessuna",
      "Allenatore",
      "Istruttore",
      "Maestro"
  ];
  
  const handleIsFormerMemberChange = (value: 'yes' | 'no') => {
      setIsFormerMember(value);
      // Resetta tutti gli altri stati per evitare dati sporchi tra le selezioni
      setDiscipline(null);
      setGym('');
      setHasPracticedBefore(null);
      setLastGrade('');
      setQualification('');
      setFirstYear('');
  };
  
  const handleDisciplineChange = (value: 'Karate' | 'Aikido') => {
      setDiscipline(value);
      // Resetta gli stati dipendenti quando cambia la disciplina
      setGym('');
      setHasPracticedBefore(null);
      setLastGrade('');
      // Se aikido, imposta automaticamente l'ID della palestra se ce n'è solo una
      const aikidoGyms = gyms.filter(g => g.disciplines && g.disciplines.includes('Aikido'));
      if (value === 'Aikido' && aikidoGyms.length === 1) {
          setGym(aikidoGyms[0].id);
      }
  }

  const getAvailableGymsForDiscipline = (discipline: 'Karate' | 'Aikido' | null) => {
    if (!discipline) return [];
    return gyms.filter(g => g.disciplines && g.disciplines.includes(discipline));
  };


  const isContinueDisabled = () => {
    if (gymsLoading || !isFormerMember) return true;

    if (isFormerMember === 'yes') {
        return !discipline || !gym || !firstYear || !lastGrade || !qualification || gradesLoading;
    }

    if (isFormerMember === 'no') {
        if (!discipline || !gym) return true;
        if (!hasPracticedBefore) return true;
        if (gradesLoading) return true;
        if (hasPracticedBefore === 'yes') {
             return !lastGrade;
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
            dataToUpdate.qualification = qualification;
            destination = "/dashboard/associates";
        } else { // isFormerMember === 'no'
            dataToUpdate.firstYear = new Date().getFullYear().toString();
            destination = "/dashboard/class-selection";

            dataToUpdate.hasPracticedBefore = hasPracticedBefore;
            if (hasPracticedBefore === 'yes') {
                 dataToUpdate.pastExperience = { discipline, grade: lastGrade };
                 dataToUpdate.lastGrade = lastGrade;
            } else { // hasPracticedBefore === 'no'
                let defaultGrade = '';
                const docRef = doc(db, "config", (discipline as string).toLowerCase());
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().grades && docSnap.data().grades.length > 0) {
                    const grade = docSnap.data().grades[0];
                    if (discipline === 'Karate') {
                      defaultGrade = `Cintura ${grade}`;
                    } else {
                      defaultGrade = grade;
                    }
                } else {
                     toast({ title: "Errore", description: "Impossibile trovare il grado di default. Contatta il supporto.", variant: "destructive" });
                     setIsLoading(false);
                     return;
                }
                dataToUpdate.pastExperience = { discipline, grade: defaultGrade };
                dataToUpdate.lastGrade = defaultGrade;
            }
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

  const getGymDisplayString = (gym: Gym) => {
    const parts = [gym.name, gym.address, gym.streetNumber, gym.city];
    return parts.filter(Boolean).join(", ");
  };

  const renderGymSelect = (currentDiscipline: 'Karate' | 'Aikido' | null) => {
    if (!currentDiscipline) return null;

    const availableGyms = getAvailableGymsForDiscipline(currentDiscipline);

    if (availableGyms.length === 0 && !gymsLoading) {
      return <Input value="Nessuna palestra disponibile per questa disciplina" disabled />;
    }
    
    if (availableGyms.length === 1 && currentDiscipline === 'Aikido') {
        return <Input value={getGymDisplayString(availableGyms[0])} disabled />
    }

    return (
        <Select value={gym} onValueChange={setGym}>
            <SelectTrigger>
                <SelectValue placeholder="Seleziona la palestra" />
            </SelectTrigger>
            <SelectContent>
                {availableGyms.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                        {getGymDisplayString(g)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
  };
  
  const renderGradeSelect = () => {
     if (gradesLoading) {
            return (
                <Button variant="outline" disabled className="w-full justify-start">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Caricamento gradi...
                </Button>
            );
        }

        if (grades.length === 0 && !discipline) {
            return null;
        }

        if (grades.length === 0) {
            return <Input disabled value="Nessun grado disponibile" />;
        }
        

        return (
            <Select value={lastGrade} onValueChange={setLastGrade}>
                <SelectTrigger>
                    <SelectValue placeholder="Seleziona il grado" />
                </SelectTrigger>
                <SelectContent>
                    {grades.map(grade => {
                        const displayGrade = discipline === 'Karate' ? `Cintura ${grade}` : grade;
                        return (
                            <SelectItem key={grade} value={displayGrade}>
                                {displayGrade}
                            </SelectItem>
                        )
                    })}
                </SelectContent>
            </Select>
        );
  }


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
             <h4 className="font-semibold text-foreground">1. Sei già stato socio di Libera Energia?</h4>
             <RadioGroup 
                value={isFormerMember || ''} 
                onValueChange={(value) => handleIsFormerMemberChange(value as 'yes' | 'no')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <Label htmlFor="no" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground", isFormerMember === 'no' && 'border-primary')}>
                  <RadioGroupItem value="no" id="no" className="sr-only" />
                  <span className="text-center font-semibold">No, non sono mai stato socio</span>
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
                <h4 className="font-semibold text-foreground">2. Quale disciplina vuoi provare ed in quale Palestra</h4>
                 {gymsLoading ? (
                    <div className="flex justify-center items-center h-10"><Loader2 className="h-6 w-6 animate-spin"/></div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RadioGroup
                            value={discipline || ''}
                            onValueChange={(value) => handleDisciplineChange(value as 'Karate' | 'Aikido')}
                            className="grid grid-cols-2 gap-4 col-span-2"
                        >
                            <Label htmlFor="karate_new" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'Karate' && "border-primary")}>
                                <RadioGroupItem value="Karate" id="karate_new" className="sr-only" />
                                <span>Karate</span>
                            </Label>
                            <Label htmlFor="aikido_new" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'Aikido' && "border-primary")}>
                                <RadioGroupItem value="Aikido" id="aikido_new" className="sr-only" />
                                <span>Aikido</span>
                            </Label>
                        </RadioGroup>
                        <div className="col-span-2">
                           {renderGymSelect(discipline)}
                        </div>
                    </div>
                 )}
              </div>
              
              {discipline && gym && (
                <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                    <h4 className="font-semibold text-foreground">3. Hai già praticato {discipline} in passato?</h4>
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

              {hasPracticedBefore === 'yes' && discipline && (
                  <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                      <h4 className="font-semibold text-foreground">Con quale grado?</h4>
                      <div className="space-y-2">
                           {renderGradeSelect()}
                      </div>
                  </div>
              )}
            </div>
          )}

          {isFormerMember === 'yes' && (
            <div className="space-y-6 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">2. Conferma i tuoi dati</h4>
                     {gymsLoading ? (
                        <div className="flex justify-center items-center h-10"><Loader2 className="h-6 w-6 animate-spin"/></div>
                     ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                 <Label>Disciplina</Label>
                                 <RadioGroup
                                    value={discipline || ''}
                                    onValueChange={(value) => handleDisciplineChange(value as 'Karate' | 'Aikido')}
                                    className="grid grid-cols-2 gap-4"
                                >
                                   <Label htmlFor="karate_former" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'Karate' && "border-primary")}>
                                        <RadioGroupItem value="Karate" id="karate_former" className="sr-only" />
                                        <span>Karate</span>
                                    </Label>
                                    <Label htmlFor="aikido_former" className={cn("flex items-center justify-center rounded-md border-2 bg-background p-4 cursor-pointer", discipline === 'Aikido' && "border-primary")}>
                                        <RadioGroupItem value="Aikido" id="aikido_former" className="sr-only" />
                                        <span>Aikido</span>
                                    </Label>
                                </RadioGroup>
                            </div>
                             <div className="space-y-2">
                                <Label>Palestra</Label>
                                {renderGymSelect(discipline)}
                             </div>
                        </div>
                     )}
                </div>
                
                {discipline && gym && (
                    <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                <Label htmlFor="qualification">Qualifica</Label>
                                <Select value={qualification} onValueChange={setQualification}>
                                    <SelectTrigger id="qualification">
                                        <SelectValue placeholder="Seleziona la qualifica" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qualifications.map(q => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="pt-4">
                             <Label>Con quale grado?</Label>
                             {renderGradeSelect()}
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

    