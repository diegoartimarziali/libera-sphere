// STOP. CERCA "OK" NEL MESSAGGIO DEL MAESTRO. SE NON C'È, NON MODIFICARE NULLA E CHIEDI IL PERMESSO.
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
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gymsLoading, setGymsLoading] = useState(true);
  
  // Stati per il flusso unificato
  const [isFormerMember, setIsFormerMember] = useState<'yes' | 'no' | null>(null)
  const [discipline, setDiscipline] = useState<'Karate' | 'Aikido' | null>(null);
  const [gym, setGym] = useState('');
  const [hasPracticedBefore, setHasPracticedBefore] = useState<'yes' | 'no' | null>(null);
  const [lastGrade, setLastGrade] = useState('');
  const [qualification, setQualification] = useState('');
  const [firstYear, setFirstYear] = useState('');
  
  const [allGyms, setAllGyms] = useState<Gym[]>([]);
  const [filteredGyms, setFilteredGyms] = useState<Gym[]>([]);
  const [grades, setGrades] = useState<string[]>([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setGymsLoading(true);
            try {
                const gymsSnapshot = await getDocs(collection(db, "gyms"));
                const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gym));
                setAllGyms(gymsList);
            } catch (error) {
                console.error("Error fetching gyms:", error);
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare le palestre." });
            } finally {
                setGymsLoading(false);
            }
        };
        fetchInitialData();
    }, [toast]);

    useEffect(() => {
        if (discipline) {
            const gymsForDiscipline = allGyms.filter(g => Array.isArray(g.disciplines) && g.disciplines.includes(discipline));
            setFilteredGyms(gymsForDiscipline);
            setGym(''); // Reset gym selection when discipline changes
        } else {
            setFilteredGyms([]);
        }
    }, [discipline, allGyms]);

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
      setHasPracticedBefore(null);
      setLastGrade('');
  }

  const isContinueDisabled = () => {
    if (!isFormerMember) return true;

    if (isFormerMember === 'yes') {
        return !discipline || !gym || !firstYear || !lastGrade || !qualification || gradesLoading || gymsLoading;
    }

    if (isFormerMember === 'no') {
        if (!discipline || !gym || gymsLoading) return true;
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

    try {
        const userDocRef = doc(db, "users", user.uid);
        const dataToUpdate: any = {
            isFormerMember,
            discipline,
            gym,
        };
        let destination = "/dashboard/class-selection";

        if (isFormerMember === 'yes') {
            dataToUpdate.firstYear = firstYear;
            dataToUpdate.lastGrade = lastGrade;
            dataToUpdate.qualification = qualification;
            destination = "/dashboard/associates";
        } else { // isFormerMember === 'no'
            dataToUpdate.firstYear = new Date().getFullYear().toString();
            dataToUpdate.hasPracticedBefore = hasPracticedBefore;
            
            if (hasPracticedBefore === 'yes') {
                dataToUpdate.lastGrade = lastGrade;
            } else {
                 const docRef = doc(db, "config", (discipline as string).toLowerCase());
                 const docSnap = await getDoc(docRef);
                 if (docSnap.exists() && docSnap.data().grades && docSnap.data().grades.length > 0) {
                     const defaultGradeValue = docSnap.data().grades[0];
                     dataToUpdate.lastGrade = discipline === 'Karate' ? `Cintura ${defaultGradeValue}` : defaultGradeValue;
                 } else {
                     throw new Error(`Grado di default non trovato per ${discipline}`);
                 }
            }
        }
        
        await updateDoc(userDocRef, dataToUpdate);
        router.push(destination);

    } catch (error) {
        console.error("Error updating user choice:", error);
        toast({
            variant: "destructive",
            title: "Errore",
            description: `Non è stato possibile salvare la tua scelta. Dettagli: ${error instanceof Error ? error.message : 'Errore sconosciuto'}.`,
        });
        setIsLoading(false);
    }
  };

  const renderGradeSelect = (label: string) => {
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
            <>
                <Label className="font-bold">{label}</Label>
                <Select value={lastGrade} onValueChange={setLastGrade}>
                    <SelectTrigger style={{ backgroundColor: '#fff', borderColor: 'hsl(22.5, 55%, 11%)', borderWidth: 2, color: '#000' }}>
                        <SelectValue placeholder="Seleziona il grado" style={{ color: 'hsl(0, 1%, 77%)' }} />
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
            </>
        );
  }


  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Benvenuto nel Dojo di Libera Energia!</CardTitle>
          <CardDescription className="text-2xl font-bold">
            いらっしゃいませ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
             <h4 className="medical-upload-text text-center font-bold">Sei già stato socio di Libera Energia?</h4>
             <RadioGroup 
                value={isFormerMember || ''} 
                onValueChange={(value) => handleIsFormerMemberChange(value as 'yes' | 'no')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                                <Label
                                    htmlFor="no"
                                    className={cn(
                                        "flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer",
                                        isFormerMember === 'no' && 'border-primary'
                                    )}
                                    style={{
                                        backgroundColor: '#38bdf8', // azzurro
                                        borderColor: 'hsl(22.5, 55%, 11%)', // marrone scuro
                                        color: 'hsl(22.5, 55%, 11%)',
                                        minHeight: '48px' // stessa altezza del tasto Prosegui
                                    }}
                                >
                                    <RadioGroupItem value="no" id="no" className="sr-only" />
                                    <span className="text-center font-bold" style={{ color: 'hsl(22.5, 55%, 11%)' }}>No, non sono mai stato socio</span>
                                </Label>
                                <Label
                                    htmlFor="yes"
                                    className={cn(
                                        "flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer",
                                        isFormerMember === 'yes' && 'border-primary'
                                    )}
                                    style={{
                                        backgroundColor: '#38bdf8', // azzurro
                                        borderColor: 'hsl(22.5, 55%, 11%)', // marrone scuro
                                        color: 'hsl(22.5, 55%, 11%)',
                                        minHeight: '48px' // stessa altezza del tasto Prosegui
                                    }}
                                >
                                    <RadioGroupItem value="yes" id="yes" className="sr-only" />
                                    <span className="text-center font-bold" style={{ color: 'hsl(22.5, 55%, 11%)' }}>Sì, sono già stato socio</span>
                                </Label>
              </RadioGroup>
          </div>
         
          {isFormerMember === 'no' && (
            <div className="space-y-6 rounded-md border-2 bg-muted/50 p-4 animate-in fade-in-50" style={{ borderColor: 'hsl(22.5, 55%, 11%)' }}>
              <div className="space-y-2">
                <h4 className="medical-upload-text text-center font-bold">Quale disciplina vuoi provare?</h4>
                                <div className="flex gap-8 justify-center items-center">
                                    <RadioGroup
                                        value={discipline || ''}
                                        onValueChange={(value) => handleDisciplineChange(value as 'Karate' | 'Aikido')}
                                        className="flex gap-8"
                                    >
                                        <Label htmlFor="karate_new" className="flex items-center gap-2 cursor-pointer">
                                              <RadioGroupItem value="Karate" id="karate_new" className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'hsl(var(--medical-upload-text))' }} />
                                            <span className="font-bold">Karate</span>
                                        </Label>
                                        <Label htmlFor="aikido_new" className="flex items-center gap-2 cursor-pointer">
                                              <RadioGroupItem value="Aikido" id="aikido_new" className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'hsl(var(--medical-upload-text))' }} />
                                            <span className="font-bold">Aikido</span>
                                        </Label>
                                    </RadioGroup>
                                </div>
              </div>

               {discipline && (
                <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                     <h4 className="medical-upload-text text-center font-bold">In quale palestra ti vuoi allenare?</h4>
                      {gymsLoading ? (
                        <div className="flex justify-center items-center h-10"><Loader2 className="h-6 w-6 animate-spin"/></div>
                    ) : (
                                                <Select value={gym} onValueChange={setGym}>
                                                    <SelectTrigger
                                                        style={{ backgroundColor: '#fff', borderColor: 'hsl(var(--medical-upload-text))', color: '#111', borderWidth: 2 }}
                                                        className="w-full rounded-md px-4 py-2 focus:outline-none"
                                                    >
                                                        <SelectValue placeholder="Seleziona una palestra" className="text-gray-400" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {filteredGyms.map((g) => (
                                                            <SelectItem key={g.id} value={g.id} className="text-black">
                                                                {g.id} - {g.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                    )}
                </div>
              )}
              
              {gym && (
                <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                    <h4 className="medical-upload-text text-center font-bold">Hai già praticato {discipline} in passato?</h4>
                                        <RadioGroup
                                            value={hasPracticedBefore || ''}
                                            onValueChange={(value) => setHasPracticedBefore(value as 'yes' | 'no')}
                                            className="flex gap-8 justify-center items-center"
                                        >
                                            <Label htmlFor="practiced_no" className="flex items-center gap-2 cursor-pointer">
                                                <RadioGroupItem value="no" id="practiced_no" className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'hsl(var(--medical-upload-text))' }} />
                                                <span className="font-bold">No, mai</span>
                                            </Label>
                                            <Label htmlFor="practiced_yes" className="flex items-center gap-2 cursor-pointer">
                                                <RadioGroupItem value="yes" id="practiced_yes" className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'hsl(var(--medical-upload-text))' }} />
                                                <span className="font-bold">Sì, ho già praticato</span>
                                            </Label>
                                        </RadioGroup>
                </div>
              )}

              {hasPracticedBefore === 'yes' && discipline && (
                  <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                      <div className="space-y-2">
                           {renderGradeSelect("Con quale grado?")}
                      </div>
                  </div>
              )}
            </div>
          )}

          {isFormerMember === 'yes' && (
            <div className="space-y-6 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                <div className="space-y-2">
                    <h4 className="medical-upload-text text-center font-bold">Conferma i tuoi dati</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="font-bold">Disciplina</Label>
                                                                                     <Select value={discipline || ''} onValueChange={value => handleDisciplineChange(value as 'Karate' | 'Aikido')}>
                                                                                         <SelectTrigger style={{ backgroundColor: '#fff', borderColor: 'hsl(22.5, 55%, 11%)', borderWidth: 2, color: '#000' }}>
                                                                                             <SelectValue placeholder="Seleziona una disciplina" style={{ color: 'hsl(0, 1%, 77%)' }} />
                                                                                         </SelectTrigger>
                                                                                         <SelectContent>
                                                                                             <SelectItem value="Karate">Karate</SelectItem>
                                                                                             <SelectItem value="Aikido">Aikido</SelectItem>
                                                                                         </SelectContent>
                                                                                     </Select>
                        </div>
                        <div className="space-y-2">
                             <Label className="font-bold">Palestra</Label>
                              {gymsLoading ? (
                                <div className="flex justify-center items-center h-10"><Loader2 className="h-6 w-6 animate-spin"/></div>
                            ) : (
                                <Select value={gym} onValueChange={setGym} disabled={!discipline}>
                                    <SelectTrigger style={{ backgroundColor: '#fff', borderColor: 'hsl(22.5, 55%, 11%)', borderWidth: 2, color: '#000' }}>
                                        <SelectValue placeholder="Seleziona una palestra" style={{ color: 'hsl(0, 1%, 77%)' }} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredGyms.map((g) => (
                                            <SelectItem key={g.id} value={g.id}>
                                                {g.id} - {g.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </div>
                
                {discipline && gym && (
                    <div className="space-y-4 pt-4 border-t mt-4 animate-in fade-in-50">
                        <div className="space-y-2">
                             {renderGradeSelect("Il tuo grado attuale")}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                             <div>
                                <Label htmlFor="firstYear" className="font-bold">Primo Anno di Associazione</Label>
                                <Select value={firstYear} onValueChange={setFirstYear}>
                                    <SelectTrigger id="firstYear" style={{ backgroundColor: '#fff', borderColor: 'hsl(22.5, 55%, 11%)', borderWidth: 2, color: '#000' }}>
                                        <SelectValue placeholder="Seleziona l'anno" style={{ color: 'hsl(0, 1%, 77%)' }} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(year => (
                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div>
                                <Label htmlFor="qualification" className="font-bold">Qualifica</Label>
                                <Select value={qualification} onValueChange={setQualification}>
                                    <SelectTrigger id="qualification" style={{ backgroundColor: '#fff', borderColor: 'hsl(22.5, 55%, 11%)', borderWidth: 2, color: '#000' }}>
                                        <SelectValue placeholder="Seleziona la qualifica" style={{ color: 'hsl(0, 1%, 77%)' }} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qualifications.map(q => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          )}
        </CardContent>
        <CardFooter>
                    <Button 
                        onClick={handleContinue} 
                        disabled={isContinueDisabled() || isLoading} 
                        className="w-full font-bold" 
                        style={{ backgroundColor: '#16a34a', color: '#fff', borderColor: 'hsl(var(--medical-upload-text))', borderWidth: 2 }}
                    >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prosegui
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
