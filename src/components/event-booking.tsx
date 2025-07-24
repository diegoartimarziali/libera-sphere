"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "./ui/label"
import { Button } from "./ui/button"

export function EventBooking() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Prenota Stage</CardTitle>
        <CardDescription>
          Riserva il tuo posto nei prossimi eventi speciali.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold text-lg">Stage</h3>
            <div className="space-y-2">
                <Label htmlFor="stage-select">Seleziona Stage</Label>
                <Select>
                    <SelectTrigger id="stage-select">
                        <SelectValue placeholder="Scegli uno stage..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="stage-1">Stage Karate - 15 Giugno 2024</SelectItem>
                        <SelectItem value="stage-2">Stage Aikido - 22 Giugno 2024</SelectItem>
                        <SelectItem value="stage-3">Stage Estivo - 1-5 Luglio 2024</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button className="w-full font-bold">Iscriviti</Button>
        </div>
      </CardContent>
    </Card>
  )
}
