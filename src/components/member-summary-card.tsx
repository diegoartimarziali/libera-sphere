"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from "react"

export function MemberSummaryCard() {
  const [userName, setUserName] = useState("Utente");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setUserName(storedName);
      }
    }
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benvenuto, {userName.split(' ')[0]}!</CardTitle>
        <CardDescription>Ecco un riepilogo della tua iscrizione.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="https://placehold.co/128x128" data-ai-hint="person face" />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <div className="font-semibold text-xl">{userName}</div>
            <div className="text-sm text-muted-foreground">
              {userName.toLowerCase().replace(' ', '.')}@example.com
            </div>
            <div className="flex items-center pt-2 gap-2">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">Membro Attivo</Badge>
              <span className="text-sm text-muted-foreground">
                Si rinnova il 31 Dic 2024
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
