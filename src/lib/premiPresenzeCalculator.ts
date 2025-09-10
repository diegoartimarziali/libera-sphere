interface PremiPresenzeData {
  value: number;
  color: 'red' | 'orange' | 'green' | 'gold';
  colorClass: string;
}

/**
 * Calcola il valore del Premio Presenze e il colore della barra basato sulla percentuale di presenze
 */
export function calculatePremiPresenzeValue(percentage: number): PremiPresenzeData {
  let value = 0;
  let color: 'red' | 'orange' | 'green' | 'gold' = 'red';
  let colorClass = '';

  // Determina valore e colore basato sulla percentuale
  if (percentage >= 0 && percentage < 5) {
    value = 0.50;
    color = 'red';
  } else if (percentage >= 5 && percentage < 10) {
    value = 1;
    color = 'red';
  } else if (percentage >= 10 && percentage < 20) {
    value = 3;
    color = 'red';
  } else if (percentage >= 20 && percentage < 30) {
    value = 3; // Mantiene il valore precedente
    color = 'red';
  } else if (percentage >= 30 && percentage < 40) {
    value = 4;
    color = 'orange';
  } else if (percentage >= 40 && percentage < 50) {
    value = 5;
    color = 'orange';
  } else if (percentage >= 50 && percentage < 60) {
    value = 6;
    color = 'orange';
  } else if (percentage >= 60 && percentage < 70) {
    value = 7;
    color = 'orange';
  } else if (percentage >= 70 && percentage < 80) {
    value = 8;
    color = 'orange';
  } else if (percentage >= 80 && percentage < 90) {
    value = 10;
    color = 'green';
  } else if (percentage >= 90 && percentage < 95) {
    value = 15;
    color = 'green';
  } else if (percentage >= 95 && percentage <= 100) {
    value = 20;
    color = 'gold';
  }

  // Determina le classi CSS per il colore
  switch (color) {
    case 'red':
      colorClass = 'bg-red-500';
      break;
    case 'orange':
      colorClass = 'bg-orange-500';
      break;
    case 'green':
      colorClass = 'bg-green-500';
      break;
    case 'gold':
      colorClass = 'bg-yellow-500';
      break;
  }

  return {
    value,
    color,
    colorClass
  };
}