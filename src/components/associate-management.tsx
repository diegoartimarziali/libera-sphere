
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MoreHorizontal, PlusCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Badge } from "./ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { useState } from "react"

const associatesData = [
  {
    name: "Giovanna Bianchi",
    email: "giovanna.bianchi@example.com",
    status: "Attivo",
    plan: "Aggiunta Famiglia",
  },
  {
    name: "Marco Neri",
    email: "marco.neri@example.com",
    status: "Attivo",
    plan: "Aggiunta Famiglia",
  },
  {
    name: "Elisa Gialli",
    email: "elisa.gialli@example.com",
    status: "Inattivo",
    plan: "Nessuno",
  },
]

export function AssociateManagement() {
  const [associates, setAssociates] = useState(associatesData)
  const [open, setOpen] = useState(false)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Associati</CardTitle>
        <CardDescription>
          Far parte della nostra associazione no profit non significa semplicemente iscriversi a un corso di Arti Marziali. Significa intraprendere un percorso di crescita condiviso, dove l'allenamento fisico è solo una parte di un'esperienza molto più ricca e profonda.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Piano</TableHead>
              <TableHead>
                <span className="sr-only">Azioni</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {associates.map((associate, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{associate.name}</TableCell>
                <TableCell>{associate.email}</TableCell>
                <TableCell>
                  <Badge variant={associate.status === 'Attivo' ? 'default' : 'secondary'} className={associate.status === 'Attivo' ? 'bg-green-500/20 text-green-700 border-green-500/20' : ''}>
                    {associate.status}
                  </Badge>
                </TableCell>
                <TableCell>{associate.plan}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Apri menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                      <DropdownMenuItem>Modifica</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Domanda Associazione
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Domanda di Associazione</DialogTitle>
              <DialogDescription>
                Confermando, invierai la tua domanda di associazione per un nuovo membro.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={() => setOpen(false)}>Invia Domanda</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}
