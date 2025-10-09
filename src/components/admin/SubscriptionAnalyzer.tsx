"use client"

import { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle, CheckCircle, Users, Calendar, DollarSign, TrendingUp, Bug, Eye } from "lucide-react";

interface SubscriptionReport {
  total: number;
  withActiveSubscription: number;
  withSeasonalSubscription: number;
  withMonthlySubscription: number;
  withBonusPayment: number;
  inconsistentStatus: number;
  missingAccessStatus: number;
  validSubscriptionsWithoutAccess: number;
  problematicUsers: Array<{
    userId: string;
    email: string;
    name: string;
    subscriptionAccessStatus: string | undefined;
    hasValidSubscription: boolean;
    subscriptionDetails: any;
    problem: string;
  }>;
  debugUsers: Array<{
    userId: string;
    name: string;
    email: string;
    hasActiveSubscription: boolean;
    activeSubscription: any;
    subscriptionAccessStatus: string | undefined;
    expirationDate: Date | null;
    isExpired: boolean;
  }>;
}

export default function SubscriptionAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SubscriptionReport | null>(null);
  const [fixing, setFixing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const analyzeSubscriptions = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniziando analisi abbonamenti di tutti gli utenti...');
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`📊 Trovati ${usersSnapshot.size} utenti totali`);
      
      const subscriptionReport: SubscriptionReport = {
        total: 0,
        withActiveSubscription: 0,
        withSeasonalSubscription: 0,
        withMonthlySubscription: 0,
        withBonusPayment: 0,
        inconsistentStatus: 0,
        missingAccessStatus: 0,
        validSubscriptionsWithoutAccess: 0,
        problematicUsers: [],
        debugUsers: []
      };
      
      const currentDate = new Date();
      console.log('📅 Data corrente per il controllo:', currentDate);
      
      usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const userId = docSnap.id;
        
        subscriptionReport.total++;
        
        const subscriptionAccessStatus = userData.subscriptionAccessStatus;
        const activeSubscription = userData.activeSubscription;
        
        let hasValidSubscription = false;
        let subscriptionDetails = null;
        let expirationDate = null;
        let isExpired = false;
        
        if (activeSubscription) {
          console.log(`👤 Utente ${userData.name || userId} ha activeSubscription:`, activeSubscription);
          
          if (activeSubscription.expirationDate) {
            expirationDate = activeSubscription.expirationDate.toDate ? 
              activeSubscription.expirationDate.toDate() : 
              new Date(activeSubscription.expirationDate);
            
            console.log(`📅 Scadenza abbonamento per ${userData.name}: ${expirationDate}`);
            console.log(`🔍 Confronto: ${expirationDate} > ${currentDate} = ${expirationDate > currentDate}`);
          }
          
          hasValidSubscription = expirationDate && expirationDate > currentDate;
          isExpired = expirationDate && expirationDate <= currentDate;
          
          if (hasValidSubscription) {
            subscriptionReport.withActiveSubscription++;
            
            if (activeSubscription.type === 'seasonal') {
              subscriptionReport.withSeasonalSubscription++;
            } else if (activeSubscription.type === 'monthly') {
              subscriptionReport.withMonthlySubscription++;
            }
            
            if (activeSubscription.paymentMethod === 'bonus') {
              subscriptionReport.withBonusPayment++;
            }
            
            subscriptionDetails = {
              type: activeSubscription.type,
              paymentMethod: activeSubscription.paymentMethod,
              expirationDate: expirationDate,
              purchasedAt: activeSubscription.purchasedAt
            };
          }
        }
        
        // Aggiungi ai dati di debug
        subscriptionReport.debugUsers.push({
          userId,
          name: userData.name || 'N/A',
          email: userData.email || 'N/A',
          hasActiveSubscription: !!activeSubscription,
          activeSubscription: activeSubscription || null,
          subscriptionAccessStatus,
          expirationDate,
          isExpired: isExpired
        });
        
        // Identifica problemi
        const isProblematic = hasValidSubscription && subscriptionAccessStatus !== 'active';
        
        if (isProblematic) {
          subscriptionReport.inconsistentStatus++;
          
          if (!subscriptionAccessStatus) {
            subscriptionReport.missingAccessStatus++;
          }
          
          subscriptionReport.validSubscriptionsWithoutAccess++;
          
          subscriptionReport.problematicUsers.push({
            userId,
            email: userData.email || 'N/A',
            name: userData.name || 'N/A',
            subscriptionAccessStatus,
            hasValidSubscription,
            subscriptionDetails,
            problem: !subscriptionAccessStatus ? 'Missing subscriptionAccessStatus' : 
                    `Invalid status: ${subscriptionAccessStatus} (should be 'active')`
          });
        }
      });
      
      setReport(subscriptionReport);
      console.log('📋 Analisi completata:', subscriptionReport);
      
    } catch (error) {
      console.error('❌ Errore durante l\'analisi degli abbonamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fixProblematicUsers = async () => {
    if (!report || report.problematicUsers.length === 0) return;
    
    setFixing(true);
    try {
      console.log(`🔧 Iniziando correzione di ${report.problematicUsers.length} utenti...`);
      
      let fixed = 0;
      let errors = 0;
      
      for (const user of report.problematicUsers) {
        try {
          const userRef = doc(db, 'users', user.userId);
          await updateDoc(userRef, {
            subscriptionAccessStatus: 'active'
          });
          
          console.log(`✅ Corretto utente: ${user.name} (${user.userId})`);
          fixed++;
        } catch (error) {
          console.error(`❌ Errore correggendo utente ${user.name}:`, error);
          errors++;
        }
      }
      
      console.log(`🎉 Correzione completata: ${fixed} utenti corretti, ${errors} errori`);
      
      // Rianalizza dopo le correzioni
      await analyzeSubscriptions();
      
    } catch (error) {
      console.error('❌ Errore durante la correzione:', error);
    } finally {
      setFixing(false);
    }
  };

  const fixSingleUser = async (userId: string, userName: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionAccessStatus: 'active'
      });
      
      console.log(`✅ Corretto singolo utente: ${userName} (${userId})`);
      
      // Rianalizza dopo la correzione
      await analyzeSubscriptions();
      
    } catch (error) {
      console.error(`❌ Errore correggendo utente ${userName}:`, error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analisi Abbonamenti Utenti</h3>
        <div className="flex gap-2">
          {report && (
            <Button 
              variant="outline"
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2"
            >
              <Bug className="h-4 w-4" />
              {showDebug ? 'Nascondi Debug' : 'Debug Dettagliato'}
            </Button>
          )}
          <Button 
            onClick={analyzeSubscriptions} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? 'Analizzando...' : 'Avvia Analisi'}
          </Button>
        </div>
      </div>

      {report && (
        <div className="space-y-4">
          {/* Report statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Totali</span>
                </div>
                <div className="text-2xl font-bold">{report.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Attivi</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{report.withActiveSubscription}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Stagionali</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{report.withSeasonalSubscription}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Problematici</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{report.inconsistentStatus}</div>
              </CardContent>
            </Card>
          </div>

          {/* Statistiche aggiuntive */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Mensili</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{report.withMonthlySubscription}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Pagati con Bonus</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{report.withBonusPayment}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Senza Status</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{report.missingAccessStatus}</div>
              </CardContent>
            </Card>
          </div>

          {/* 🐛 SEZIONE DEBUG DETTAGLIATA */}
          {showDebug && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  🐛 Debug Dettagliato Utenti
                </CardTitle>
                <CardDescription className="text-yellow-600">
                  Visualizza i dati grezzi di tutti gli utenti per capire perché non vengono rilevati abbonamenti attivi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {report.debugUsers.map((user, index) => (
                    <div key={user.userId} className="p-3 border rounded-lg bg-white">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{user.name}</div>
                          <div className="flex gap-2">
                            {user.hasActiveSubscription && (
                              <Badge variant="secondary">Ha activeSubscription</Badge>
                            )}
                            {user.isExpired && (
                              <Badge variant="destructive">Scaduto</Badge>
                            )}
                            {user.expirationDate && !user.isExpired && (
                              <Badge variant="default">Valido</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Email: {user.email}</div>
                          <div>Access Status: {user.subscriptionAccessStatus || 'MISSING'}</div>
                          
                          {user.activeSubscription && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <div><strong>Active Subscription:</strong></div>
                              <div>Tipo: {user.activeSubscription.type}</div>
                              <div>Metodo: {user.activeSubscription.paymentMethod}</div>
                              <div>Scadenza: {user.expirationDate?.toLocaleString('it-IT') || 'N/A'}</div>
                              <div>Acquistato: {user.activeSubscription.purchasedAt?.toDate?.()?.toLocaleString('it-IT') || 'N/A'}</div>
                              <div className="mt-1 text-xs font-mono bg-gray-100 p-1 rounded overflow-x-auto">
                                {JSON.stringify(user.activeSubscription, null, 2).substring(0, 200)}...
                              </div>
                            </div>
                          )}
                          
                          {!user.hasActiveSubscription && (
                            <div className="text-red-600">❌ Nessun activeSubscription</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Utenti problematici */}
          {report.problematicUsers.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-red-800">🚨 Utenti con Problemi</CardTitle>
                    <CardDescription className="text-red-600">
                      {report.problematicUsers.length} utenti hanno abbonamenti validi ma status non corretto
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={fixProblematicUsers} 
                    disabled={fixing}
                    variant="destructive"
                  >
                    {fixing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {fixing ? 'Correggendo...' : 'Correggi Tutti'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {report.problematicUsers.map((user, index) => (
                    <div key={user.userId} className="p-3 border rounded-lg bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">ID: {user.userId}</div>
                          {user.subscriptionDetails && (
                            <div className="mt-2 text-xs space-y-1 text-muted-foreground">
                              <div className="flex gap-4">
                                <span>Tipo: <strong>{user.subscriptionDetails.type}</strong></span>
                                <span>Pagamento: <strong>{user.subscriptionDetails.paymentMethod}</strong></span>
                              </div>
                              <div>Scadenza: <strong>{user.subscriptionDetails.expirationDate?.toLocaleDateString('it-IT')}</strong></div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant="destructive">{user.problem}</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => fixSingleUser(user.userId, user.name)}
                            className="text-xs"
                          >
                            Correggi Solo Questo
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.problematicUsers.length === 0 && report.withActiveSubscription === 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">🤔 Situazione da investigare</div>
                    <div className="text-sm text-yellow-600">
                      Ci sono {report.total} utenti ma nessun abbonamento attivo rilevato. 
                      Usa il "Debug Dettagliato" per vedere i dati grezzi.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {report.problematicUsers.length === 0 && report.withActiveSubscription > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">✅ Nessun problema rilevato!</div>
                    <div className="text-sm text-green-600">Tutti gli abbonamenti sono in stato corretto.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}