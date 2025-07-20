
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Label } from "./ui/label"
import { Button } from "./ui/button"

interface Subscription {
  id: string;
  planName: string;
  price: string;
  paymentMethod: string;
  subscriptionDate: Timestamp;
  status: 'Pagato' | 'In attesa';
}

const translatePaymentMethod = (method: string) => {
    switch (method) {
        case 'cash': return 'Contanti o Bancomat in palestra';
        case 'online': return 'Carta di Credito on line (0 costi)';
        default: return method;
    }
}

export function PaymentHistory() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
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
                subscriptionDate: data.subscriptionDate,
                status: data.status || 'In attesa', // Default to 'In attesa' if status is not set
            } as Subscription;
        });

        setSubscriptions(subsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        setError("Errore nel recupero dello storico dei pagamenti. Riprova più tardi.");
      } finally {
        setIsLoading(false);
      }
    };

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
          <p className="text-destructive">{error}</p>
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
                  <TableCell>{format(sub.subscriptionDate.toDate(), "dd/MM/yyyy")}</TableCell>
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

        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Seleziona il Pagamento</h3>
            <h3 className="text-lg font-semibold">Modalità di pagamento</h3>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="payment-method">Metodo di Pagamento</Label>
                <Select>
                    <SelectTrigger id="payment-method">
                        <SelectValue placeholder="Scegli un'opzione" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="online">Carta di Credito on Line</SelectItem>
                        <SelectItem value="card-pos">Carta di credito o Bancomat in Palestra</SelectItem>
                        <SelectItem value="cash">Contanti in Palestra</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
