import { testSimulatoUserAward } from './testUserAward';

// Sostituisci con userId e awardId reali per il test
const userId = 'VV6v351t4kXnr2GqkBE1XvPo3b93';
const awardId = '0TjVloMFkbwa0h5P2Qby';
const importo = 50; // Importo da scalare

(async () => {
  try {
    const risultato = await testSimulatoUserAward(userId, awardId, importo);
    console.log('Premio dopo utilizzo:', risultato);
  } catch (error) {
    console.error('Errore nel test simulato:', error);
  }
})();
