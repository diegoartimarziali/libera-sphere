import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

export default function UserBannerList({ userId }: { userId?: string }) {
  const [user] = useAuthState(auth);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanners() {
      const effectiveUserId = userId || user?.uid;
      if (!effectiveUserId) return;
      const bannersSnap = await getDocs(collection(db, "users", effectiveUserId, "banners"));
      setBanners(bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }
    fetchBanners();
  }, [userId, user]);

  const handleCloseBanner = async (bannerId: string) => {
    const effectiveUserId = userId || user?.uid;
    if (!effectiveUserId) return;
    await updateDoc(doc(db, "users", effectiveUserId, "banners", bannerId), { read: true });
    setBanners(banners => banners.filter(b => b.id !== bannerId));
  };

  if (loading) return null;
  if (banners.length === 0) return null;

  return (
    <div className="space-y-4 mb-6 flex flex-col items-center">
      {banners.filter(b => !b.read).map(banner => {
        let borderClass = "border-blue-600";
        let bgClass = "bg-blue-50";
        let textClass = "text-blue-700";
        if (banner.color === "red") {
          borderClass = "border-red-600";
          bgClass = "bg-red-50";
          textClass = "text-red-700";
        } else if (banner.color === "green") {
          borderClass = "border-green-600";
          bgClass = "bg-green-50";
          textClass = "text-green-700";
        }
        return (
          <Alert key={banner.id} className={`border-4 ${borderClass} ${bgClass} flex flex-col items-center text-center max-w-md w-full mx-auto`}>
            <AlertTitle className={`font-bold ${textClass} w-full text-center`}>{banner.title}</AlertTitle>
            <AlertDescription className={`${textClass} mt-2 w-full text-center`}>{banner.message}</AlertDescription>
            <div className="flex flex-row justify-center items-center gap-2 mt-4 flex-wrap">
              {Array.isArray(banner.buttons) && banner.buttons.filter((btn: any) => btn.label).map((btn: any, idx: number) => {
                if (btn.type === "link" && btn.url) {
                  return (
                    <Button key={idx} variant="success" onClick={() => {
                      if (btn.url.startsWith("http")) {
                        window.open(btn.url, "_blank");
                      } else {
                        window.location.href = btn.url;
                      }
                    }}>
                      {btn.label}
                    </Button>
                  );
                }
                if (btn.type === "api" && btn.apiEndpoint) {
                  return (
                    <Button key={idx} variant="secondary" onClick={async () => {
                      try {
                        await fetch(btn.apiEndpoint, { method: "POST" });
                        alert("Azione completata!");
                      } catch {
                        alert("Errore nell'azione API.");
                      }
                    }}>
                      {btn.label}
                    </Button>
                  );
                }
                if (btn.type === "custom" && btn.customAction) {
                  return (
                    <Button key={idx} variant="outline" onClick={() => {
                      alert(`Azione custom: ${btn.customAction}`);
                    }}>
                      {btn.label}
                    </Button>
                  );
                }
                return null;
              })}
              <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-100 ml-2" onClick={() => handleCloseBanner(banner.id)} aria-label="Chiudi banner">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}
