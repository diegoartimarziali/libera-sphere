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
        const userDoc = await getDoc(doc(db, "users", selectedUserId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setExtra(data.budoPassExtra || {});
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
                Status: {new Date(extra.scadenza) >= new Date() ? 'VALIDO' : 'SCADUTO'}
              </div>
              <div className="text-xs mt-1" style={{
                color: new Date(extra.scadenza) >= new Date() ? '#15803d' : '#dc2626'
              }}>
                {new Date(extra.scadenza) >= new Date() 
                  ? 'Il Budo Pass è attualmente valido' 
                  : 'Il Budo Pass è scaduto'
                }
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

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>Nazionalità:</label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                value={extra.nationality || ""}
                onChange={(e) => setExtra((prev) => ({ ...prev, nationality: e.target.value }))}
                placeholder="Inserisci nazionalità"
                className="flex-1"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => handleSaveField('nationality')} 
                disabled={saving}
                className="px-2"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={() => handleClearField('nationality')} 
                disabled={saving}
                className="px-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sezione Tabella "Ente di Appartenenza" */}
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--my-marscuro))" }}>
              Tabella "Ente di Appartenenza" (6 righe con logo ente e stagione)
            </h3>
            {[...Array(6)].map((_, rowIndex) => {
              const rowData = extra.tableRows?.[rowIndex] || {};
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
                          const newTableRows = [...(extra.tableRows || Array(6).fill({}))];
                          newTableRows[rowIndex] = { ...newTableRows[rowIndex], imageUrl: e.target.value };
                          setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                        }}
                        placeholder="https://esempio.com/logo-ente.png"
                        className="text-xs h-7"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--my-marscuro))" }}>
                        testo inserito da admin:
                      </label>
                      <Input
                        value={rowData.text || ""}
                        onChange={(e) => {
                          const newTableRows = [...(extra.tableRows || Array(6).fill({}))];
                          newTableRows[rowIndex] = { ...newTableRows[rowIndex], text: e.target.value };
                          setExtra((prev) => ({ ...prev, tableRows: newTableRows }));
                        }}
                        placeholder="Inserisci testo per questa riga..."
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
                            const newTableRows = [...(extra.tableRows || Array(12).fill({}))];
                            newTableRows[rowIndex] = {};
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
        </div>
      )}
    </div>
  );
}
