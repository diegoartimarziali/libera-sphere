
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
import { useToast } from "./ui/use-toast"
import { Eye, Download, Loader2 } from "lucide-react"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"

const documents = [
  { name: "STATUTO", href: "#" },
  { name: "PRIVACY", href: "#" },
  { name: "REGOLAMENTO", href: "#" },
]

export function RegulationsAcceptance({ setRegulationsAccepted, userData }: { setRegulationsAccepted?: (value: boolean) => void, userData?: any }) {
    const { toast } = useToast()
    const router = useRouter();
    const [accepted, setAccepted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAccept = async () => {
        if (!accepted) {
            toast({
                title: "Attenzione",
                description: "Devi dichiarare di aver letto i documenti.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
            console.error("User not authenticated");
            setIsLoading(false);
            return;
        }

        try {
            const acceptanceDate = format(new Date(), "dd/MM/yyyy");
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                regulationsAccepted: true,
                regulationsAcceptanceDate: acceptanceDate
            });

            if (setRegulationsAccepted) {
                setRegulationsAccepted(true);
            }

            toast({
                title: "Regolamenti Accettati",
                description: `Grazie per aver accettato i nostri termini e regolamenti in data ${acceptanceDate}.`,
            });
            
            if (userData?.isFormerMember === 'yes') {
                router.push('/dashboard/associates');
            } else {
                router.push('/dashboard/class-selection');
            }

        } catch (error) {
            console.error("Error updating regulations acceptance:", error);
            toast({
                title: "Errore",
                description: "Impossibile salvare l'accettazione dei regolamenti.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="bg-green-600 text-white p-6 -mt-6 -mx-6 rounded-t-lg mb-6">Regolamenti</CardTitle>
        <CardDescription className="text-foreground">
          Leggi lo Statuto, conoscere lo statuto della propria associazione è fondamentale per un socio perché permette di comprendere i propri diritti e doveri all'interno dell'ente, le regole di funzionamento dell'associazione, le modalità di gestione e gli scopi sociali. Leggi il regolamento interno e attieniti alle regole, leggi il documento sulla Privacy e su come verranno trattati i tuoi dati.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {documents.map((doc) => (
            <div key={doc.name} className="flex items-center justify-between rounded-md border p-3">
                <span className="font-medium text-sm">{doc.name}</span>
                <div className="flex items-center gap-3">
                    <a href={doc.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Eye className="h-5 w-5" />
                        <span className="sr-only">Visualizza {doc.name}</span>
                    </a>
                    <a href={doc.href} download className="text-muted-foreground hover:text-primary transition-colors">
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Scarica {doc.name}</span>
                    </a>
                </div>
            </div>
        ))}
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        <div className="flex items-center space-x-2">
            <Checkbox id="terms" variant="green" onCheckedChange={(checked) => setAccepted(!!checked)} />
            <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Dichiaro di aver letto lo Statuto, Il documento sulla Privacy ed il Regolamento.
            </Label>
        </div>
        <div className="w-full flex justify-end">
            <Button onClick={handleAccept} disabled={!accepted || isLoading} className="bg-green-600 hover:bg-green-700">
                 {isLoading ? <Loader2 className="animate-spin" /> : "Accetto i Termini"}
            </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
