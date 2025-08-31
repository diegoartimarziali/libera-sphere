import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onSnapshot, collection, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';

export interface UserAward {
  id: string;
  awardId: string;
  name?: string;
  value: number;
  residuo: number;
  usedValue: number;
  used: boolean;
  assignedAt?: any;
}

const UserAwardsContext = createContext<UserAward[] | null>(null);

export function useUserAwards() {
  return useContext(UserAwardsContext);
}

export function UserAwardsProvider({ children }: { children: React.ReactNode }) {
  const [user] = useAuthState(auth);
  const [awards, setAwards] = useState<UserAward[]>([]);
  const prevAwardsRef = useRef<UserAward[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setAwards([]);
      prevAwardsRef.current = [];
      return;
    }
    const ref = collection(db, `users/${user.uid}/userAwards`);
    const unsubscribe = onSnapshot(ref, async (snapshot) => {
      const list: UserAward[] = await Promise.all(snapshot.docs.map(async docSnap => {
        const data = docSnap.data();
        let name = data.name;
        let value = data.value;
        if (!name || typeof value !== 'number') {
          if (data.awardId) {
            const awardDoc = await getDoc(doc(db, 'awards', data.awardId));
            if (awardDoc.exists()) {
              name = awardDoc.data().name;
              value = awardDoc.data().value;
            }
          }
        }
        return {
          id: docSnap.id,
          awardId: data.awardId,
          name,
          value,
          residuo: data.residuo,
          usedValue: data.usedValue,
          used: data.used,
          assignedAt: data.assignedAt
        };
      }));

      // Rileva rimborso bonus: residuo aumenta rispetto a prima
      if (prevAwardsRef.current.length > 0) {
        list.forEach((award) => {
          const prev = prevAwardsRef.current.find(a => a.id === award.id);
          if (prev && award.residuo > prev.residuo) {
            toast({
              title: "Bonus riaccreditato",
              description: `Il tuo bonus di ${award.residuo - prev.residuo}€ è stato riaccreditato perché il pagamento non è stato accettato.`,
              variant: "success"
            });
          }
        });
      }
      prevAwardsRef.current = list;
      setAwards(list);
    });
    return () => unsubscribe();
  }, [user, toast]);

  return (
    <UserAwardsContext.Provider value={awards}>
      {children}
    </UserAwardsContext.Provider>
  );
}