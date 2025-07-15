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

const documents = [
  { name: "STATUTO", href: "#" },
  { name: "PRIVACY", href: "#" },
  { name: "REGOLAMENTO", href: "#" },
]

export function RegulationsAcceptance() {
    const { toast } = useToast()

    const handleAccept = () => {
        toast({
            title: "Regolamenti Accettati",
            description: "Grazie per aver accettato i nostri termini e regolamenti.",
        })
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
      <CardFooter className="flex justify-end">
        <Button onClick={handleAccept}>Accetto i Termini</Button>
      </CardFooter>
    </Card>
  )
}
