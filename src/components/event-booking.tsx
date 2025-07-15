"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "./ui/button"

export function EventBooking() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Prenota Stage ed Esami</CardTitle>
        <CardDescription>
          Riserva il tuo posto nei prossimi eventi speciali.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-lg mb-2">Stage</h3>
            {/* Future stage content can go here */}
        </div>
         <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-lg mb-2">Esami</h3>
            {/* Future exam content can go here */}
        </div>
      </CardContent>
    </Card>
  )
}
