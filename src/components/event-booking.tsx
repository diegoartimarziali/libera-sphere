

"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "./ui/button"
import { FileText, Loader2, MoreHorizontal, PlusCircle, Trash, Upload } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, Timestamp, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { useToast } from "./ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Progress } from "./ui/progress"
import { format, isPast, parseISO, isValid } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "./ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"


interface Stage {
  id: string;
  name: string;
  date: string; // ISO date string (e.g., "2024-05-11T00:00:00.000Z")
  time: string;
  participants: string; // Now represents the type: 'Tutti', 'Cinture nere', 'Insegnanti'
  contribution: string;
  flyerUrl: string;
  isDeleted?: boolean;
}

type StageCounts = { [key: string]: number };
type RegisteredStages = { [key: string]: boolean };

export function EventBooking() {
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageCounts, setStageCounts] = useState<StageCounts>({});
  const [registeredStages, setRegisteredStages] = useState<RegisteredStages>({});
  const [loadingStages, setLoadingStages] = useState(true);
  const [submittingStage, setSubmittingStage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStage, setCurrentStage] = useState<Partial<Stage>>({});
  const [stageDate, setStageDate] = useState<Date | undefined>();

  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAdminFeatures = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  useEffect(() => {
    // Listener for stages to display them
    const stagesQuery = query(collection(db, "events"), where("isDeleted", "!=", true));
    const unsubscribeStages = onSnapshot(stagesQuery, (snapshot) => {
        const stagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stage));
        stagesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setStages(stagesData);
        setLoadingStages(false);
    }, (error) => {
        console.error("Error fetching stages: ", error);
        toast({ title: "Errore", description: "Impossibile caricare i dati degli stage.", variant: "destructive" });
        setLoadingStages(false);
    });

    // Listener for all registrations to update participant counts in real-time
    const registrationsQuery = query(collection(db, "eventRegistrations"));
    const unsubscribeRegistrations = onSnapshot(registrationsQuery, (snapshot) => {
        const counts: StageCounts = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.stageId) {
                counts[data.stageId] = (counts[data.stageId] || 0) + 1;
            }
        });
        setStageCounts(counts);
    });

    // Listener for user-specific registrations to manage button state
    const userEmail = localStorage.getItem('registrationEmail');
    let unsubscribeUserRegistrations = () => {};
    if (userEmail) {
        const userRegistrationsQuery = query(collection(db, "eventRegistrations"), where("userEmail", "==", userEmail));
        unsubscribeUserRegistrations = onSnapshot(userRegistrationsQuery, (userRegistrationsSnapshot) => {
          const userRegistered: RegisteredStages = {};
          userRegistrationsSnapshot.forEach(doc => {
              userRegistered[doc.data().stageId] = true;
          });
          setRegisteredStages(userRegistered);
        });
    }

    // Cleanup function to detach listeners on component unmount
    return () => {
        unsubscribeStages();
        unsubscribeRegistrations();
        unsubscribeUserRegistrations();
    };
  }, [toast]);


  const handleSubscription = async (stageId: string, stageName: string, stageDate: string, stageType: string) => {
      setSubmittingStage(stageId);
      const userEmail = localStorage.getItem('registrationEmail');
      const userName = localStorage.getItem('userName');
      
      if (!userEmail || !userName) {
          toast({
              title: "Utente non riconosciuto",
              description: "Effettua nuovamente il login per iscriverti.",
              variant: "destructive"
          });
          setSubmittingStage(null);
          return;
      }

      try {
          await addDoc(collection(db, "eventRegistrations"), {
              userEmail,
              userName,
              stageId,
              stageName,
              stageDate,
              stageType: stageType, // Save the stage type
              registrationDate: Timestamp.now(),
          });
          
          // This part is now handled in the member summary card directly from Firestore data
          // to ensure accuracy and real-time updates.

          toast({
              title: "Iscrizione Riuscita!",
              description: `Ti sei iscritto con successo allo stage "${stageName}".`,
          });

      } catch (error) {
          console.error("Error subscribing to stage: ", error);
          toast({
              title: "Errore di Iscrizione",
              description: "Non è stato possibile completare l'iscrizione. Riprova.",
              variant: "destructive",
          });
      } finally {
          setSubmittingStage(null);
      }
  };

  const handleAddNewStage = () => {
    setIsEditing(false);
    setCurrentStage({});
    setStageDate(undefined);
    setFlyerFile(null);
    setUploadProgress(0);
    setOpenDialog(true);
  };

  const handleEditStage = (stage: Stage) => {
    setIsEditing(true);
    setCurrentStage(stage);
    try {
        const parsedDate = parseISO(stage.date);
        if(isValid(parsedDate)) {
            setStageDate(parsedDate);
        } else {
            setStageDate(undefined);
        }
    } catch {
        setStageDate(undefined);
    }
    setFlyerFile(null);
    setUploadProgress(0);
    setOpenDialog(true);
  };

  const handleDeleteStage = async (stageId: string) => {
    if(confirm("Sei sicuro di voler eliminare questo stage? L'azione è irreversibile.")) {
        try {
            const stageRef = doc(db, "events", stageId);
            await updateDoc(stageRef, { isDeleted: true });
            toast({
                title: "Stage Eliminato",
                description: "Lo stage è stato segnato come eliminato."
            });
        } catch (error) {
            console.error("Error deleting stage:", error);
            toast({ title: "Errore", description: "Impossibile eliminare lo stage.", variant: "destructive" });
        }
    }
  };

  const uploadFlyer = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        setIsUploading(true);
        const storageRef = ref(storage, `flyers/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                setIsUploading(false);
                reject(error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref)
                  .then(downloadURL => {
                    setIsUploading(false);
                    resolve(downloadURL);
                  })
                  .catch(error => {
                    setIsUploading(false);
                    reject(error);
                  });
            }
        );
    });
}

const handleSaveStage = async () => {
    if (!currentStage.name || !stageDate || !currentStage.participants) {
        toast({ title: "Dati mancanti", description: "Nome, data e tipo di partecipanti sono obbligatori.", variant: "destructive"});
        return;
    }
    
    setSubmittingStage('save');
    
    // Always use the date from the state picker (stageDate)
    const stageData: Omit<Stage, 'id' | 'isDeleted'> & { id?: string; createdAt?: Timestamp; isDeleted?: boolean } = { 
        name: currentStage.name || '',
        date: stageDate.toISOString(), // Save date in standard ISO format
        time: currentStage.time || '',
        participants: currentStage.participants || '',
        contribution: currentStage.contribution || '',
        flyerUrl: currentStage.flyerUrl || ''
    };


    try {
        if (flyerFile) {
            const downloadURL = await uploadFlyer(flyerFile);
            stageData.flyerUrl = downloadURL;
        }

        if (isEditing && currentStage.id) {
            const stageRef = doc(db, "events", currentStage.id);
            await updateDoc(stageRef, stageData);
            toast({ title: "Stage Aggiornato", description: "I dati dello stage sono stati aggiornati."});
        } else {
            await addDoc(collection(db, "events"), { ...stageData, createdAt: Timestamp.now(), isDeleted: false });
            toast({ title: "Stage Creato", description: "Il nuovo stage è stato aggiunto."});
        }
        setOpenDialog(false);
    } catch (error: any) {
        console.error("Error saving stage:", error);
        toast({ 
            title: "Errore nel salvataggio", 
            description: `Impossibile salvare i dati. Errore: ${error.message || 'Sconosciuto'}`, 
            variant: "destructive" 
        });
    } finally {
        setSubmittingStage(null);
        setUploadProgress(0);
        setFlyerFile(null);
    }
  };


  const handleDialogChange = (open: boolean) => {
    if (!open) {
        setCurrentStage({});
        setStageDate(undefined);
        setFlyerFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setOpenDialog(open);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setFlyerFile(e.target.files[0]);
    }
  }

  const formatDate = (isoDate: string) => {
      try {
        const date = parseISO(isoDate);
        if (!isValid(date)) {
             console.error("Invalid date format:", isoDate);
            return "Data non valida";
        }
        return format(date, "EEEE dd MMMM yyyy", { locale: it });
      } catch (error) {
        console.error("Error in formatDate for:", isoDate, error);
        return "Data non valida";
      }
  };

  const getBaseCount = (type: string) => {
    switch(type) {
      case 'Tutti': return 4;
      case 'Cinture nere': return 3;
      case 'Insegnanti': return 2;
      default: return 0;
    }
  }

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Stage ed Eventi</CardTitle>
        <CardDescription>
          Qui trovi l'elenco dei prossimi stage a cui puoi iscriverti.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome Stage</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Orario</TableHead>
              <TableHead>Partecipanti</TableHead>
              <TableHead>Contributo</TableHead>
              <TableHead>Iscritti</TableHead>
              <TableHead>Volantino</TableHead>
              <TableHead>Azione</TableHead>
               {showAdminFeatures && <TableHead className="text-right">Admin</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingStages ? (
                <TableRow>
                    <TableCell colSpan={showAdminFeatures ? 9 : 8} className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                </TableRow>
            ) : stages.map((stage) => {
              const isRegistered = registeredStages[stage.id];
              const isSubmitting = submittingStage === stage.id;
              const registeredCount = stageCounts[stage.id] || 0;
              const baseCount = getBaseCount(stage.participants);
              const totalCount = registeredCount + baseCount;
              
              let pastEvent = false;
              try {
                const parsedDate = parseISO(stage.date);
                if (isValid(parsedDate)) {
                  pastEvent = isPast(parsedDate);
                }
              } catch (e) {
                console.error("Could not parse date for past event check", stage.date);
              }

              return (
              <TableRow key={stage.id} className={cn(pastEvent && "text-muted-foreground opacity-60")}>
                <TableCell className="font-medium">{stage.name}</TableCell>
                <TableCell className="capitalize">{formatDate(stage.date)}</TableCell>
                <TableCell>{stage.time}</TableCell>
                <TableCell>{stage.participants}</TableCell>
                <TableCell>€ {stage.contribution}</TableCell>
                <TableCell className="font-bold text-center">{totalCount}</TableCell>
                <TableCell>
                   <a href={stage.flyerUrl || '#'} target="_blank" rel="noopener noreferrer" className={cn("transition-colors", stage.flyerUrl ? 'text-primary' : 'text-muted-foreground/50 cursor-not-allowed', pastEvent ? 'text-muted-foreground/80 hover:text-muted-foreground' : 'hover:text-primary')}>
                      <FileText className="h-5 w-5" />
                      <span className="sr-only">Visualizza volantino</span>
                   </a>
                </TableCell>
                <TableCell>
                  <Button 
                    variant={isRegistered ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => handleSubscription(stage.id, stage.name, stage.date, stage.participants)}
                    disabled={isRegistered || isSubmitting || pastEvent}
                  >
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isRegistered ? 'Iscritto' : (pastEvent ? 'Concluso' : 'Iscriviti')}
                  </Button>
                </TableCell>
                {showAdminFeatures && (
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" disabled={pastEvent}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Azioni Admin</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditStage(stage)}>Modifica</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStage(stage.id)}>
                                    <Trash className="mr-2 h-4 w-4" /> Elimina
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                )}
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent>
       {showAdminFeatures && (
            <CardFooter className="flex justify-end">
                <Button onClick={handleAddNewStage}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Stage
                </Button>
            </CardFooter>
        )}
    </Card>

    <Dialog open={openDialog} onOpenChange={handleDialogChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Modifica Stage' : 'Aggiungi Nuovo Stage'}</DialogTitle>
                 <DialogDescription>
                    Compila i campi per creare o aggiornare uno stage.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input id="name" value={currentStage.name || ''} onChange={(e) => setCurrentStage({...currentStage, name: e.target.value})} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Data</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "col-span-3 justify-start text-left font-normal",
                                !stageDate && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {stageDate ? format(stageDate, 'PPP', { locale: it }) : <span>Scegli una data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={stageDate}
                            onSelect={setStageDate}
                            initialFocus
                            locale={it}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="time" className="text-right">Orario</Label>
                    <Input id="time" value={currentStage.time || ''} onChange={(e) => setCurrentStage({...currentStage, time: e.target.value})} className="col-span-3" placeholder="Es. 09:00 - 12:00" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="participants" className="text-right">Partecipanti</Label>
                    <Select
                        value={currentStage.participants}
                        onValueChange={(value) => setCurrentStage({ ...currentStage, participants: value })}
                    >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tutti">Tutti</SelectItem>
                            <SelectItem value="Cinture nere">Cinture nere</SelectItem>
                            <SelectItem value="Insegnanti">Insegnanti</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contribution" className="text-right">Contributo</Label>
                    <Input id="contribution" value={currentStage.contribution || ''} onChange={(e) => setCurrentStage({...currentStage, contribution: e.target.value})} className="col-span-3" placeholder="Es. 25" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="flyerUrl" className="text-right">Volantino</Label>
                    <div className="col-span-3 space-y-2">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2 h-4 w-4" /> Carica File
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="application/pdf,image/*" />
                        {flyerFile && <p className="text-sm text-muted-foreground">{flyerFile.name}</p>}
                        {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}
                         {!flyerFile && currentStage.flyerUrl && (
                             <a href={currentStage.flyerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block">
                                Visualizza volantino attuale
                             </a>
                         )}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogChange(false)}>Annulla</Button>
                <Button onClick={handleSaveStage} disabled={isUploading || submittingStage === 'save'}>
                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Caricamento...</> : (submittingStage === 'save' ? 'Salvataggio...' : 'Salva')}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}

