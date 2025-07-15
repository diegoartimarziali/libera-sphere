"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Calendar, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const events = [
  {
    title: "Workshop di Yoga Avanzato",
    type: "Stage",
    date: "2024-08-15",
  },
  {
    title: "Esame Cintura Nera",
    type: "Esame",
    date: "2024-09-01",
  },
  {
    title: "Preparazione CrossFit Open",
    type: "Stage",
    date: "2024-09-10",
  },
    {
    title: "Masterclass di Pilates",
    type: "Stage",
    date: "2024-09-22",
  },
]

export function EventBooking() {
  const { toast } = useToast()

  const handleBooking = (title: string) => {
    toast({
        title: "Prenotazione Confermata!",
        description: `Hai prenotato con successo il tuo posto per ${title}.`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prenota Stage ed Esami</CardTitle>
        <CardDescription>
          Riserva il tuo posto nei prossimi eventi speciali.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <h3 className="font-semibold">{event.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Tag className="mr-1.5 h-4 w-4" />
                  <span>{event.type}</span>
                  <Calendar className="ml-4 mr-1.5 h-4 w-4" />
                  <span>{new Date(event.date).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleBooking(event.title)}>
                Prenota Ora
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
