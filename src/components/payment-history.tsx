
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface Subscription {
  id: string;
  planName: string;
  price: string;
  paymentMethod: string;
  subscriptionDate: Timestamp | null;
  status: 'Pagato' | 'In attesa';
}

const translatePaymentMethod = (method: string) => {
    switch (method) {
        case 'cash': return 'Contanti o Bancomat in Palestra ( 2 euro costi di gestione)';
        case 'online': return 'Carta di Credito on line';
        case 'bank': return 'Bonifico Bancario';
        default: return method;
    }
}

export function PaymentHistory() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    setError(null);
    const userEmail = localStorage.getItem('registrationEmail');
    if (!userEmail) {
      setError("Utente non autenticato. Impossibile caricare lo storico dei pagamenti.");
      setIsLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "subscriptions"), 
        where("userEmail", "==", userEmail),
        orderBy("subscriptionDate", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const subsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              planName: data.planName,
              price: data.price,
              paymentMethod: data.paymentMethod,
              subscriptionDate: data.subscriptionDate || null,
              status: data.status || 'In attesa', // Default to 'In attesa' if status is not set
          } as Subscription;
      });

      setSubscriptions(subsData);
    } catch (err: any) {
      console.error("Error fetching subscriptions:", err);
      setError("Errore nel recupero dello storico dei pagamenti. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storico Pagamenti</CardTitle>
        <CardDescription>
          Qui trovi l'elenco di tutti i tuoi abbonamenti sottoscritti e il loro stato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
            <p>Caricamento...</p>
        ) : error ? (
          <p className="text-destructive font-bold">{error}</p>
        ) : subscriptions.length === 0 ? (
          <p className="text-muted-foreground">Nessun pagamento trovato.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Piano</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Metodo Pagamento</TableHead>
                <TableHead className="text-right">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.subscriptionDate ? format(sub.subscriptionDate.toDate(), "dd/MM/yyyy") : 'In elaborazione...'}</TableCell>
                  <TableCell className="font-medium">{sub.planName}</TableCell>
                  <TableCell>€{sub.price}</TableCell>
                  <TableCell>{translatePaymentMethod(sub.paymentMethod)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={sub.status === 'Pagato' ? 'default' : 'secondary'} className={sub.status === 'Pagato' ? 'bg-green-500/20 text-green-700 border-green-500/20' : 'bg-orange-500/20 text-orange-700 border-orange-500/20'}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
