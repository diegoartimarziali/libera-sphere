import React from 'react';
import { UserAward } from '@/context/UserAwardsContext';

export function UserAwardsList({ awards, onRefresh }: { awards: UserAward[]; onRefresh?: () => void }) {
  if (!awards || awards.length === 0) {
    return <div className="text-center text-muted-foreground">Nessun premio assegnato</div>;
  }
  // Puoi ora chiamare onRefresh() da altri componenti (es. dopo pagamento)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {awards.map(award => (
        <div key={award.awardId} className={`border-4 border-yellow-500 rounded-lg p-4 flex flex-col justify-center ${award.used ? 'bg-gray-100' : 'bg-white'} shadow-lg aspect-square max-w-[200px] max-h-[200px] w-full`}>
          <div className="flex-1 flex flex-col justify-center text-center space-y-1">
            <div className="mb-2">
              <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-sm border border-green-300">
                {award.name || 'Premio'}
              </span>
            </div>
            <div className="text-xs text-gray-700">
              Assegnato il {award.assignedAt ? (typeof award.assignedAt.toDate === 'function' ? award.assignedAt.toDate().toLocaleDateString() : new Date(award.assignedAt).toLocaleDateString()) : 'Data non disponibile'}
            </div>
            <div className="text-xs text-gray-700 font-bold">Valore residuo: {(award.residuo || 0).toFixed(2)} €</div>
            <div className="text-xs text-gray-700">Valore iniziale: {(award.value || 0).toFixed(2)} €</div>
            <div className={`text-xs ${(award.usedValue || 0) > 0 ? 'text-red-600' : 'text-gray-700'}`}>Totale utilizzato: {(award.usedValue || 0).toFixed(2)} €</div>
            {award.used && <span className="text-red-600 font-bold text-xs">🔴 UTILIZZATO</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
