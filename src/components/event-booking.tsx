"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function EventBooking() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prenota Stage ed Esami</CardTitle>
        <CardDescription>
          Riserva il tuo posto nei prossimi eventi speciali.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Event items will be displayed here in the future */}
      </CardContent>
    </Card>
  )
}
