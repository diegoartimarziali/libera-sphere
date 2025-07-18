
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

const capitalizeName = (name: string) => {
    if (!name) return "";
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export function MemberSummaryCard() {
  const [userName, setUserName] = useState("Utente");
  const [codiceFiscale, setCodiceFiscale] = useState<string | null>(null);
  const [birthDateString, setBirthDateString] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [comune, setComune] = useState<string | null>(null);
  const [provincia, setProvincia] = useState<string | null>(null);
  const [randomKanji, setRandomKanji] = useState<string | null>(null);
  const [regulationsAccepted, setRegulationsAccepted] = useState(false);
  const [acceptanceDate, setAcceptanceDate] = useState<string | null>(null);
  const [lessonDate, setLessonDate] = useState<string | null>(null);
  const [selectedDojo, setSelectedDojo] = useState<string | null>(null);
  const [associationStatus, setAssociationStatus] = useState<'none' | 'requested' | 'approved'>('none');
  const [associationDate, setAssociationDate] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setUserName(capitalizeName(storedName));
      }
      setCodiceFiscale(localStorage.getItem("codiceFiscale"));
      setBirthDateString(localStorage.getItem("birthDate"));
      setAddress(localStorage.getItem("address"));
      setComune(localStorage.getItem("comune"));
      setProvincia(localStorage.getItem("provincia"));

      const storedRegulations = localStorage.getItem('regulationsAccepted');
      if (storedRegulations === 'true') {
        setRegulationsAccepted(true);
        setAcceptanceDate(localStorage.getItem('regulationsAcceptanceDate'));
      }
      const storedLessonDate = localStorage.getItem('lessonDate');
      if (storedLessonDate) {
        setLessonDate(storedLessonDate);
      }
      const storedDojo = localStorage.getItem('selectedDojo');
      if (storedDojo) {
        setSelectedDojo(storedDojo);
      }
      
      const isApproved = localStorage.getItem('associationApproved') === 'true';
      const isRequested = localStorage.getItem('associationRequested') === 'true';

      if (isApproved) {
        setAssociationStatus('approved');
        setAssociationDate(localStorage.getItem('associationRequestDate')); // Or a real approval date from DB
      } else if (isRequested) {
        setAssociationStatus('requested');
      } else {
        setAssociationStatus('none');
      }
    }
    const kanji = kanjiList[Math.floor(Math.random() * kanjiList.length)];
    if(kanji) {
      setRandomKanji(kanji);
    }
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

  const simulateApproval = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('associationApproved', 'true');
        localStorage.removeItem('associationRequested');
        setAssociationStatus('approved');
    }
  }

  const capitalizeFirstLetter = (string: string | null) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benvenuto, {userName.split(' ')[0]}!</CardTitle>
        <CardDescription>
            Ecco la tua situazione. 
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
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                  <Star className="w-5 h-5 text-muted-foreground/50" />
                </div>
              </div>
              <div className="text-foreground text-lg flex items-center gap-2">
                  <span className="text-muted-foreground">Data prima associazione: </span>
                  {associationDate ? 
                    <span className="font-medium text-foreground">{associationDate}</span> : 
                    <Badge variant="destructive">Non definito</Badge>
                  }
              </div>
              <div className="text-muted-foreground text-lg">
                {userName.toLowerCase().replace(' ', '.')}@example.com
              </div>
              <div className="text-muted-foreground mt-2 text-lg flex items-center gap-2">
                <span>CODICE FISCALE: </span>
                {codiceFiscale ? (
                    <span className="font-medium text-foreground">{codiceFiscale}</span>
                ) : (
                    <Badge variant="destructive">Non disponibile</Badge>
                )}
              </div>
              <div className="text-muted-foreground text-lg flex items-center gap-2">
                  <span>Nato il: </span>
                  {birthDateString ? (
                    <span className="font-medium text-foreground">{birthDateString}</span>
                  ) : (
                    <Badge variant="destructive">Non definito</Badge>
                  )}
              </div>
              <div className="text-muted-foreground mt-2 text-lg flex items-center gap-2">
                  <span>Residente in (via, piazza): </span>
                  {address ? (
                    <span className="font-medium text-foreground">{address}</span>
                  ) : (
                    <Badge variant="destructive">Non definito</Badge>
                  )}
              </div>
              <div className="text-muted-foreground mt-2 text-lg flex items-center gap-2">
                  <span>Comune: </span>
                  {comune ? (
                    <span className="font-medium text-foreground">{comune}</span>
                  ) : (
                    <Badge variant="destructive">Non definito</Badge>
                  )}
              </div>
              <div className="text-muted-foreground text-lg flex items-center gap-2">
                  <span>Provincia: </span>
                  {provincia ? (
                    <span className="font-medium text-foreground">{provincia}</span>
                  ) : (
                    <Badge variant="destructive">Non definito</Badge>
                  )}
              </div>
              <div className="text-muted-foreground text-lg flex items-center gap-2">
                    <span>Data prima lezione di selezione: </span>
                    {lessonDate && selectedDojo ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                            {`${lessonDate} presso il Dojo di ${capitalizeFirstLetter(selectedDojo)}`}
                        </Badge>
                     ) : (
                        <Badge variant="destructive">Da definire</Badge>
                     )}
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
                  Certificato medico scadenza:
                </span>
                <Badge variant="destructive">Mancante</Badge>
              </div>
            </div>
            <div className="grid gap-1.5 text-lg flex-1">
              <div className="text-muted-foreground text-lg flex items-center gap-2">
                  <span>Grado attuale: </span>
                  <Badge variant="destructive">Nessuno</Badge>
              </div>
              <div className="text-muted-foreground text-lg flex items-center gap-2">
                  <span>Prossimo esame: </span>
                  <Badge variant="destructive">Nessuno</Badge>
              </div>
               <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Abbonamento ai corsi:
                </span>
                <Badge variant="destructive">Non attivo</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Partecipazione agli stage:
                </span>
                <Badge variant="destructive">N/D</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Regolarità allenamenti:
                </span>
                <Badge variant="destructive">N/D</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Taiso:
                </span>
                <Badge variant="destructive">N/D</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Kihon:
                </span>
                <Badge variant="destructive">N/D</Badge>
              </div>
              <div className="flex items-center pt-2 gap-2 text-lg">
                <span className="text-muted-foreground">
                  Bunkai/Kumite:
                </span>
                <Badge variant="destructive">N/D</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
