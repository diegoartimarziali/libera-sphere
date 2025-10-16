"use client";

// IMPLEMENTAZIONE MINIMALE COMPLETA - NO RESIDUI
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";

const TOTAL_PAGES = 4;
const BG_URL = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fsfondo.jpg?alt=media&token=825019f1-2a51-4567-b0c6-8e7f98860307";
const BG_COPERTINA = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fcopertina.jpg?alt=media&token=69f1dc9f-c19a-4b07-9974-d0f5150b1d88";

// Helper function to format date to Italian format (gg/mm/aaaa)
function formatDateIT(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr; // Return original if parsing fails
  }
}

function SimplePage({ pageNum, budoPassNumber, issuedAt, from, scadenza, presidenteSignature, direttivoSignature }: { pageNum: number; budoPassNumber?: string | null; issuedAt?: string | null; from?: string | null; scadenza?: string | null; presidenteSignature?: string | null; direttivoSignature?: string | null }) {
  const [bg, setBg] = useState("");
  useEffect(() => {
    // Pagina 1 usa la copertina, le altre usano lo sfondo standard
    setBg(pageNum === 1 ? BG_COPERTINA : BG_URL);
  }, [pageNum]);

  return (
    <Card
      className="budo-card relative overflow-hidden border-0 shadow-none"
      style={{ width: "10.5cm", height: "15cm" }}
    >
      {bg && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
        />
      )}
      <div
        className="absolute top-2 right-3 px-1"
        style={{
          fontSize: "8pt",
          fontWeight: "normal",
          color: "#000",
        }}
      >
        pag. {pageNum}
      </div>
      
      {/* Pagina 2: Dati Tessera */}
      {pageNum === 2 && (
        <div className="absolute inset-0 flex flex-col items-center pt-4">
          <div className="text-center">
            <div
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "12pt",
                color: "#000",
                fontWeight: "normal",
              }}
            >
              LIBERA ENERGIA KARATE
            </div>
            <div
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "12pt",
                color: "#000",
                fontWeight: "normal",
                marginTop: "0.05cm",
              }}
            >
              Valle d'Aosta
            </div>
            {/* Spaziatura verticale di 3 cm sotto l'intestazione (1 cm originale + 2 cm spostamento) */}
            <div
              style={{
                marginTop: "3cm",
                fontSize: "14pt",
                color: "#000",
                fontWeight: "normal",
                fontFamily: "'Noto Serif', serif",
              }}
            >
              <span>BUDOPASS N°</span>{" "}
              {budoPassNumber ? (
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "14pt" }}>
                  {budoPassNumber}
                </span>
              ) : null}
            </div>
            <div
              style={{
                marginTop: "0.15cm",
                fontSize: "14pt",
                color: "#000",
                fontWeight: "normal",
                fontFamily: "'Noto Serif', serif",
              }}
            >
              <span>RILASCIATO IL:</span>{" "}
              {issuedAt ? (
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "14pt" }}>
                  {formatDateIT(issuedAt)}
                </span>
              ) : null}
            </div>
            <div
              style={{
                marginTop: "0.15cm",
                fontSize: "14pt",
                color: "#000",
                fontWeight: "normal",
                fontFamily: "'Noto Serif', serif",
              }}
            >
              <span>DA:</span>{" "}
              {from ? (
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "14pt" }}>
                  {from}
                </span>
              ) : null}
            </div>
            <div
              style={{
                marginTop: "0.15cm",
                fontSize: "14pt",
                color: "#000",
                fontWeight: "normal",
                fontFamily: "'Noto Serif', serif",
              }}
            >
              <span>SCADENZA:</span>{" "}
              {scadenza ? (
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "14pt" }}>
                  {formatDateIT(scadenza)}
                </span>
              ) : null}
            </div>
          </div>
          
          {/* Riga firme: Il Presidente (sinistra) e Per il Direttivo (destra) */}
          <div
            style={{
              position: "absolute",
              bottom: "3.5cm",
              left: "0",
              right: "0",
              paddingLeft: "0.5cm",
              paddingRight: "0.5cm",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14pt",
              fontFamily: "'Noto Serif', serif",
              color: "#000",
              fontWeight: "normal",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span>Il Presidente</span>
              {presidenteSignature && (
                <img 
                  src={presidenteSignature} 
                  alt="Firma Presidente" 
                  style={{ maxHeight: "2.5cm", maxWidth: "4cm", marginTop: "0.2cm" }}
                />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span>Per il Direttivo</span>
              {direttivoSignature && (
                <img 
                  src={direttivoSignature} 
                  alt="Firma Direttivo" 
                  style={{ maxHeight: "2.5cm", maxWidth: "4cm", marginTop: "0.2cm" }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function BudoPassPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [user] = useAuthState(auth);
  const [budoPassNumber, setBudoPassNumber] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [scadenza, setScadenza] = useState<string | null>(null);
  const [presidenteSignature, setPresidenteSignature] = useState<string | null>(null);
  const [direttivoSignature, setDirettivoSignature] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.uid) return;
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          const num = data?.budoPassExtra?.budoPassNumber ?? null;
          const issued = data?.budoPassExtra?.issuedAt ?? null;
          const fromVal = data?.budoPassExtra?.from ?? null;
          const scadenzaVal = data?.budoPassExtra?.scadenza ?? null;
          const presidenteImg = data?.budoPassExtra?.tableRows?.[0]?.imageUrl ?? null;
          const direttivoImg = data?.budoPassExtra?.tableRows?.[1]?.imageUrl ?? null;
          setBudoPassNumber(num);
          setIssuedAt(issued);
          setFrom(fromVal);
          setScadenza(scadenzaVal);
          setPresidenteSignature(presidenteImg);
          setDirettivoSignature(direttivoImg);
        }
      } catch (e) {
        console.error("Errore lettura BudoPass number:", e);
      }
    };
    load();
  }, [user?.uid]);

  const handlePrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setPageIndex((i) => Math.min(TOTAL_PAGES - 1, i + 1));

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      for (let p = 0; p < TOTAL_PAGES; p++) {
        setPageIndex(p);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 150));
        const cardElement = document.querySelector(
          ".budo-card"
        ) as HTMLElement | null;
        if (!cardElement) continue;
        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(cardElement, { useCORS: true });
        const imgDataUrl = canvas.toDataURL("image/png");
        if (p > 0) pdf.addPage();
        const pageWidth = 210;
        const pageHeight = 297;
        const imgWidth = 180;
        const imgHeight = 255;
        const xOffset = (pageWidth - imgWidth) / 2;
        const yOffset = (pageHeight - imgHeight) / 2;
        pdf.addImage(imgDataUrl, "PNG", xOffset, yOffset, imgWidth, imgHeight);
      }

      pdf.save(`BudoPass_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Errore generazione PDF:", error);
    } finally {
      setExporting(false);
      setPageIndex(0);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-6">
  <SimplePage pageNum={pageIndex + 1} budoPassNumber={budoPassNumber} issuedAt={issuedAt} from={from} scadenza={scadenza} presidenteSignature={presidenteSignature} direttivoSignature={direttivoSignature} />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={pageIndex === 0}
        >
          Precedente
        </Button>
        <span className="text-xs">
          Pagina {pageIndex + 1} / {TOTAL_PAGES}
        </span>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={pageIndex === TOTAL_PAGES - 1}
        >
          Successiva
        </Button>
      </div>

      <Button
        variant="outline"
        onClick={handleExportPDF}
        disabled={exporting}
        className="flex items-center gap-2"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {exporting ? "Generazione…" : "Scarica PDF"}
      </Button>
    </div>
  );
}

// FINE FILE - non aggiungere altro