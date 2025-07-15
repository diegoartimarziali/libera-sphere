"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function ClassSelection() {
    const { toast } = useToast()

    const handleRegister = () => {
        toast({
            title: "Registration Successful!",
            description: "You have been registered for the class.",
        })
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for a Class</CardTitle>
        <CardDescription>
          Select your preferred gym and class to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="gym">Gym Location</Label>
              <Select>
                <SelectTrigger id="gym">
                  <SelectValue placeholder="Select a gym" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="downtown">Downtown Fitness</SelectItem>
                  <SelectItem value="uptown">Uptown Strength</SelectItem>
                  <SelectItem value="suburban">Suburban Wellness</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="class">Class</Label>
              <Select>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="yoga">Yoga Flow - Mon 6 PM</SelectItem>
                  <SelectItem value="spin">Spin Cycle - Tue 7 AM</SelectItem>
                  <SelectItem value="hiit">HIIT Blast - Wed 5:30 PM</SelectItem>
                  <SelectItem value="zumba">Zumba Party - Thu 7 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleRegister}>Register</Button>
      </CardFooter>
    </Card>
  )
}
