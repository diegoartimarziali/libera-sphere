"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";

interface BudoPassExtra {
  budoPassNumber?: string;
  issuedAt?: string;
  from?: string;
  scadenza?: string;
  maestroName?: string;
  direttivoName?: string;
  nationality?: string;
  // Dati tabella "Ente di Appartenenza" (12 righe)
  tableRows?: Array<{
    imageUrl?: string;
    text?: string;
  }>;
  // Esami: storico progressioni di grado
  exams?: Array<{
    fromGrade: string;
    toGrade: string;
    stars?: number; // 1..5
    examDate?: string; // ISO date
    place?: string;
    examiner?: string;
  }>;
  // Qualifiche (5 righe)
  qualifications?: Array<{
    tipo?: string;
    ente?: string;
    data?: string; // ISO date
    esaminatore?: string;
  }>;
}

interface User {
  id: string;
  name: string;
  surname: string;
  associationStatus?: string;
}

interface Props {
  userId?: string;
}

export default function BudoPassExtraAdmin({ userId: initialUserId }: Props) {
  const [extra, setExtra] = useState<BudoPassExtra>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || "");
  const [lastGrade, setLastGrade] = useState<string>("");
  const [grades, setGrades] = useState<string[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const usersQuery = query(
          collection(db, "users"),
          where("associationStatus", "==", "active")
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "",
          surname: doc.data().surname || "",
          associationStatus: doc.data().associationStatus
        }));
        setUsers(usersList.sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`)));
      } catch (err) {
        setError("Errore nel caricamento utenti.");
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchExtra() {
      if (!selectedUserId) {
        setExtra({});
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const userRef = doc(db, "users", selectedUserId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setExtra(data.budoPassExtra || {});
          setLastGrade((data.lastGrade as string) || "");
        }
        // Carico elenco gradi da config/karate (campo 'grades' come array di stringhe)
        try {
          const karateDoc = await getDoc(doc(db, "config", "karate"));
          const arr = (karateDoc.exists() && Array.isArray(karateDoc.data()?.grades)) ? karateDoc.data()!.grades as string[] : [];
          setGrades(arr);
        } catch (e) {
          // fallback: se non disponibile, lascio vuoto
          setGrades([]);
        }
      } catch (err) {
        setError("Errore nel caricamento dati.");
      } finally {
        setLoading(false);
      }
    }
    fetchExtra();
  }, [selectedUserId]);

  async function handleSaveField(fieldName: keyof BudoPassExtra) {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      const fieldValue = extra[fieldName];
      await updateDoc(doc(db, "users", selectedUserId), {
        [`budoPassExtra.${fieldName}`]: fieldValue,
      });
    } catch (err) {
      setError("Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearField(fieldName: keyof BudoPassExtra) {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", selectedUserId), {
        [`budoPassExtra.${fieldName}`]: null,
      });
      setExtra((prev) => {
        const newExtra = { ...prev };
        delete newExtra[fieldName];
        return newExtra;
      });
    } catch (err) {
      setError("Errore nella cancellazione.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && selectedUserId) return <div>Caricamento dati...</div>;

  return (
    <div className="space-y-6 p-4 border rounded bg-white" style={{ color: "hsl(var(--my-marscuro))" }}>
      <h2 className="text-lg font-bold mb-2" style={{ color: "hsl(var(--my-marscuro))" }}>Dati extra Budo Pass</h2>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Seleziona Socio</label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="bg-transparent border-black text-black">
            <SelectValue placeholder="Scegli un socio..." />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.surname} {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedUserId && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Budo Pass N°</label>
            <div className="flex gap-1 items-center">
              <Input
                type="number"
                value={extra.budoPassNumber || ""}
                onChange={(e) => setExtra((prev) => ({ ...prev, budoPassNumber: e.target.value }))}
                placeholder="Inserisci numero"
                className="flex-1 text-xs h-7"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => handleSaveField('budoPassNumber')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={() => handleClearField('budoPassNumber')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Rilasciato il:</label>
            <div className="flex gap-1 items-center">
              <Input
                type="date"
                value={extra.issuedAt || ""}
                onChange={(e) => setExtra((prev) => ({ ...prev, issuedAt: e.target.value }))}
                className="flex-1 text-xs h-7"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => handleSaveField('issuedAt')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={() => handleClearField('issuedAt')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Da:</label>
            <div className="flex gap-1 items-center">
              <Input
                type="text"
                value={extra.from || ""}
                onChange={(e) => setExtra((prev) => ({ ...prev, from: e.target.value }))}
                placeholder="Inserisci testo"
                className="flex-1 text-xs h-7"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => handleSaveField('from')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={() => handleClearField('from')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Scadenza:</label>
            <div className="flex gap-1 items-center">
              <Input
                type="date"
                value={extra.scadenza || ""}
                onChange={(e) => setExtra((prev) => ({ ...prev, scadenza: e.target.value }))}
                className="flex-1 text-xs h-7"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => handleSaveField('scadenza')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={() => handleClearField('scadenza')} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {extra.scadenza && (
            <div className="p-3 rounded border" style={{
              backgroundColor: new Date(extra.scadenza) >= new Date() ? '#dcfce7' : '#fee2e2',
              borderColor: new Date(extra.scadenza) >= new Date() ? '#22c55e' : '#ef4444'
            }}>
              <div className="text-sm font-medium" style={{
                color: new Date(extra.scadenza) >= new Date() ? '#15803d' : '#dc2626'
              }}>
                {new Date(extra.scadenza) >= new Date() ? 'VALIDO' : 'SCADUTO'}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Il Presidente:</label>
            <div className="flex gap-1 items-center">
              <Input
                type="text"
                value={extra.tableRows?.[0]?.imageUrl || ""}
                onChange={(e) => {
                  const newTableRows = [...(extra.tableRows || [])];
                  if (!newTableRows[0]) newTableRows[0] = {};
                  newTableRows[0].imageUrl = e.target.value;
                  setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                }}
                placeholder="URL firma Presidente (PNG trasparente)"
                className="flex-1 text-xs h-7"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={async () => {
                  if (!selectedUserId) return;
                  setSaving(true);
                  try {
                    await updateDoc(doc(db, "users", selectedUserId), {
                      "budoPassExtra.tableRows": extra.tableRows || []
                    });
                  } catch (err) {
                    setError("Errore nel salvataggio.");
                  } finally {
                    setSaving(false);
                  }
                }} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={async () => {
                  if (!selectedUserId) return;
                  setSaving(true);
                  try {
                    const newTableRows = [...(extra.tableRows || [])];
                    if (newTableRows[0]) {
                      newTableRows[0].imageUrl = "";
                    }
                    await updateDoc(doc(db, "users", selectedUserId), {
                      "budoPassExtra.tableRows": newTableRows
                    });
                    setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                  } catch (err) {
                    setError("Errore nella cancellazione.");
                  } finally {
                    setSaving(false);
                  }
                }} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Per il Direttivo:</label>
            <div className="flex gap-1 items-center">
              <Input
                type="text"
                value={extra.tableRows?.[1]?.imageUrl || ""}
                onChange={(e) => {
                  const newTableRows = [...(extra.tableRows || [])];
                  if (!newTableRows[1]) newTableRows[1] = {};
                  newTableRows[1].imageUrl = e.target.value;
                  setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                }}
                placeholder="URL firma Direttivo (PNG trasparente)"
                className="flex-1 text-xs h-7"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={async () => {
                  if (!selectedUserId) return;
                  setSaving(true);
                  try {
                    await updateDoc(doc(db, "users", selectedUserId), {
                      "budoPassExtra.tableRows": extra.tableRows || []
                    });
                  } catch (err) {
                    setError("Errore nel salvataggio.");
                  } finally {
                    setSaving(false);
                  }
                }} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={async () => {
                  if (!selectedUserId) return;
                  setSaving(true);
                  try {
                    const newTableRows = [...(extra.tableRows || [])];
                    if (newTableRows[1]) {
                      newTableRows[1].imageUrl = "";
                    }
                    await updateDoc(doc(db, "users", selectedUserId), {
                      "budoPassExtra.tableRows": newTableRows
                    });
                    setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                  } catch (err) {
                    setError("Errore nella cancellazione.");
                  } finally {
                    setSaving(false);
                  }
                }} 
                disabled={saving}
                className="px-1 h-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Sezione Tabella "Ente di Appartenenza" */}
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--my-marscuro))" }}>
              Tabella "Ente di Appartenenza" (6 righe con logo ente e stagione)
            </h3>
            {[...Array(6)].map((_, rowIndex) => {
              const actualIndex = rowIndex + 2; // Salta indici 0 e 1 (firme)
              const rowData = extra.tableRows?.[actualIndex] || {};
              return (
                <div key={rowIndex} className="border rounded p-2 bg-transparent">
                  <h4 className="text-xs font-medium mb-2" style={{ color: "hsl(var(--my-marscuro))" }}>
                    Riga {rowIndex + 1}
                  </h4>
                  
                  {/* URL Immagine e Testo affiancati */}
                  <div className="flex gap-1 items-start mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>
                        URL Logo Ente inserito da admin:
                      </label>
                      <Input
                        type="url"
                        value={rowData.imageUrl || ""}
                        onChange={(e) => {
                          const newTableRows = [...(extra.tableRows || Array(8).fill({}))];
                          newTableRows[actualIndex] = { ...newTableRows[actualIndex], imageUrl: e.target.value };
                          setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                        }}
                        placeholder="https://esempio.com/logo-ente.png"
                        className="text-xs h-7"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>
                        Stagione:
                      </label>
                      <Input
                        value={rowData.text || ""}
                        onChange={(e) => {
                          const newTableRows = [...(extra.tableRows || Array(8).fill({}))];
                          newTableRows[actualIndex] = { ...newTableRows[actualIndex], text: e.target.value };
                          setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                        }}
                        placeholder="Inserisci stagione per questa riga..."
                        className="text-xs h-7"
                      />
                    </div>
                    
                    {/* Pulsanti per l'intera riga */}
                    <div className="flex gap-1 mt-5">
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={async () => {
                          if (!selectedUserId) return;
                          setSaving(true);
                          try {
                            await updateDoc(doc(db, "users", selectedUserId), {
                              "budoPassExtra.tableRows": extra.tableRows || []
                            });
                          } catch (err) {
                            setError("Errore nel salvataggio tabella.");
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="px-1 h-7"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="destructive" 
                        onClick={async () => {
                          if (!selectedUserId) return;
                          setSaving(true);
                          try {
                            const newTableRows = [...(extra.tableRows || Array(8).fill({}))];
                            newTableRows[actualIndex] = {};
                            await updateDoc(doc(db, "users", selectedUserId), {
                              "budoPassExtra.tableRows": newTableRows
                            });
                            setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                          } catch (err) {
                            setError("Errore nella cancellazione riga.");
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="px-1 h-7"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Preview immagine */}
                  {rowData.imageUrl && (
                    <div className="mt-1">
                      <img 
                        src={rowData.imageUrl} 
                        alt={`Riga ${rowIndex + 1}`}
                        className="max-w-16 max-h-6 object-contain border rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sezione Tabella ESAMI */}
          <div className="mt-10 space-y-3">
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--my-marscuro))" }}>
              Tabella "ESAMI"
            </h3>
            {/* Grado attuale come indicatore */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Grado attuale (solo indicazione)</label>
              <Input value={lastGrade} readOnly className="text-xs h-7 bg-gray-50 border-black/50" />
            </div>

            {/* 15 righe fisse: progressioni da grades[i] a grades[i+1] */}
            <div className="space-y-2">
              {Array.from({ length: 14 }, (_, idx) => {
                const fromGrade = grades[idx] || "";
                const toGrade = grades[idx + 1] || "";
                // Cerca nell'array exams un match con fromGrade e toGrade
                const existingExam = (extra.exams || []).find(
                  (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                );
                const stars = existingExam?.stars ?? 0;
                const examDate = existingExam?.examDate || "";
                const place = existingExam?.place || "";
                const examiner = existingExam?.examiner || "";

                return (
                  <div key={idx} className="border rounded p-2">
                    <div className="text-xs font-medium mb-2" style={{ color: "hsl(var(--my-marscuro))" }}>
                      Progressi da: <span className="font-bold">{fromGrade}</span> a: <span className="font-bold">{toGrade}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Stelle (1-5)</label>
                        <Input
                          type="number" min={0} max={5}
                          value={stars}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(5, Number(e.target.value || 0)));
                            setExtra((prev) => {
                              let newEx = [...(prev.exams || [])];
                              const foundIdx = newEx.findIndex(
                                (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                              );
                              if (foundIdx >= 0) {
                                newEx[foundIdx] = { ...newEx[foundIdx], stars: val };
                              } else {
                                newEx.push({ fromGrade, toGrade, stars: val, examDate: "", place: "", examiner: "" });
                              }
                              return { ...prev, exams: newEx };
                            });
                          }}
                          className="text-xs h-7"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Data esame</label>
                        <Input
                          type="date"
                          value={examDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtra((prev) => {
                              let newEx = [...(prev.exams || [])];
                              const foundIdx = newEx.findIndex(
                                (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                              );
                              if (foundIdx >= 0) {
                                newEx[foundIdx] = { ...newEx[foundIdx], examDate: val };
                              } else {
                                newEx.push({ fromGrade, toGrade, stars: 0, examDate: val, place: "", examiner: "" });
                              }
                              return { ...prev, exams: newEx };
                            });
                          }}
                          className="text-xs h-7"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Luogo</label>
                        <Input
                          value={place}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtra((prev) => {
                              let newEx = [...(prev.exams || [])];
                              const foundIdx = newEx.findIndex(
                                (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                              );
                              if (foundIdx >= 0) {
                                newEx[foundIdx] = { ...newEx[foundIdx], place: val };
                              } else {
                                newEx.push({ fromGrade, toGrade, stars: 0, examDate: "", place: val, examiner: "" });
                              }
                              return { ...prev, exams: newEx };
                            });
                          }}
                          className="text-xs h-7"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Esaminatore</label>
                        <Input
                          value={examiner}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtra((prev) => {
                              let newEx = [...(prev.exams || [])];
                              const foundIdx = newEx.findIndex(
                                (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                              );
                              if (foundIdx >= 0) {
                                newEx[foundIdx] = { ...newEx[foundIdx], examiner: val };
                              } else {
                                newEx.push({ fromGrade, toGrade, stars: 0, examDate: "", place: "", examiner: val });
                              }
                              return { ...prev, exams: newEx };
                            });
                          }}
                          className="text-xs h-7"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        className="px-2 h-7"
                        onClick={async () => {
                          if (!selectedUserId) return;
                          setSaving(true);
                          setError(null);
                          try {
                            await updateDoc(doc(db, "users", selectedUserId), {
                              "budoPassExtra.exams": extra.exams || [],
                            });
                          } catch (e) {
                            setError("Errore nel salvataggio esame.");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Salva riga
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={saving}
                        className="px-2 h-7"
                        onClick={async () => {
                          if (!selectedUserId) return;
                          setSaving(true);
                          setError(null);
                          try {
                            let newEx = [...(extra.exams || [])];
                            const foundIdx = newEx.findIndex(
                              (ex) => ex.fromGrade === fromGrade && ex.toGrade === toGrade
                            );
                            if (foundIdx >= 0) {
                              newEx.splice(foundIdx, 1);
                            }
                            await updateDoc(doc(db, "users", selectedUserId), {
                              "budoPassExtra.exams": newEx,
                            });
                            setExtra((prev) => ({ ...prev, exams: newEx }));
                          } catch (e) {
                            setError("Errore nella cancellazione esame.");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Elimina riga
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sezione Tabella QUALIFICHE */}
          <div className="mt-10 space-y-3">
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--my-marscuro))" }}>
              Tabella "QUALIFICHE" (5 righe)
            </h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, idx) => {
                const qual = (extra.qualifications || [])[idx] || {};
                return (
                  <div key={idx} className="border rounded p-3 bg-gray-50">
                    <div className="text-sm font-medium mb-2">Riga {idx + 1}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Tipo */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Tipo</label>
                        <Input
                          value={qual.tipo || ""}
                          onChange={(e) => {
                            const newQual = [...(extra.qualifications || [])];
                            if (!newQual[idx]) newQual[idx] = {};
                            newQual[idx].tipo = e.target.value;
                            setExtra((prev) => ({ ...prev, qualifications: newQual }));
                          }}
                          placeholder="Es. Arbitro"
                        />
                      </div>
                      {/* Ente */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Ente</label>
                        <Input
                          value={qual.ente || ""}
                          onChange={(e) => {
                            const newQual = [...(extra.qualifications || [])];
                            if (!newQual[idx]) newQual[idx] = {};
                            newQual[idx].ente = e.target.value;
                            setExtra((prev) => ({ ...prev, qualifications: newQual }));
                          }}
                          placeholder="Es. FIJLKAM"
                        />
                      </div>
                      {/* Data */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Data</label>
                        <Input
                          type="date"
                          value={qual.data || ""}
                          onChange={(e) => {
                            const newQual = [...(extra.qualifications || [])];
                            if (!newQual[idx]) newQual[idx] = {};
                            newQual[idx].data = e.target.value;
                            setExtra((prev) => ({ ...prev, qualifications: newQual }));
                          }}
                        />
                      </div>
                      {/* Esaminatore */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Esaminatore</label>
                        <Input
                          value={qual.esaminatore || ""}
                          onChange={(e) => {
                            const newQual = [...(extra.qualifications || [])];
                            if (!newQual[idx]) newQual[idx] = {};
                            newQual[idx].esaminatore = e.target.value;
                            setExtra((prev) => ({ ...prev, qualifications: newQual }));
                          }}
                          placeholder="Es. M° Rossi"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        className="px-2 h-7"
                        onClick={async () => {
                          if (!selectedUserId) return;
                          setSaving(true);
                          setError(null);
                          try {
                            await updateDoc(doc(db, "users", selectedUserId), {
                              "budoPassExtra.qualifications": extra.qualifications || [],
                            });
                          } catch (e) {
                            setError("Errore nel salvataggio qualifica.");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Salva riga
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={saving}
                        className="px-2 h-7"
                        onClick={async () => {
                          if (!selectedUserId) return;
                          setSaving(true);
                          setError(null);
                          try {
                            let newQual = [...(extra.qualifications || [])];
                            newQual[idx] = {};
                            await updateDoc(doc(db, "users", selectedUserId), {
                              "budoPassExtra.qualifications": newQual,
                            });
                            setExtra((prev) => ({ ...prev, qualifications: newQual }));
                          } catch (e) {
                            setError("Errore nella cancellazione qualifica.");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Elimina riga
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
