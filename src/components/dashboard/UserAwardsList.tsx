import React from 'react';
import { UserAward } from '@/context/UserAwardsContext';
import { useAttendances } from '@/hooks/use-attendances';
import { Progress } from '@/components/ui/progress';
import { calculatePremiPresenzeValue } from '@/lib/premiPresenzeCalculator';

export function UserAwardsList({ awards, onRefresh }: { awards: UserAward[]; onRefresh?: () => void }) {
  const { presentAttendances, totalLessons, percentage, loading: attendancesLoading } = useAttendances();
  if (!awards || awards.length === 0) {
    return <div className="text-center text-muted-foreground">Nessun premio assegnato</div>;
  }
  // Puoi ora chiamare onRefresh() da altri componenti (es. dopo pagamento)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {awards.map(award => (
        <div key={award.awardId} className={`border-4 ${award.name === 'Premio Presenze' ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100' : 'border-yellow-500 bg-white'} rounded-lg p-4 flex flex-col justify-center ${award.used ? 'opacity-60' : ''} shadow-lg ${award.name === 'Premio Presenze' ? 'aspect-[4/5] max-w-[200px] max-h-[250px]' : 'aspect-square max-w-[200px] max-h-[200px]'} w-full`}>
          
          {/* Barra di progresso solo per Premio Presenze */}
          {award.name === 'Premio Presenze' && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-blue-700">Presenze</span>
                <span className="text-xs font-bold text-blue-800">
                  {attendancesLoading ? '...' : `${percentage}%`}
                </span>
              </div>
              
              {/* Barra con colore dinamico basato sulla percentuale */}
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${attendancesLoading ? 'w-0' : ''} ${
                    attendancesLoading ? '' : calculatePremiPresenzeValue(percentage).colorClass
                  }`}
                  style={{ width: `${attendancesLoading ? 0 : percentage}%` }}
                />
              </div>
              
              <div className="text-xs text-blue-600 mt-1 text-center">
                {attendancesLoading ? 'Caricamento...' : `${presentAttendances} / ${totalLessons ?? 'N/D'}`}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center text-center space-y-1">
            <div className="mb-2">
              {award.name === 'Premio Presenze' ? (
                <div className="flex flex-col items-center space-y-1">
                  <div className="text-2xl">🏆</div>
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm border border-blue-300">
                    {award.name}
                  </span>
                  <div className="text-xs text-blue-700 font-medium">
                    Ogni allenamento Vale!
                  </div>
                </div>
              ) : (
                <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-sm border border-green-300">
                  {award.name || 'Premio'}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-700">
              Assegnato il {award.assignedAt ? (typeof award.assignedAt.toDate === 'function' ? award.assignedAt.toDate().toLocaleDateString() : new Date(award.assignedAt).toLocaleDateString()) : 'Data non disponibile'}
            </div>
            <div className="text-xs text-gray-700 font-bold">
              Valore residuo: {
                award.name === 'Premio Presenze' && !attendancesLoading
                  ? calculatePremiPresenzeValue(percentage).value.toFixed(2)
                  : (award.residuo || 0).toFixed(2)
              } €
            </div>
            <div className="text-xs text-gray-700">Valore iniziale: {(award.value || 0).toFixed(2)} €</div>
            <div className={`text-xs ${(award.usedValue || 0) > 0 ? 'text-red-600' : 'text-gray-700'}`}>Totale utilizzato: {(award.usedValue || 0).toFixed(2)} €</div>
            {award.used && <span className="text-red-600 font-bold text-xs">🔴 UTILIZZATO</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
