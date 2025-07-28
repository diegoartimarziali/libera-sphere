
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
import { Input } from "@/components/ui/input"

export default function LiberaSpherePage() {
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [isFormerMember, setIsFormerMember] = useState<'yes' | 'no' | null>(null)
  const [lastYear, setLastYear] = useState('')
  const [lastGrade, setLastGrade] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Errore", description: "Utente non autenticato." })
      return
    }

    if (!isFormerMember) {
      toast({ variant: "destructive", title: "Attenzione", description: "Devi selezionare un'opzione." })
      return
    }

    if (isFormerMember === 'yes' && (!lastYear || !lastGrade)) {
        toast({ variant: "destructive", title: "Attenzione", description: "Per favore, compila anno e grado." })
        return
    }

    setIsLoading(true)
    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        isFormerMember: isFormerMember,
        ...(isFormerMember === 'yes' && { lastYear, lastGrade })
      })
      
      // Ricarica la pagina per far scattare il guardiano nel layout
      // e reindirizzare alla pagina corretta.
      window.location.reload()

    } catch (error) {
      console.error("Error updating user choice:", error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Non è stato possibile salvare la tua scelta. Riprova.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Bentornato in LiberaSphere</CardTitle>
          <CardDescription>
            Aiutaci a capire il tuo percorso. Sei già stato dei nostri in passato?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={isFormerMember || ''} 
            onValueChange={(value) => setIsFormerMember(value as 'yes' | 'no')}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no">No, è la mia prima volta</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes">Sì, sono un ex socio</Label>
            </div>
          </RadioGroup>

          {isFormerMember === 'yes' && (
            <div className="space-y-4 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                <h4 className="font-semibold text-foreground">Dettagli Iscrizione Precedente</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <div>
                        <Label htmlFor="lastYear">Ultimo Anno di Iscrizione</Label>
                        <Input 
                            id="lastYear" 
                            type="text" 
                            placeholder="Es. 2022"
                            value={lastYear}
                            onChange={(e) => setLastYear(e.target.value)}
                        />
                     </div>
                     <div>
                        <Label htmlFor="lastGrade">Ultimo Grado Ottenuto</Label>
                        <Input 
                            id="lastGrade" 
                            placeholder="Es. Cintura Blu"
                            value={lastGrade}
                            onChange={(e) => setLastGrade(e.target.value)}
                        />
                     </div>
                </div>
            </div>
          )}

        </CardContent>
        <CardFooter>
          <Button onClick={handleContinue} disabled={!isFormerMember || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prosegui
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
