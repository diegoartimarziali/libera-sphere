"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
  
export function AssociateCard() {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Associati</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                    Far parte della nostra associazione no profit non significa semplicemente iscriversi a un corso di Arti Marziali. Significa intraprendere un percorso di crescita condiviso, dove l'allenamento fisico è solo una parte di un'esperienza molto più ricca e profonda.
                </p>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button>Fai Domanda di Associazione</Button>
            </CardFooter>
        </Card>
    )
}