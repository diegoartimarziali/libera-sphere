import { calculatePremiPresenzeValue } from './premiPresenzeCalculator';

export function calculateAssignedAwardResiduo(assignedAward: any, percentage: number): number {
  if (assignedAward.name === 'Premio Presenze') {
    const dynamicValue = calculatePremiPresenzeValue(percentage).value;
    const usedValue = assignedAward.usedValue || 0;
    return Math.max(0, dynamicValue - usedValue);
  } else {
    return assignedAward.residuo ?? assignedAward.value;
  }
}
