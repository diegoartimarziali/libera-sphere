import React from 'react';
import { UserAward } from '@/context/UserAwardsContext';
import { useAttendances } from '@/hooks/use-attendances';
import { Progress } from '@/components/ui/progress';
import { calculatePremiPresenzeValue } from '@/lib/premiPresenzeCalculator';

export function UserAwardsList({ awards, onRefresh, userId }: { awards: UserAward[]; onRefresh?: () => void; userId?: string }) {
  const { presentAttendances, totalLessons, percentage, loading: attendancesLoading } = useAttendances(userId);
  if (!awards || awards.length === 0) {
    return <div className="text-center text-muted-foreground">Nessun premio assegnato</div>;
  }
  // Puoi ora chiamare onRefresh() da altri componenti (es. dopo pagamento)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {awards.map(award => (
        <div key={award.awardId} className={`border-2 md:border-4 ${award.name === 'Premio Presenze' ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100' : 'border-yellow-500 bg-white'} rounded-lg p-3 md:p-4 flex flex-col justify-center ${award.used ? 'opacity-60' : ''} shadow-lg ${award.name === 'Premio Presenze' ? 'min-h-[280px] sm:min-h-[300px]' : 'min-h-[220px] sm:min-h-[240px]'} w-full transition-transform hover:scale-105`}>
          
          {/* Barra di progresso solo per Premio Presenze */}
          {award.name === 'Premio Presenze' && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs md:text-sm font-medium text-blue-700">Presenze</span>
                <span className="text-sm md:text-base font-bold text-blue-800">
                  {attendancesLoading ? '...' : `${percentage}%`}
                </span>
              </div>
              
              {/* Barra con colore dinamico basato sulla percentuale */}
              <div className="relative w-full h-3 md:h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${attendancesLoading ? 'w-0' : ''} ${
                    attendancesLoading ? '' : calculatePremiPresenzeValue(percentage).colorClass
                  }`}
                  style={{ width: `${attendancesLoading ? 0 : percentage}%` }}
                />
              </div>
              
              <div className="text-xs md:text-sm text-blue-600 mt-1 text-center font-medium">
                {attendancesLoading ? 'Caricamento...' : `${presentAttendances} / ${totalLessons ?? 'N/D'}`}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center text-center space-y-2">
            <div className="mb-2">
              {award.name === 'Premio Presenze' ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-3xl md:text-2xl">🏆</div>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm md:text-xs border border-blue-300">
                    {award.name}
                  </span>
                  <div className="text-xs md:text-xs text-blue-700 font-medium">
                    Ogni allenamento Vale!
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-3xl md:text-2xl">🎁</div>
                  <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-sm md:text-xs border border-green-300">
                    {award.name || 'Premio'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Informazioni principali */}
            <div className="space-y-1">
              <div className="text-lg md:text-base font-bold text-gray-900">
                {
                  award.name === 'Premio Presenze' && !attendancesLoading
                    ? calculatePremiPresenzeValue(percentage).value.toFixed(2)
                    : (award.residuo || 0).toFixed(2)
                } €
              </div>
              <div className="text-xs text-gray-500">Valore disponibile</div>
            </div>
            
            {/* Dettagli aggiuntivi */}
            <div className="space-y-1 text-xs text-gray-600">
              <div>Valore iniziale: {(award.value || 0).toFixed(2)} €</div>
              <div className={`${(award.usedValue || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                Utilizzato: {(award.usedValue || 0).toFixed(2)} €
              </div>
              <div className="text-xs text-gray-500">
                {award.assignedAt ? (typeof award.assignedAt.toDate === 'function' ? award.assignedAt.toDate().toLocaleDateString('it-IT') : new Date(award.assignedAt).toLocaleDateString('it-IT')) : 'Data non disponibile'}
              </div>
            </div>
            
            {award.used && (
              <div className="mt-2">
                <span className="inline-block px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs border border-red-300">
                  ❌ UTILIZZATO
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
