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

const kanjiList = ['道', '力', '心', '技', '武', '空', '合', '気', '侍'];

export function MemberSummaryCard() {
  const [userName, setUserName] = useState("Utente");
  const [randomKanji, setRandomKanji] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setUserName(storedName);
      }
    }
    // Select a random Kanji on client-side mount to avoid hydration mismatch
    setRandomKanji(kanjiList[Math.floor(Math.random() * kanjiList.length)]);
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
        <CardDescription>Ecco la tua situazione.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="https://placehold.co/128x128" data-ai-hint="person face" />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <div className="font-semibold text-xl flex items-center gap-2">
              <span>{userName}</span>
              {randomKanji && <span className="text-primary font-serif" title="Il tuo Kanji del giorno">{randomKanji}</span>}
            </div>
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
