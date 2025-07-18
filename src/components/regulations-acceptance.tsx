
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
import { Eye, Download } from "lucide-react"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

const documents = [
  { name: "STATUTO", href: "#" },
  { name: "PRIVACY", href: "#" },
  { name: "REGOLAMENTO", href: "#" },
]

export function RegulationsAcceptance({ setRegulationsAccepted }: { setRegulationsAccepted?: (value: boolean) => void }) {
    const { toast } = useToast()
    const router = useRouter();
    const [accepted, setAccepted] = useState(false);

    const handleAccept = () => {
        if (accepted) {
            const acceptanceDate = format(new Date(), "dd/MM/yyyy");
            
            if (typeof window !== 'undefined') {
                localStorage.setItem('regulationsAccepted', 'true');
                localStorage.setItem('regulationsAcceptanceDate', acceptanceDate);
            }
            
            if (setRegulationsAccepted) {
                setRegulationsAccepted(true);
            }

            toast({
                title: "Regolamenti Accettati",
                description: `Grazie per aver accettato i nostri termini e regolamenti in data ${acceptanceDate}.`,
            });
            
            // Force a reload to ensure layout state is updated
            window.location.href = '/dashboard';

        } else {
             toast({
                title: "Attenzione",
                description: "Devi dichiarare di aver letto i documenti.",
                variant: "destructive"
            });
        }
    }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Accettazione Regolamenti e Privacy</CardTitle>
        <CardDescription>
          Prima di associarti ti chiediamo di prendere visione dei seguenti documenti.
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
            <Checkbox id="terms" onCheckedChange={(checked) => setAccepted(!!checked)} />
            <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Dichiaro di aver letto lo Statuto, Il documento sulla Privacy ed il Regolamento.
            </Label>
        </div>
        <div className="w-full flex justify-end">
            <Button onClick={handleAccept}>Accetto i Termini</Button>
        </div>
      </CardFooter>
    </Card>
  )
}
