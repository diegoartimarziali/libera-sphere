
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
import { FileText, Loader2, MoreHorizontal, PlusCircle, Trash } from "lucide-react"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, Timestamp, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"


interface Stage {
  id: string;
  name: string;
  date: string;
  time: string;
  participants: string;
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

  const showAdminFeatures = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  const fetchStageData = async () => {
    try {
      const stagesQuery = query(collection(db, "events"), where("isDeleted", "!=", true));
      onSnapshot(stagesQuery, (snapshot) => {
          const stagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stage));
          setStages(stagesData);
          setLoadingStages(false);
      });

      const registrationsSnapshot = await getDocs(collection(db, "eventRegistrations"));
      const counts: StageCounts = {};
      
      registrationsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.stageId) {
              counts[data.stageId] = (counts[data.stageId] || 0) + 1;
          }
      });
      setStageCounts(counts);

      const userEmail = localStorage.getItem('registrationEmail');
      if (userEmail) {
          const q = query(collection(db, "eventRegistrations"), where("userEmail", "==", userEmail));
          const userRegistrationsSnapshot = await getDocs(q);
          const userRegistered: RegisteredStages = {};
          userRegistrationsSnapshot.forEach(doc => {
              userRegistered[doc.data().stageId] = true;
          });
          setRegisteredStages(userRegistered);
      }

    } catch (error) {
        console.error("Error fetching stage data: ", error);
        toast({
            title: "Errore",
            description: "Impossibile caricare i dati degli stage.",
            variant: "destructive",
        });
        setLoadingStages(false);
    }
  };

  useEffect(() => {
    fetchStageData();
  }, []);

  const handleSubscription = async (stageId: string, stageName: string, stageDate: string) => {
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
              registrationDate: Timestamp.now(),
          });
          
          const currentParticipation = parseInt(localStorage.getItem('stageParticipationCount') || '0');
          localStorage.setItem('stageParticipationCount', String(currentParticipation + 1));

          toast({
              title: "Iscrizione Riuscita!",
              description: `Ti sei iscritto con successo allo stage "${stageName}".`,
          });

          // Refresh data after subscription
          await fetchStageData();

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
    setOpenDialog(true);
  };

  const handleEditStage = (stage: Stage) => {
    setIsEditing(true);
    setCurrentStage(stage);
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

  const handleSaveStage = async () => {
    if (!currentStage.name) {
        toast({ title: "Dati mancanti", description: "Il nome dello stage è obbligatorio.", variant: "destructive"});
        return;
    }

    try {
        if (isEditing && currentStage.id) {
            const stageRef = doc(db, "events", currentStage.id);
            await updateDoc(stageRef, currentStage);
            toast({ title: "Stage Aggiornato", description: "I dati dello stage sono stati aggiornati."});
        } else {
            await addDoc(collection(db, "events"), { ...currentStage, createdAt: Timestamp.now() });
            toast({ title: "Stage Creato", description: "Il nuovo stage è stato aggiunto."});
        }
        setOpenDialog(false);
    } catch (error) {
        console.error("Error saving stage:", error);
        toast({ title: "Errore", description: "Impossibile salvare i dati dello stage.", variant: "destructive" });
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
        setCurrentStage({});
    }
    setOpenDialog(open);
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
              const count = stageCounts[stage.id] || 0;

              return (
              <TableRow key={stage.id}>
                <TableCell className="font-medium">{stage.name}</TableCell>
                <TableCell>{stage.date}</TableCell>
                <TableCell>{stage.time}</TableCell>
                <TableCell>{stage.participants}</TableCell>
                <TableCell>€ {stage.contribution}</TableCell>
                <TableCell className="font-bold text-center">{count}</TableCell>
                <TableCell>
                   <a href={stage.flyerUrl || '#'} target="_blank" rel="noopener noreferrer" className={`transition-colors ${stage.flyerUrl ? 'text-muted-foreground hover:text-primary' : 'text-muted-foreground/50 cursor-not-allowed'}`}>
                      <FileText className="h-5 w-5" />
                      <span className="sr-only">Visualizza volantino</span>
                   </a>
                </TableCell>
                <TableCell>
                  <Button 
                    variant={isRegistered ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => handleSubscription(stage.id, stage.name, stage.date)}
                    disabled={isRegistered || isSubmitting}
                  >
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isRegistered ? 'Iscritto' : 'Iscriviti'}
                  </Button>
                </TableCell>
                {showAdminFeatures && (
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
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
                    <Input id="date" value={currentStage.date || ''} onChange={(e) => setCurrentStage({...currentStage, date: e.target.value})} className="col-span-3" placeholder="Es. sabato-11-maggio-2025" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="time" className="text-right">Orario</Label>
                    <Input id="time" value={currentStage.time || ''} onChange={(e) => setCurrentStage({...currentStage, time: e.target.value})} className="col-span-3" placeholder="Es. 09:00 - 12:00" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="participants" className="text-right">Partecipanti</Label>
                    <Input id="participants" value={currentStage.participants || ''} onChange={(e) => setCurrentStage({...currentStage, participants: e.target.value})} className="col-span-3" placeholder="Es. Cinture Nere" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contribution" className="text-right">Contributo</Label>
                    <Input id="contribution" value={currentStage.contribution || ''} onChange={(e) => setCurrentStage({...currentStage, contribution: e.target.value})} className="col-span-3" placeholder="Es. 25" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="flyerUrl" className="text-right">URL Volantino</Label>
                    <Input id="flyerUrl" value={currentStage.flyerUrl || ''} onChange={(e) => setCurrentStage({...currentStage, flyerUrl: e.target.value})} className="col-span-3" placeholder="https://..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>Annulla</Button>
                <Button onClick={handleSaveStage}>Salva</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}

    