import React from 'react';
import { UserAward } from '@/context/UserAwardsContext';

export function UserAwardsList({ awards, onRefresh }: { awards: UserAward[]; onRefresh?: () => void }) {
  if (!awards || awards.length === 0) {
    return <div className="text-center text-muted-foreground">Nessun premio assegnato</div>;
  }
  // Puoi ora chiamare onRefresh() da altri componenti (es. dopo pagamento)
  return (
    <div className="space-y-4">
      {awards.map(award => (
        <div key={award.awardId} className={`border rounded-lg p-4 flex items-center gap-4 ${award.used ? 'bg-gray-100' : 'bg-white'} shadow-sm`}>
          <div className="flex-1">
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-base border border-green-300">
                {award.name || 'Premio'}
              </span>
            </div>
            <div className="text-sm font-bold text-green-700">Valore residuo: {(award.residuo || 0).toFixed(2)} €</div>
            <div className="text-sm text-muted-foreground">Valore iniziale: {(award.value || 0).toFixed(2)} €</div>
            <div className="text-sm text-orange-700">Totale utilizzato: {(award.usedValue || 0).toFixed(2)} €</div>
            <div className="text-xs text-muted-foreground">
              Assegnato il {award.assignedAt ? (typeof award.assignedAt.toDate === 'function' ? award.assignedAt.toDate().toLocaleDateString() : new Date(award.assignedAt).toLocaleDateString()) : 'Data non disponibile'}
            </div>
            {award.used && <span className="text-red-600 font-bold ml-2">🔴 UTILIZZATO</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
