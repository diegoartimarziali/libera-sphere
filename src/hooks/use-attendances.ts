import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { updatePremiPresenzeValue } from '@/lib/updatePremiPresenze';

interface Attendance {
  id: string;
  status: 'presente' | 'assente';
  lessonDate: any;
}

interface AttendanceData {
  presentAttendances: number;
  totalLessons: number | null;
  percentage: number;
  loading: boolean;
}

export function useAttendances(userId?: string): AttendanceData {
  const [user] = useAuthState(auth);
  
  // Support for impersonation
  const effectiveUserId = userId || user?.uid;
  const [presentAttendances, setPresentAttendances] = useState(0);
  const [totalLessons, setTotalLessons] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendances = async () => {
      if (!effectiveUserId) {
        setLoading(false);
        return;
      }

      try {
        // Leggi presenze dell'utente (rispetta impersonification)
        const attendancesRef = collection(db, 'users', effectiveUserId, 'attendances');
        const q = query(attendancesRef, orderBy('lessonDate', 'desc'));
        const querySnapshot = await getDocs(q);

        const attendancesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Attendance));

        const present = attendancesList.filter(att => att.status === 'presente').length;
        setPresentAttendances(present);

        // Leggi totale lezioni effettive dalla sottocollezione
        const totalLessonsSnap = await getDocs(collection(db, 'users', effectiveUserId, 'totalLessons'));
        let total = null;
        totalLessonsSnap.forEach(doc => {
          const data = doc.data();
          if (typeof data.value === 'number') total = data.value;
        });
        setTotalLessons(total);

        // Calcola la percentuale
        const calculatedPercentage = total && total > 0 ? Math.round((present / total) * 100) : 0;
        
        // Aggiorna automaticamente il Premio Presenze se la percentuale è cambiata
        if (calculatedPercentage > 0) {
          try {
            await updatePremiPresenzeValue(effectiveUserId, calculatedPercentage);
          } catch (error) {
            console.error("Errore aggiornamento Premio Presenze:", error);
          }
        }

      } catch (error) {
        console.error("Error fetching attendances:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendances();
  }, [effectiveUserId]);

  const percentage = totalLessons && totalLessons > 0 ? Math.round((presentAttendances / totalLessons) * 100) : 0;

  return {
    presentAttendances,
    totalLessons,
    percentage,
    loading
  };
}