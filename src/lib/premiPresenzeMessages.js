/**
 * Mostra un messaggio di successo per l'assegnazione del Premio Presenze
 * Questa funzione deve essere chiamata lato client dopo l'assegnazione del premio
 * @param {number} premioValue - Valore del premio assegnato
 * @param {'monthly'|'seasonal'} subscriptionType - Tipo di abbonamento
 * @param {function} toastFunction - Funzione toast da utilizzare
 */
export function showPremiPresenzeMessage(premioValue, subscriptionType, toastFunction) {
    if (!toastFunction) {
        console.warn('Toast function not available');
        return;
    }

    const typeText = subscriptionType === 'monthly' ? 'mensile' : 'stagionale';
    
    toastFunction({
        variant: "success",
        title: "🎉 Premio Presenze Ricevuto!",
        description: "Complimenti! Hai ricevuto il tuo contenitore Presenze. Ogni TUA presenza alle lezioni farà crescere il valore del premio!"
    });
}

/**
 * Mostra un messaggio di errore quando il Premio Presenze non è configurato
 * @param {function} toastFunction - Funzione toast da utilizzare
 */
export function showPremiPresenzeErrorMessage(toastFunction) {
    if (!toastFunction) {
        console.warn('Toast function not available');
        return;
    }

    toastFunction({
        variant: "destructive",
        title: "Premio Presenze non configurato",
        description: "Il premio non è disponibile al momento. Contatta l'amministratore."
    });
}

