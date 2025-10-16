"use client";

// IMPLEMENTAZIONE MINIMALE COMPLETA - NO RESIDUI
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Upload, X } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const TOTAL_PAGES = 7; // 1: copertina, 2: dati tessera, 3: foto+dati, 4: ente, 5-7: esami (5 righe/pagina)
const BG_URL = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fsfondo.jpg?alt=media&token=825019f1-2a51-4567-b0c6-8e7f98860307";
const BG_COPERTINA = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/budopass%2Fcopertina.jpg?alt=media&token=69f1dc9f-c19a-4b07-9974-d0f5150b1d88";

// Helper function to format date to Italian format (gg/mm/aaaa)
function formatDateIT(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    // Handle Firestore Timestamp objects
    let date: Date;
    if (typeof dateStr === 'object' && 'seconds' in dateStr) {
      // @ts-ignore - Firestore Timestamp
      date = new Date(dateStr.seconds * 1000);
    } else {
      date = new Date(dateStr);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return ""; // Return empty string if parsing fails
  }
}

type Exam = { fromGrade: string; toGrade: string; stars?: number; examDate?: string; place?: string; examiner?: string };
function SimplePage({ pageNum, budoPassNumber, issuedAt, from, scadenza, presidenteSignature, direttivoSignature, photoUrl, onPhotoUpload, userName, userSurname, birthDate, birthPlace, address, streetNumber, city, province, phone, enteRows, exams, grades }: { pageNum: number; budoPassNumber?: string | null; issuedAt?: string | null; from?: string | null; scadenza?: string | null; presidenteSignature?: string | null; direttivoSignature?: string | null; photoUrl?: string | null; onPhotoUpload?: (file: File) => void; userName?: string | null; userSurname?: string | null; birthDate?: string | null; birthPlace?: string | null; address?: string | null; streetNumber?: string | null; city?: string | null; province?: string | null; phone?: string | null; enteRows?: Array<{ imageUrl?: string; text?: string }>; exams?: Exam[]; grades?: string[] }) {
  const [bg, setBg] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  useEffect(() => {
    // Pagina 1 usa la copertina, le altre usano lo sfondo standard
    setBg(pageNum === 1 ? BG_COPERTINA : BG_URL);
  }, [pageNum]);

  return (
    <Card
      className="budo-card relative overflow-hidden border-0 shadow-none"
      style={{ width: "10.5cm", height: "14.8cm" }}
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
            {/* Status VALIDO/SCADUTO sopra BUDOPASS */}
            <div
              style={{
                marginTop: "2.5cm",
                fontSize: "12pt",
                color: scadenza && new Date(scadenza) >= new Date() ? "#15803d" : "#dc2626",
                fontWeight: "bold",
                fontFamily: "'Noto Serif', serif",
              }}
            >
              {scadenza ? (new Date(scadenza) >= new Date() ? "VALIDO" : "SCADUTO") : ""}
            </div>
            {/* Spaziatura verticale di 0.5cm sotto status */}
            <div
              style={{
                marginTop: "0.5cm",
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
              bottom: "1.5cm",
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

      {/* Pagina 4: Ente di Appartenenza */}
      {pageNum === 4 && (
        <div className="absolute inset-0" style={{ paddingLeft: "0.5cm", paddingRight: "0.5cm" }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            color: "#000",
            fontFamily: "'Noto Serif', serif",
          }}>
            <div style={{
              textAlign: "center",
              fontSize: "12pt",
              fontWeight: "normal",
              marginTop: "0.6cm",
            }}>
              ENTE DI APPARTENENZA
            </div>
            {/* Spazio di 1cm sotto il sottotitolo */}
            <div style={{ height: "1cm" }} />
            {/* Area tabella: occupa tutto lo spazio rimanente con 1cm dal fondo */}
            <div style={{
              flex: 1,
              display: "grid",
              gridTemplateRows: "repeat(6, 1fr)",
              rowGap: "0.1cm",
              paddingBottom: "1cm",
            }}>
              {Array.from({ length: 6 }, (_, i) => (enteRows?.[i + 2] ?? {})).map((row: any, idx: number) => (
                <div key={idx} style={{
                  display: "grid",
                  gridTemplateColumns: "20% 80%",
                  alignItems: "center",
                  gap: "0.3cm",
                  border: "1px solid #000",
                  padding: "0.2cm 0.3cm",
                  backgroundColor: "transparent",
                }}>
                  {/* Colonna sinistra: logo/immagine ente */}
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "0.5cm" }}>
                    {row?.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt={`Logo Ente ${idx + 1}`}
                        style={{ maxWidth: "160%", maxHeight: "160%", objectFit: "contain" }}
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    ) : null}
                  </div>
                  {/* Colonna destra: testo */}
                  <div style={{
                    fontSize: "16pt",
                    fontWeight: 400,
                    fontFamily: "'Special Elite', cursive",
                    color: "#000",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as any,
                    marginLeft: "2cm",
                  }}>
                    {row?.text || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Pagine 5-7: ESAMI (5 righe per pagina) */}
      {pageNum >= 5 && pageNum <= 7 && (
        <div className="absolute inset-0" style={{ paddingLeft: "0.5cm", paddingRight: "0.5cm" }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            color: "#000",
            fontFamily: "'Noto Serif', serif",
          }}>
            <div style={{
              textAlign: "center",
              fontSize: "12pt",
              fontWeight: "normal",
              marginTop: "0.6cm",
            }}>
              ESAMI
            </div>
            {/* Spazio di 0.7cm sotto il titolo per bilanciare layout su 5 righe */}
            <div style={{ height: "0.7cm" }} />
            <div style={{
              flex: 1,
              display: "grid",
              gridTemplateRows: "repeat(5, 1fr)",
              rowGap: "0.3cm",
              paddingBottom: "0.6cm",
            }}>
              {Array.from({ length: pageNum === 7 ? 4 : 5 }, (_, i) => {
                const start = (pageNum - 5) * 5;
                const examIndex = start + i;
                // Usa grades[examIndex] e grades[examIndex + 1] come nella tabella admin
                const fromGrade = grades?.[examIndex] || "";
                const toGrade = grades?.[examIndex + 1] || "";
                // Cerca nell'array exams un match con fromGrade e toGrade
                const row = (exams || []).find(
                  (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                );
                // Escludi esplicitamente la progressione "da: 5°kyu-verde a: 4°kyu-blu" dalle pagine BudoPass
                const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "").replace(/–|—/g, "-");
                const isExcluded = norm(fromGrade) === "5°kyu-verde" && norm(toGrade) === "4°kyu-blu";
                if (isExcluded) {
                  // Mantiene lo slot di griglia vuoto per non alterare le altezze
                  return <div key={i} />;
                }
                return (
                  <div key={i} style={{
                    border: "1px solid #000",
                    padding: "0.2cm 0.3cm",
                    backgroundColor: "transparent",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15cm",
                  }}>
                    {/* Riga A rimossa: non mostrare 'da:'/'a:' nelle pagine utente */}
                    {/* Riga B: Esame di + Data esame sulla stessa riga */}
                    <div style={{ fontSize: "10pt", lineHeight: 1.2 }}>
                      <span style={{ fontWeight: 600 }}>Esame di:</span>{" "}
                      <span style={{ fontFamily: "'Special Elite', cursive" }}>{toGrade}</span>
                      {" "}<span style={{ fontWeight: 600 }}>Data:</span>{" "}
                      <span style={{ fontFamily: "'Special Elite', cursive" }}>{row?.examDate ? formatDateIT(row.examDate) : ""}</span>
                    </div>
                    {/* Riga C: Luogo - Esaminatore */}
                    <div style={{ fontSize: "9pt", lineHeight: 1.2 }}>
                      <span style={{ fontWeight: 600 }}>Luogo:</span>{" "}
                      <span style={{ fontFamily: "'Special Elite', cursive" }}>{row?.place || ""}</span>
                      {" - "}
                      <span style={{ fontWeight: 600 }}>Esaminatore:</span>{" "}
                      <span style={{ fontFamily: "'Special Elite', cursive" }}>{row?.examiner || ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Pagina 3: Dati Personali - Fototessera */}
      {pageNum === 3 && (
        <div className="absolute inset-0 flex flex-col items-center pt-6">
          <div className="text-center">
            {/* Fototessera */}
            <div className="flex flex-col items-center relative">
              {photoUrl ? (
                <div
                  onClick={() => onPhotoUpload && setShowUploadDialog(true)}
                  style={{
                    cursor: "pointer",
                    width: "3.5cm",
                    height: "4.5cm",
                  }}
                >
                  <img
                    src={photoUrl}
                    alt="Fototessera"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      border: "2px solid #000",
                    }}
                  />
                </div>
              ) : (
                <div
                  onClick={() => onPhotoUpload && setShowUploadDialog(true)}
                  style={{
                    width: "3.5cm",
                    height: "4.5cm",
                    border: "3px dashed #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11pt",
                    color: "#000",
                    textAlign: "center",
                    padding: "0.5cm",
                    cursor: "pointer",
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    fontWeight: "500",
                  }}
                >
                  Clicca per caricare fototessera
                </div>
              )}
              
              {/* Dialog informativo */}
              {showUploadDialog && onPhotoUpload && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#fff",
                    border: "2px solid #000",
                    padding: "0.5cm",
                    borderRadius: "8px",
                    maxWidth: "8cm",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: "9pt",
                      color: "#000",
                      textAlign: "left",
                      lineHeight: "1.4",
                      marginBottom: "0.4cm",
                    }}
                  >
                    <strong>Formati accettati:</strong> JPG, PNG
                    <br /><br />
                    La foto deve essere <strong>verticale</strong>, a <strong>colori</strong>, il viso deve essere <strong>frontale</strong>, ben <strong>centrato</strong>, <strong>nitido</strong> e <strong>senza ombre</strong>, su uno <strong>sfondo bianco e uniforme</strong>.
                  </div>
                  
                  <div style={{ display: "flex", gap: "0.3cm", justifyContent: "center" }}>
                    <label
                      htmlFor="photo-upload"
                      style={{
                        padding: "0.2cm 0.5cm",
                        backgroundColor: "#4CAF50",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "10pt",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2cm",
                      }}
                    >
                      <Upload size={14} />
                      Carica
                    </label>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUploadDialog(false);
                      }}
                      style={{
                        padding: "0.2cm 0.5cm",
                        backgroundColor: "#f44336",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "10pt",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2cm",
                      }}
                    >
                      <X size={14} />
                      Annulla
                    </button>
                  </div>
                </div>
              )}
              
              {onPhotoUpload && (
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  id="photo-upload"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onPhotoUpload(file);
                      setShowUploadDialog(false);
                    }
                  }}
                />
              )}
            </div>
            
            {/* Dati anagrafici */}
            <div
              style={{
                marginTop: "2cm",
                textAlign: "left",
                width: "9cm",
                fontSize: "12pt",
                fontFamily: "'Noto Serif', serif",
                color: "#000",
                lineHeight: "1.6",
              }}
            >
              <div style={{ marginBottom: "0.18cm" }}>
                <span style={{ fontWeight: "bold" }}>NOME E COGNOME:</span>{" "}
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "13pt" }}>
                  {userName && userSurname ? `${userName} ${userSurname}` : ""}
                </span>
              </div>
              <div style={{ marginBottom: "0.18cm" }}>
                <span style={{ fontWeight: "bold" }}>DATA DI NASCITA:</span>{" "}
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "13pt" }}>
                  {birthDate ? formatDateIT(birthDate) : ""}
                </span>
              </div>
              <div style={{ marginBottom: "0.18cm" }}>
                <span style={{ fontWeight: "bold" }}>LUOGO DI NASCITA:</span>{" "}
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "13pt" }}>
                  {birthPlace || ""}
                </span>
              </div>
              <div style={{ marginBottom: "0.18cm" }}>
                <span style={{ fontWeight: "bold" }}>INDIRIZZO:</span>{" "}
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "13pt" }}>
                  {address && streetNumber ? `${address} ${streetNumber}` : address || ""}
                </span>
              </div>
              <div style={{ marginBottom: "0.18cm" }}>
                <span style={{ fontWeight: "bold" }}>CITTÀ:</span>{" "}
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "13pt" }}>
                  {city && province ? `${city} (${province})` : city || ""}
                </span>
              </div>
              <div style={{ marginBottom: "0.18cm" }}>
                <span style={{ fontWeight: "bold" }}>TELEFONO:</span>{" "}
                <span style={{ fontFamily: "'Special Elite', cursive", fontSize: "13pt" }}>
                  {phone || ""}
                </span>
              </div>
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enteRows, setEnteRows] = useState<Array<{ imageUrl?: string; text?: string }>>([]);
  const [exams, setExams] = useState<Array<{ fromGrade: string; toGrade: string; stars?: number; examDate?: string; place?: string; examiner?: string }>>([]);
  const [grades, setGrades] = useState<string[]>([]);
  
  // Dati anagrafici
  const [userName, setUserName] = useState<string | null>(null);
  const [userSurname, setUserSurname] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [birthPlace, setBirthPlace] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [streetNumber, setStreetNumber] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

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
          const photo = data?.budoPassExtra?.photoUrl ?? null;
          const rows = data?.budoPassExtra?.tableRows ?? [];
          const examsArr = data?.budoPassExtra?.exams ?? [];
          
          // Dati anagrafici
          const name = data?.name ?? null;
          const surname = data?.surname ?? null;
          const birth = data?.birthDate ?? null;
          const birthPl = data?.birthPlace ?? null;
          const addr = data?.address ?? null;
          const street = data?.streetNumber ?? null;
          const cty = data?.city ?? null;
          const prov = data?.province ?? null;
          const ph = data?.phone ?? null;
          
          setBudoPassNumber(num);
          setIssuedAt(issued);
          setFrom(fromVal);
          setScadenza(scadenzaVal);
          setPresidenteSignature(presidenteImg);
          setDirettivoSignature(direttivoImg);
          setPhotoUrl(photo);
          setEnteRows(rows);
          setExams(examsArr);
          
          // Carico elenco gradi da config/karate
          try {
            const karateDoc = await getDoc(doc(db, "config", "karate"));
            const gradesArr = (karateDoc.exists() && Array.isArray(karateDoc.data()?.grades)) ? karateDoc.data()!.grades as string[] : [];
            setGrades(gradesArr);
          } catch (e) {
            setGrades([]);
          }
          
          setUserName(name);
          setUserSurname(surname);
          setBirthDate(birth);
          setBirthPlace(birthPl);
          setAddress(addr);
          setStreetNumber(street);
          setCity(cty);
          setProvince(prov);
          setPhone(ph);
        }
      } catch (e) {
        console.error("Errore lettura BudoPass number:", e);
      }
    };
    load();
  }, [user?.uid]);

  const handlePrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setPageIndex((i) => Math.min(TOTAL_PAGES - 1, i + 1));

  const handlePhotoUpload = async (file: File) => {
    if (!user?.uid) return;
    
    try {
      setUploading(true);
      const storage = getStorage();
      const photoRef = storageRef(storage, `budopass/fototessere/${user.uid}_${Date.now()}.jpg`);
      
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "budoPassExtra.photoUrl": url,
      });
      
      setPhotoUrl(url);
    } catch (error) {
      console.error("Errore caricamento foto:", error);
      alert("Errore durante il caricamento della foto. Riprova.");
    } finally {
      setUploading(false);
    }
  };

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
      <SimplePage 
        pageNum={pageIndex + 1} 
        budoPassNumber={budoPassNumber} 
        issuedAt={issuedAt} 
        from={from} 
        scadenza={scadenza} 
        presidenteSignature={presidenteSignature} 
        direttivoSignature={direttivoSignature}
        photoUrl={photoUrl}
        onPhotoUpload={handlePhotoUpload}
        userName={userName}
        userSurname={userSurname}
        birthDate={birthDate}
        birthPlace={birthPlace}
        address={address}
        streetNumber={streetNumber}
        city={city}
        province={province}
        phone={phone}
        enteRows={enteRows}
        exams={exams}
        grades={grades}
      />

      {uploading && (
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento foto...
        </div>
      )}

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