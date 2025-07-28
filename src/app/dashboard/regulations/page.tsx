
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download, Eye } from "lucide-react"

export default function RegulationsPage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()
  
  const [accepted, setAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Devi essere loggato per accettare i regolamenti.",
      })
      return
    }

    if (!accepted) {
        toast({
            variant: "destructive",
            title: "Attenzione",
            description: "Devi spuntare la casella per accettare i regolamenti.",
        })
        return
    }

    setIsLoading(true)
    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        regulationsAccepted: true,
      })
      
      // Non usiamo router.push() perché il layout guardiano gestirà il reindirizzamento
      // dopo aver ricaricato i dati utente aggiornati. Forziamo un reload per
      // essere sicuri che il layout riparta con i dati freschi.
      window.location.reload()

    } catch (error) {
      console.error("Error updating regulations:", error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Non è stato possibile salvare la tua accettazione. Riprova.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Statuto e Regolamento</CardTitle>
          <CardDescription>
            Prima di continuare, leggi attentamente e accetta lo Statuto e il Regolamento dell&apos;associazione.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Statuto dell&apos;Associazione</h3>
                <p className="text-sm text-muted-foreground">Le regole fondamentali della nostra comunità.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" asChild>
                  <a href="/documents/statuto.pdf" target="_blank" aria-label="Visualizza Statuto">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                   <a href="/documents/statuto.pdf" download aria-label="Scarica Statuto">
                    <Download className="h-4 w-4" />
                   </a>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Regolamento Interno</h3>
                <p className="text-sm text-muted-foreground">Norme di comportamento e di utilizzo delle strutture.</p>
              </div>
               <div className="flex gap-2">
                <Button variant="outline" size="icon" asChild>
                  <a href="/documents/regolamento.pdf" target="_blank" aria-label="Visualizza Regolamento">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                   <a href="/documents/regolamento.pdf" download aria-label="Scarica Regolamento">
                    <Download className="h-4 w-4" />
                   </a>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox id="accept" checked={accepted} onCheckedChange={(checked) => setAccepted(checked as boolean)} />
            <Label htmlFor="accept" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Dichiaro di aver letto e di accettare integralmente lo Statuto e il Regolamento.
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAccept} disabled={!accepted || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prosegui
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
