
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
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useToast } from "./ui/use-toast"

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  price: string;
  paymentMethod: string;
  subscriptionDate: Timestamp | null;
  status: 'Pagato' | 'In attesa';
}

const translatePaymentMethod = (method: string) => {
    switch (method) {
        case 'cash': return 'Contanti o Bancomat in Palestra (+ 2 € costi di gestione)';
        case 'online': return 'Carta di Credito on line';
        case 'bank': return 'Bonifico Bancario';
        default: return method;
    }
}

export function PaymentHistory() {
  const { toast } = useToast();
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
              planId: data.planId,
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

  const handleStatusChange = async (subscriptionId: string, planId: string, newStatus: 'Pagato' | 'In attesa') => {
    try {
      const subRef = doc(db, "subscriptions", subscriptionId);
      await updateDoc(subRef, {
        status: newStatus
      });

      // Update local state to reflect the change immediately
      setSubscriptions(prevSubs => 
        prevSubs.map(sub => 
          sub.id === subscriptionId ? { ...sub, status: newStatus } : sub
        )
      );

      // If we mark as "Pagato", update localStorage to sync the MemberSummaryCard
      if (newStatus === 'Pagato') {
        localStorage.setItem('subscriptionStatus', 'valido');
        // If it's the association fee, also approve the association
        if (planId === 'associazione_annuale') {
            localStorage.setItem('associationApproved', 'true');
            const approvalDate = localStorage.getItem('associationRequestDate') || format(new Date(), "dd/MM/yyyy");
            localStorage.setItem('associationApprovalDate', approvalDate);
            localStorage.setItem('isInsured', 'true');
            localStorage.removeItem('associationRequested');
        } else if (planId.includes('mensile')) {
            localStorage.setItem('subscriptionPaymentDate', new Date().toISOString());
        }
      }

      toast({
        title: "Stato Aggiornato!",
        description: `Lo stato del pagamento è ora: ${newStatus}`,
      });

      // Refresh the page to ensure all components are in sync
      window.location.reload();

    } catch (error) {
       console.error("Error updating subscription status:", error);
       toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del pagamento.",
        variant: "destructive"
       });
    }
  };

  const showAdminFeatures = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

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
                <TableHead>Stato</TableHead>
                {showAdminFeatures && <TableHead className="text-right">Azione</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.subscriptionDate ? format(sub.subscriptionDate.toDate(), "dd/MM/yyyy") : 'In elaborazione...'}</TableCell>
                  <TableCell className="font-medium">{sub.planName}</TableCell>
                  <TableCell>€{sub.price}</TableCell>
                  <TableCell>{translatePaymentMethod(sub.paymentMethod)}</TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'Pagato' ? 'default' : 'secondary'} className={sub.status === 'Pagato' ? 'bg-green-500/20 text-green-700 border-green-500/20' : 'bg-orange-500/20 text-orange-700 border-orange-500/20'}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                   {showAdminFeatures && (
                    <TableCell className="text-right">
                        <Select 
                            value={sub.status} 
                            onValueChange={(newStatus: 'Pagato' | 'In attesa') => handleStatusChange(sub.id, sub.planId, newStatus)}
                            disabled={sub.status === 'Pagato'}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Cambia Stato" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="In attesa">In attesa</SelectItem>
                                <SelectItem value="Pagato">Pagato</SelectItem>
                            </SelectContent>
                        </Select>
                    </TableCell>
                   )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
