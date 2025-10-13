"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, BookOpen, Award, Calendar, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BudoPassPageProvider, useBudoPassPageNumber } from "@/context/BudoPassPageContext"
import { Button } from "@/components/ui/button"

interface UserData {
  name: string;
  surname: string;
  discipline: string;
  lastGrade: string;
  qualification?: string;
  gym?: string;
  associationStatus?: string;
}

function BudoPassContent() {
  const [user, loadingAuth] = useAuthState(auth);
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const effectiveUserId = impersonateId || user?.uid;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!effectiveUserId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', effectiveUserId));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error("Errore nel caricamento dati:", error);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile caricare i dati del Budo Pass."
        });
      } finally {
        setLoading(false);
      }
    };

    if (!loadingAuth && effectiveUserId) {
      fetchUserData();
    }
  }, [effectiveUserId, loadingAuth, toast]);

  if (loadingAuth || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!userData?.associationStatus || userData.associationStatus !== 'active') {
    return (
      <div className="flex justify-center items-center h-64">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Budo Pass Non Disponibile</h3>
            <p className="text-muted-foreground">
              Il Budo Pass è disponibile solo per i soci confermati.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Container principale con effetto libro */}
      <div className="relative">
        {/* Flip-book interattivo (schermo) */}
        <div className="screen-only">
          <BudoPassPageProvider startAt={1}>
            <FlipBook
              numCards={10}
              children={[...Array(10)].map((_, i) => BudoCardPair({ userData, cardIndex: i }))}
            />
          </BudoPassPageProvider>
        </div>

        {/* Output di stampa (due pagine distinte) */}
        <BudoPassPageProvider startAt={1}>
          <div className="print-only space-y-6">
            <BudoCardCover userData={userData} />
            <BudoCardBack userData={userData} />
          </div>
        </BudoPassPageProvider>
        
        {/* Placeholder per altre schede future */}
        <div className="mt-6 text-center text-muted-foreground">
          <p className="text-sm">Altre schede in arrivo...</p>
        </div>
      </div>
    </div>
  );
}

