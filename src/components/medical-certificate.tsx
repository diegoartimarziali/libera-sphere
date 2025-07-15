"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HeartPulse, Upload } from "lucide-react"

export function MedicalCertificate() {
  const expirationDate = new Date()
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Certificate</CardTitle>
        <CardDescription>
          Your certificate is required for participation.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center gap-4 p-8">
        <HeartPulse className="w-16 h-16 text-green-500" />
        <p className="font-semibold text-lg">Certificate on File</p>
        <p className="text-muted-foreground text-sm">
          Expires on: {expirationDate.toLocaleDateString()}
        </p>
        <Button variant="outline" className="mt-4">
          <Upload className="mr-2 h-4 w-4" /> Upload New
        </Button>
      </CardContent>
    </Card>
  )
}
