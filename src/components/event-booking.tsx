
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { FileText, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore"
import { useToast } from "./ui/use-toast"

const stages = [
  {
    id: "kata-heian-2025-05-11",
    name: "Kata Heian",
    date: "sabato-11-maggio-2025",
    time: "09:00 - 12:00",
    participants: "Tutti",
    contribution: "20",
    flyerUrl: "#"
  },
  {
    id: "kumite-agonistico-2025-05-12",
    name: "Kumite Agonistico",
    date: "domenica-12-maggio-2025",
    time: "15:00 - 18:00",
    participants: "Cinture Nere",
    contribution: "25",
    flyerUrl: "#"
  },
  {
    id: "corso-insegnanti-2025-05-18",
    name: "Corso Insegnanti",
    date: "sabato-18-maggio-2025",
    time: "10:00 - 13:00",
    participants: "Insegnanti",
    contribution: "30",
    flyerUrl: "#"
  }
]

type StageCounts = { [key: string]: number };
type RegisteredStages = { [key: string]: boolean };

export function EventBooking() {
  const { toast } = useToast();
  const [stageCounts, setStageCounts] = useState<StageCounts>({});
  const [registeredStages, setRegisteredStages] = useState<RegisteredStages>({});
  const [loadingStages, setLoadingStages] = useState(true);
  const [submittingStage, setSubmittingStage] = useState<string | null>(null);

  const fetchStageData = async () => {
      try {
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
      } finally {
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

  return (
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => {
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
                <TableCell className="font-bold text-center">{loadingStages ? <Loader2 className="h-4 w-4 animate-spin" /> : count}</TableCell>
                <TableCell>
                   <a href={stage.flyerUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <FileText className="h-5 w-5" />
                      <span className="sr-only">Visualizza volantino</span>
                   </a>
                </TableCell>
                <TableCell>
                  <Button 
                    variant={isRegistered ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => handleSubscription(stage.id, stage.name, stage.date)}
                    disabled={isRegistered || isSubmitting || loadingStages}
                  >
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isRegistered ? 'Iscritto' : 'Iscriviti'}
                  </Button>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
