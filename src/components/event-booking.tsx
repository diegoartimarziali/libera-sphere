
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
import { FileText } from "lucide-react"

const stages = [
  {
    name: "Kata Heian",
    date: "sabato-11-maggio-2025",
    time: "09:00 - 12:00",
    participants: "Tutti",
    contribution: "20",
    flyerUrl: "#"
  },
  {
    name: "Kumite Agonistico",
    date: "domenica-12-maggio-2025",
    time: "15:00 - 18:00",
    participants: "Cinture Nere",
    contribution: "25",
    flyerUrl: "#"
  },
  {
    name: "Corso Insegnanti",
    date: "sabato-18-maggio-2025",
    time: "10:00 - 13:00",
    participants: "Insegnanti",
    contribution: "30",
    flyerUrl: "#"
  }
]


export function EventBooking() {
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
              <TableHead>Volantino</TableHead>
              <TableHead>Azione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.name}>
                <TableCell className="font-medium">{stage.name}</TableCell>
                <TableCell>{stage.date}</TableCell>
                <TableCell>{stage.time}</TableCell>
                <TableCell>{stage.participants}</TableCell>
                <TableCell>€ {stage.contribution}</TableCell>
                <TableCell>
                   <a href={stage.flyerUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <FileText className="h-5 w-5" />
                      <span className="sr-only">Visualizza volantino</span>
                   </a>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Iscriviti</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
