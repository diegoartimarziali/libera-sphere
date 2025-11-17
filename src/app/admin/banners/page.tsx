"use client";
import { useState, useEffect } from "react";
type BannerButton = {
  label: string;
  type: "link" | "api" | "custom";
  url?: string;
  apiEndpoint?: string;
  customAction?: string;
};

type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
};
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { doc as docUser, getDoc } from "firebase/firestore";
import { isSuperAdmin } from "@/lib/permissions";
type UserData = {
  name: string;
  email: string;
  role?: 'admin' | 'superAdmin' | 'user';
  regulationsAccepted: boolean;
  applicationSubmitted: boolean;
  medicalCertificateSubmitted: boolean;
  isFormerMember: 'yes' | 'no';
  [key: string]: any;
};

export default function AdminBannerSender() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState<BannerButton[]>([
    { label: "", type: "link", url: "" }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [color, setColor] = useState("blue");
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User));
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        const docRef = docUser(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
    }
    fetchUserData();
  }, [user]);

  if (loading || !userData) {
    return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
  }
  if (!isSuperAdmin(userData)) {
    return <div className="flex items-center justify-center min-h-screen">Accesso negato. Solo i SuperAdmin possono accedere a questa sezione.</div>;
  }

  const handleSendBanner = async () => {
    setIsSending(true);
    for (const userId of selectedUserIds) {
      const bannerRef = doc(db, "users", userId, "banners", Date.now().toString());
      await setDoc(bannerRef, {
        title,
        message,
        buttons: buttons.filter(b => b.label),
        color,
        sentAt: new Date().toISOString(),
        read: false
      });
    }
    setIsSending(false);
    setTitle("");
    setMessage("");
    setButtons([{ label: "", type: "link", url: "" }]);
    setSelectedUserIds([]);
    setColor("blue");
    alert("Banner inviato agli utenti selezionati!");
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8 bg-white border border-gray-200 shadow-sm">
      <CardHeader className="bg-gray-50 border-b border-gray-200 rounded-t">
        <CardTitle className="text-2xl font-bold text-blue-700">Invia Banner Personalizzato agli Utenti</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <label className="font-semibold text-gray-700 mb-1 block">Titolo Banner</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo" className="bg-white border border-gray-300 text-gray-900" />
        </div>
        <div className="mb-6">
          <label className="font-semibold text-gray-700 mb-1 block">Messaggio</label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Testo del messaggio" className="bg-white border border-gray-300 text-gray-900" />
        </div>
        <div className="mb-6">
          <label className="font-semibold text-gray-700 mb-1 block">Colore Banner</label>
          <div className="flex gap-2 mt-2">
            <Button type="button" className={`border-2 ${color === 'blue' ? 'border-blue-600' : 'border-gray-200'} bg-blue-50 text-blue-700`} onClick={() => setColor('blue')}>Blu</Button>
            <Button type="button" className={`border-2 ${color === 'red' ? 'border-red-600' : 'border-gray-200'} bg-red-50 text-red-700`} onClick={() => setColor('red')}>Rosso</Button>
            <Button type="button" className={`border-2 ${color === 'green' ? 'border-green-600' : 'border-gray-200'} bg-green-50 text-green-700`} onClick={() => setColor('green')}>Verde</Button>
          </div>
        </div>
        <div className="mb-6">
          <label className="font-semibold text-gray-700 mb-2 block">Pulsanti Banner</label>
          {buttons.map((btn, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 items-center bg-gray-50 p-2 rounded border border-gray-200">
              <Input
                value={btn.label}
                onChange={e => {
                  const newBtns = [...buttons];
                  newBtns[idx].label = e.target.value;
                  setButtons(newBtns);
                }}
                placeholder="Etichetta"
                className="w-32 bg-white border border-gray-300 text-gray-900"
              />
              <select
                value={btn.type}
                onChange={e => {
                  const newBtns = [...buttons];
                  newBtns[idx].type = e.target.value as "link" | "api" | "custom";
                  setButtons(newBtns);
                }}
                className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
              >
                <option value="link">Link</option>
                <option value="api">API</option>
                <option value="custom">Custom</option>
              </select>
              {btn.type === "link" && (
                <Input
                  value={btn.url || ""}
                  onChange={e => {
                    const newBtns = [...buttons];
                    newBtns[idx].url = e.target.value;
                    setButtons(newBtns);
                  }}
                  placeholder="https://..."
                  className="w-48 bg-white border border-gray-300 text-gray-900"
                />
              )}
              {btn.type === "api" && (
                <Input
                  value={btn.apiEndpoint || ""}
                  onChange={e => {
                    const newBtns = [...buttons];
                    newBtns[idx].apiEndpoint = e.target.value;
                    setButtons(newBtns);
                  }}
                  placeholder="/api/endpoint"
                  className="w-48 bg-white border border-gray-300 text-gray-900"
                />
              )}
              {btn.type === "custom" && (
                <Input
                  value={btn.customAction || ""}
                  onChange={e => {
                    const newBtns = [...buttons];
                    newBtns[idx].customAction = e.target.value;
                    setButtons(newBtns);
                  }}
                  placeholder="Azione custom"
                  className="w-48 bg-white border border-gray-300 text-gray-900"
                />
              )}
              <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setButtons(btns => btns.filter((_, i) => i !== idx))} disabled={buttons.length === 1}>Rimuovi</Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" className="mt-2 bg-blue-100 text-blue-700 border-blue-200" onClick={() => setButtons(btns => [...btns, { label: "", type: "link", url: "" }])}>Aggiungi Pulsante</Button>
        </div>
        <div className="mb-6">
          <label className="font-semibold text-gray-700 mb-2 block">Seleziona Utenti</label>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-2 mb-1">
                <Checkbox checked={selectedUserIds.includes(user.id)} onCheckedChange={checked => {
                  setSelectedUserIds(ids => checked ? [...ids, user.id] : ids.filter(id => id !== user.id));
                }} />
                <span className="text-gray-900 font-medium">{user.name} {user.surname} <span className="text-gray-500">({user.email})</span></span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 border-t border-gray-200 rounded-b">
        <Button onClick={handleSendBanner} disabled={isSending || !title || !message || selectedUserIds.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow">
          {isSending ? "Invio..." : "Invia Banner"}
        </Button>
      </CardFooter>
    </Card>
  );
}