// Componente per la prima scheda del Budo Pass
function BudoCardCover({ userData }: { userData: UserData }) {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  // Numero pagina stabile (partendo da 1)
  const pageNumber = useBudoPassPageNumber('budo-card-1');

  useEffect(() => {
    // Carica lo sfondo da Firebase Storage
    const loadBackground = async () => {
      try {
        // URL dello sfondo aggiornato
        const bgUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fsfondo.jpg?alt=media&token=658128b4-2aed-4c3c-98a3-dd2bd41c1391";
        setBackgroundImage(bgUrl);
      } catch (error) {
        console.error("Errore nel caricamento dello sfondo:", error);
      }
    };

    loadBackground();
  }, []);

  return (
    <Card className="budo-card relative overflow-hidden shadow-lg border-2 border-amber-200 transform transition-transform hover:scale-[1.02]">
      {/* Sfondo */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* Contenuto scheda */}
      <div className="relative z-10">
        <CardHeader className="text-center border-b border-amber-200 relative">
          {/* Numero pagina in alto a destra */}
          <div className="absolute top-3 right-4 text-xs text-amber-900 font-bold bg-white/80 px-2 py-1 rounded">
            pag. {pageNumber}
          </div>
          
          <CardTitle className="text-2xl font-bold text-amber-900">
            BUDO PASS
          </CardTitle>
          <CardDescription className="text-amber-800 font-bold">
            Copertina
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dati Personali */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-800">Dati Personali</h3>
              </div>
              
              <div className="space-y-2 pl-7">
                <div>
                  <span className="text-sm font-medium text-gray-600">Nome Completo:</span>
                  <p className="font-bold text-gray-900">{userData.name} {userData.surname}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-600">Disciplina:</span>
                  <Badge variant="outline" className="ml-2 border-amber-500 text-amber-700">
                    {userData.discipline}
                  </Badge>
                </div>
                
                {userData.gym && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Palestra:</span>
                    <p className="font-medium text-gray-800">{userData.gym}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informazioni Tecniche */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-800">Livello Tecnico</h3>
              </div>
              
              <div className="space-y-2 pl-7">
                <div>
                  <span className="text-sm font-medium text-gray-600">Grado Attuale:</span>
                  <Badge variant="default" className="ml-2 bg-amber-600 hover:bg-amber-700">
                    {userData.lastGrade}
                  </Badge>
                </div>
                
                {userData.qualification && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Qualifica:</span>
                    <Badge variant="secondary" className="ml-2">
                      {userData.qualification}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* area vuota per copertina */}
        </CardContent>
      </div>
    </Card>
  );
}

// Retro della pagina 1 (pagina 2)
function BudoCardBack({ userData }: { userData: UserData }) {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const pageNumber = useBudoPassPageNumber('budo-card-2');

  useEffect(() => {
    const loadBackground = async () => {
      try {
        const bgUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fsfondo.jpg?alt=media&token=658128b4-2aed-4c3c-98a3-dd2bd41c1391";
        setBackgroundImage(bgUrl);
      } catch (error) {
        console.error("Errore nel caricamento dello sfondo:", error);
      }
    };
    loadBackground();
  }, [pageNumber]);

  return (
    <Card className="budo-card relative overflow-hidden shadow-lg border-2 border-amber-200">
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <div className="relative z-10">
        <CardHeader className="text-center border-b border-amber-200 relative">
          <div className="absolute top-3 right-4 text-xs text-amber-900 font-bold bg-white/80 px-2 py-1 rounded">
            pag. {pageNumber}
          </div>
          <CardTitle className="text-2xl font-bold text-amber-900 font-unifraktur">BUDO PASS</CardTitle>
          <CardDescription className="text-amber-800 font-bold">Retro copertina</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* contenuti retro, placeholder */}
          <div className="text-center text-sm text-amber-700">
            <p>Regolamento, note tesseramento, informazioni utili.</p>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// Flip container composable: mostra la prima child come fronte e la seconda come retro
interface FlipBookProps {
  numCards: number;
  children: React.ReactElement[][];
}

function FlipBook({ numCards, children }: FlipBookProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const maxIndex = numCards - 1;
  const pairs: React.ReactElement[][] = Array.isArray(children) ? children : [children];
  const currentPair: React.ReactElement[] = pairs[cardIndex];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flip-book" style={{ width: '100%', maxWidth: '420px', height: '600px', position: 'relative' }}>
        <div className={`flip-inner${flipped ? ' is-flipped' : ''}`} style={{ width: '100%', height: '100%' }}>
          <div className="flip-face">
            {currentPair?.[0]}
          </div>
          <div className="flip-face flip-back">
            {currentPair?.[1]}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button variant="outline" onClick={() => {
          if (flipped) {
            setFlipped(false);
          } else {
            setCardIndex(Math.max(0, cardIndex - 1));
          }
        }} disabled={cardIndex === 0 && !flipped}>Precedente</Button>
        <Button variant="outline" onClick={() => setFlipped(false)} disabled={!flipped}>Fronte</Button>
        <Button variant="outline" onClick={() => setFlipped(true)} disabled={flipped}>Retro</Button>
        <Button variant="outline" onClick={() => {
          if (!flipped) {
            setFlipped(true);
          } else {
            setCardIndex(Math.min(maxIndex, cardIndex + 1));
            setFlipped(false);
          }
        }} disabled={cardIndex === maxIndex && flipped}>Successiva</Button>
      </div>
      <div className="text-xs text-gray-500 mt-1">Scheda {cardIndex + 1} / {numCards} ({flipped ? 'Retro' : 'Fronte'})</div>
    </div>
  );
}

// Card pair: front and back for each logical card
function BudoCardPair({ userData, cardIndex }: { userData: UserData, cardIndex: number }) {
  // Page numbers: 1f/2r, 3f/4r, ...
  const frontPage = 1 + cardIndex * 2;
  const backPage = frontPage + 1;
  return [
    <BudoCardGeneric userData={userData} pageNumber={frontPage} face="f" cardIndex={cardIndex} key={`front-${cardIndex}`} />,
    <BudoCardGeneric userData={userData} pageNumber={backPage} face="r" cardIndex={cardIndex} key={`back-${cardIndex}`} />
  ];
}

// Generic card for placeholder/demo
function BudoCardGeneric({ userData, pageNumber, face, cardIndex }: { userData: UserData, pageNumber: number, face: 'f' | 'r', cardIndex: number }) {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  useEffect(() => {
    const loadBackground = async () => {
      try {
        const bgUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fsfondo.jpg?alt=media&token=658128b4-2aed-4c3c-98a3-dd2bd41c1391";
        setBackgroundImage(bgUrl);
      } catch (error) {
        console.error("Errore nel caricamento dello sfondo:", error);
      }
    };
    loadBackground();
  }, []);
  return (
    <Card className="budo-card relative overflow-hidden shadow-lg border-2 border-amber-200">
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <div className="relative z-10">
        <CardHeader className="text-center border-b border-amber-200 relative">
          <div className="absolute top-3 right-4 text-[10px] text-amber-900 bg-transparent px-1 py-0 rounded">
            pag. {pageNumber}{face}
          </div>
          <CardTitle className="text-2xl font-bold text-amber-900">BUDO PASS</CardTitle>
          <CardDescription className="text-amber-800 font-bold">Scheda {cardIndex + 1} {face === 'f' ? 'Fronte' : 'Retro'}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-sm text-amber-700">
            <p>Contenuto demo per pagina {pageNumber}{face} (scheda {cardIndex + 1} {face === 'f' ? 'fronte' : 'retro'}).</p>
            <p className="mt-2 text-xs text-gray-500">Personalizza qui il contenuto della scheda.</p>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function BudoPassPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
      <BudoPassContent />
    </Suspense>
  );
}