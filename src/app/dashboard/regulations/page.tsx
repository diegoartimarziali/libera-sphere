
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"

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
  const [showNotificationButton, setShowNotificationButton] = useState(false)
  const [notificationActivated, setNotificationActivated] = useState(false)

  const statutoUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/documents%2Fstatuto.pdf?alt=media";
  const regolamentoUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/documents%2Fregolamento.pdf?alt=media";
  const privacyUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/documents%2Fprivacy.pdf?alt=media";

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
        regulationsAcceptedAt: serverTimestamp(),
      })

      setShowNotificationButton(true);

      // Navigazione rimandata dopo attivazione notifiche
      // router.push("/dashboard/medical-certificate")

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

  const handleNotificationActivate = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationActivated(true);
        new Notification("Benvenuto!", {
          body: "Le notifiche sono attive. Riceverai promemoria importanti!",
        });
        setTimeout(() => {
          router.push("/dashboard/medical-certificate");
        }, 1200);
      } else {
        toast({
          title: "Notifiche non attivate",
          description: "Puoi attivare le notifiche in qualsiasi momento dalle impostazioni del browser.",
        });
        setTimeout(() => {
          router.push("/dashboard/medical-certificate");
        }, 1200);
      }
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Documenti Associativi e Privacy</CardTitle>
          <CardDescription>
            Prima di continuare, leggi attentamente e accetta lo Statuto, il Regolamento e l'Informativa sulla Privacy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* ...existing code... */}
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Statuto dell&apos;Associazione</h3>
                <p className="text-sm text-muted-foreground">Le regole fondamentali della nostra comunità.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" asChild>
                  <a href={statutoUrl} target="_blank" rel="noopener noreferrer" aria-label="Visualizza Statuto">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                   <a href={statutoUrl} download="Statuto.pdf" aria-label="Scarica Statuto">
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
                  <a href={regolamentoUrl} target="_blank" rel="noopener noreferrer" aria-label="Visualizza Regolamento">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                   <a href={regolamentoUrl} download="Regolamento.pdf" aria-label="Scarica Regolamento">
                    <Download className="h-4 w-4" />
                   </a>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <h3 className="font-semibold">Informativa sulla Privacy</h3>
                <p className="text-sm text-muted-foreground">Come trattiamo i tuoi dati personali.</p>
              </div>
               <div className="flex gap-2">
                <Button variant="outline" size="icon" asChild>
                  <a href={privacyUrl} target="_blank" rel="noopener noreferrer" aria-label="Visualizza Informativa Privacy">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                   <a href={privacyUrl} download="InformativaPrivacy.pdf" aria-label="Scarica Informativa Privacy">
                    <Download className="h-4 w-4" />
                   </a>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox id="accept" checked={accepted} onCheckedChange={(checked) => setAccepted(checked as boolean)} />
            <Label htmlFor="accept" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Dichiaro di aver letto e di accettare integralmente lo Statuto, il Regolamento e l'Informativa sulla Privacy.
            </Label>
          </div>
          {showNotificationButton && (
            <div className="mt-6 p-4 rounded-md border border-green-600 bg-green-50 flex flex-col items-center">
              <h4 className="font-bold text-green-700 mb-2">Attiva le notifiche!</h4>
              <p className="text-sm text-green-700 mb-4 text-center">Le notifiche ti aiutano a non dimenticare lezioni, scadenze e novità. Consenti le notifiche per ricevere promemoria importanti direttamente sul tuo dispositivo.</p>
              <Button
                variant="success"
                onClick={handleNotificationActivate}
                disabled={notificationActivated}
                className="w-full max-w-xs"
              >
                {notificationActivated ? "Notifiche attivate!" : "Attiva Notifiche"}
              </Button>
            </div>
          )}
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
