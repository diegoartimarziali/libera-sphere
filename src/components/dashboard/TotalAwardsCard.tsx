import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { useUserAwards } from "@/context/UserAwardsContext";

export function TotalAwardsCard() {
  const userAwards = useUserAwards();
  // Calcola il valore totale dei premi assegnati (anche quelli esauriti)
  const totalAssigned = Array.isArray(userAwards)
    ? userAwards.reduce((acc: number, award) => acc + (award.value || 0), 0)
    : 0;

  // Trova la data di assegnamento del primo bonus valida
  let firstBonusDate: string | null = null;
  if (Array.isArray(userAwards) && userAwards.length > 0) {
    const sorted = [...userAwards]
      .filter(a => a.assignedAt)
      .sort((a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime());
    if (sorted.length > 0) {
      const assigned = sorted[0].assignedAt;
      let d;
      if (assigned && typeof assigned === 'object' && typeof assigned.toDate === 'function') {
        d = assigned.toDate(); // Firestore Timestamp
      } else {
        d = new Date(assigned);
      }
      if (!isNaN(d.getTime())) {
        // Formato solo data: gg/mm/aaaa
        firstBonusDate = d.toLocaleDateString('it-IT');
      }
    }
  }

  return (
    <Card className="mb-6 border-green-600" style={{ borderWidth: '3px' }}>
      <CardContent className="flex flex-col items-center justify-center py-4">
        <div className="flex items-center justify-center gap-2 w-full mb-2">
          <Gift className="h-6 w-6 text-green-700" />
          <span className="font-bold text-green-700 text-sm">Premi Assegnati{firstBonusDate ? ` dal ${firstBonusDate}` : ''}</span>
          <span className="font-bold text-green-700 text-2xl">{totalAssigned}€</span>
        </div>
        <div className="text-sm text-muted-foreground text-center leading-tight">
          Valore totale di tutti i premi assegnati (inclusi quelli già usati)
        </div>
      </CardContent>
    </Card>
  );
}
