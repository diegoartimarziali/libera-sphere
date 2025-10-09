/**
 * HOOK REACT UNIFICATO PER GESTIONE PREMI
 * =====================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import premiumSystem, { 
  UserAward, 
  BonusCalculation, 
  SpendableAward 
} from '@/lib/premiumSystem';

// Re-export dei tipi per comodità
export type { UserAward, BonusCalculation, SpendableAward };

interface UsePremiumSystemResult {
  awards: UserAward[];
  spendableAwards: SpendableAward[];
  totalSpendable: number;
  totalNonSpendable: number;
  isLoading: boolean;
  calculateBonus: (price: number) => BonusCalculation;
  applyBonus: (calculation: BonusCalculation) => Promise<void>;
  refundBonus: (awardIds: string | string[], amount: number) => Promise<void>;
  refreshAwards: () => Promise<void>;
  hasInsufficientBonus: (requiredAmount: number) => boolean;
  getAwardsSummary: () => ReturnType<typeof premiumSystem.getAwardsSummary>;
}

export function usePremiumSystem(userId?: string): UsePremiumSystemResult {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [awards, setAwards] = useState<UserAward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const effectiveUserId = userId || user?.uid;
  
  const loadAwards = useCallback(async () => {
    if (!effectiveUserId) {
      setAwards([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const userAwards = await premiumSystem.loadUserAwards(effectiveUserId);
      setAwards(userAwards);
    } catch (error) {
      console.error('Errore caricamento premi:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i premi"
      });
      setAwards([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, toast]);

  useEffect(() => {
    loadAwards();
  }, [loadAwards]);

  const spendableAwards = premiumSystem.getSpendableAwards(awards);
  const totalSpendable = spendableAwards.reduce((sum, award) => sum + award.availableAmount, 0);
  const totalNonSpendable = awards
    .filter(award => !premiumSystem.isAwardSpendable(award.name) && award.residuo > 0)
    .reduce((sum, award) => sum + award.residuo, 0);

  const calculateBonus = useCallback((price: number): BonusCalculation => {
    return premiumSystem.calculateBonusForPurchase(awards, price);
  }, [awards]);

  const applyBonus = useCallback(async (calculation: BonusCalculation) => {
    if (!effectiveUserId) throw new Error('Utente non identificato');

    try {
      await premiumSystem.applyBonusUsage(effectiveUserId, calculation);
      await loadAwards();
      
      toast({
        title: "Bonus applicato",
        description: `Utilizzati ${calculation.bonusToUse}€ dai tuoi premi`,
      });
    } catch (error) {
      console.error('Errore applicazione bonus:', error);
      toast({
        variant: "destructive", 
        title: "Errore",
        description: "Impossibile applicare il bonus"
      });
      throw error;
    }
  }, [effectiveUserId, loadAwards, toast]);

  const refundBonus = useCallback(async (awardIds: string | string[], amount: number) => {
    if (!effectiveUserId) throw new Error('Utente non identificato');

    try {
      await premiumSystem.refundBonus(effectiveUserId, awardIds, amount);
      await loadAwards();
      
      toast({
        title: "Bonus riaccreditato",
        description: `Riaccreditati ${amount}€ nei tuoi premi`,
      });
    } catch (error) {
      console.error('Errore rimborso bonus:', error);
      toast({
        variant: "destructive",
        title: "Errore", 
        description: "Impossibile riaccreditare il bonus"
      });
      throw error;
    }
  }, [effectiveUserId, loadAwards, toast]);

  const hasInsufficientBonus = useCallback((requiredAmount: number): boolean => {
    return premiumSystem.hasInsufficientBonus(awards, requiredAmount);
  }, [awards]);

  const getAwardsSummary = useCallback(() => {
    return premiumSystem.getAwardsSummary(awards);
  }, [awards]);

  const refreshAwards = useCallback(async () => {
    await loadAwards();
  }, [loadAwards]);

  return {
    awards,
    spendableAwards,
    totalSpendable,
    totalNonSpendable,
    isLoading,
    calculateBonus,
    applyBonus,
    refundBonus,
    refreshAwards,
    hasInsufficientBonus,
    getAwardsSummary
  };
}