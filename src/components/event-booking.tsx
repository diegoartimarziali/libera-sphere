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
    title: "Advanced Yoga Workshop",
    type: "Stage",
    date: "2024-08-15",
  },
  {
    title: "Black Belt Examination",
    type: "Exam",
    date: "2024-09-01",
  },
  {
    title: "CrossFit Open Prep",
    type: "Stage",
    date: "2024-09-10",
  },
    {
    title: "Pilates Masterclass",
    type: "Stage",
    date: "2024-09-22",
  },
]

export function EventBooking() {
  const { toast } = useToast()

  const handleBooking = (title: string) => {
    toast({
        title: "Booking Confirmed!",
        description: `You've successfully booked your spot for ${title}.`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Stages & Exams</CardTitle>
        <CardDescription>
          Reserve your spot in upcoming special events.
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
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleBooking(event.title)}>
                Book Now
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
