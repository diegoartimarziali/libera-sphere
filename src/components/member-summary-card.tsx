
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
import { Star } from "lucide-react"

const kanjiList = ['道', '力', '心', '技', '武', '空', '合', '気', '侍'];

export function MemberSummaryCard() {
  const [userName, setUserName] = useState("Utente");
  const [randomKanji, setRandomKanji] = useState<string | null>(null);
  const [regulationsAccepted, setRegulationsAccepted] = useState(false);
  const [acceptanceDate, setAcceptanceDate] = useState<string | null>(null);
  const [lessonDate, setLessonDate] = useState<string | null>(null);
  const [associationStatus, setAssociationStatus] = useState<'none' | 'requested' | 'approved'>('none');
  

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setUserName(storedName);
      }
      const storedRegulations = localStorage.getItem('regulationsAccepted');
      if (storedRegulations === 'true') {
        setRegulationsAccepted(true);
        setAcceptanceDate(localStorage.getItem('regulationsAcceptanceDate'));
      }
      const storedLessonDate = localStorage.getItem('lessonDate');
      if (storedLessonDate) {
        setLessonDate(storedLessonDate);
      }
      
      const isApproved = localStorage.getItem('associationApproved') === 'true';
      const isRequested = localStorage.getItem('associationRequested') === 'true';

      if (isApproved) {
        setAssociationStatus('approved');
      } else if (isRequested) {
        setAssociationStatus('requested');
      } else {
        setAssociationStatus('none');
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

  const renderAssociationBadge = () => {
    switch (associationStatus) {
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-600">Valida</Badge>;
      case 'requested':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Domanda Inviata</Badge>;
      default:
        return <Badge variant="destructive">Non Associato</Badge>;
    }
  }

  // Helper function to simulate manual approval from Firebase
  const simulateApproval = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('associationApproved', 'true');
        localStorage.removeItem('associationRequested');
        setAssociationStatus('approved');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benvenuto, {userName.split(' ')[0]}!</CardTitle>
        <CardDescription>
            Ecco la tua situazione. 
            {/* This button is for simulation purposes only and can be removed */}
            {associationStatus === 'requested' && <button onClick={simulateApproval} className="ml-4 text-xs p-1 bg-gray-200 rounded">Simula Approvazione</button>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-5xl font-serif bg-primary/10 text-primary">
              {randomKanji ? randomKanji : getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 gap-8">
            <div className="grid gap-1.5 text-lg flex-1">
              <div className="font-semibold text-xl flex items-center gap-2">
                <span>{userName}</span>
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                </div>
              </div>
              <div className="text-foreground text-lg">
                  <span className="text-muted-foreground">Data prima associazione: </span>
                  <span className="font-medium text-foreground">01/09/2023</span>
              </div>
              <div className="text-muted-foreground text-lg">
                {userName.toLowerCase().replace(' ', '.')}@example.com
              </div>
              <div className="text-muted-foreground mt-2 text-lg">
                <span>CODICE FISCALE: </span>
                <span className="font-medium text-foreground">RSSMRA80A01H501U</span>
              </div>
              <div className="text-muted-foreground text-lg">
                  <span>Nato il: </span>
                  <span className="font-medium text-foreground">01/01/1980</span>
              </div>
              <div className="text-muted-foreground mt-2 text-lg">
                  <span>Residente in (via, piazza): </span>
                  <span className="font-medium text-foreground">Via del Corso, 1</span>
              </div>
              <div className="text-muted-foreground mt-2 text-lg">
                  <span>Comune: </span>
                  <span className="font-medium text-foreground">Roma</span>
              </div>
              <div className="text-muted-foreground text-lg">
                  <span>Provincia: </span>
                  <span className="font-medium text-foreground">RM</span>
              </div>
               <div className="text-muted-foreground text-lg">
                    <span>Data prima lezione di selezione: </span>
                    <span className="font-medium text-foreground">{lessonDate || 'Da definire'}</span>
                 </div>
               
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Regolamento, Statuto e Privacy:
                </span>
                {regulationsAccepted ? (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                        Accettati il {acceptanceDate}
                    </Badge>
                ) : (
                    <Badge variant="destructive">Non Accettati</Badge>
                )}
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Associazione stagione: 2024/2025
                </span>
                {renderAssociationBadge()}
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Certificato medico scadenza: 31/08/2025
                </span>
                <Badge variant="outline" className="border-green-500 text-green-600">Valido</Badge>
              </div>
            </div>
            <div className="grid gap-1.5 text-lg flex-1">
              <div className="text-muted-foreground text-lg">
                  <span>Grado attuale: </span>
                  <span className="font-medium text-foreground">Cintura Nera 1° Dan</span>
              </div>
              <div className="text-muted-foreground text-lg">
                  <span>Prossimo esame: </span>
                  <span className="font-medium text-foreground">2° Dan (30/06/2025)</span>
              </div>
               <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Abbonamento ai corsi: Mensile
                </span>
                <Badge variant="outline" className="border-green-500 text-green-600">Pagato</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Partecipazione agli stage:
                </span>
                <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-500/10">Media</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Regolarità allenamenti:
                </span>
                <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">Alta</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Taiso:
                </span>
                <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">Buono</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Kihon:
                </span>
                <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">Buono</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Bunkai/Kumite:
                </span>
                <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">Buono</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
