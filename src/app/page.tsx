
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Shield } from 'lucide-react';


export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    if (!loginEmail || loginPassword.length < 6) {
        setErrorMessage("Inserisci un'email valida e una password di almeno 6 caratteri.");
        setIsLoading(false);
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        router.push('/dashboard');
    } catch (error: any) {
        setErrorMessage("Credenziali non valide. Riprova.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignup = async () => {
     setIsLoading(true);
     setErrorMessage('');
     if (!name || !signupEmail || signupPassword.length < 6) {
        setErrorMessage("Compila tutti i campi. La password deve essere di almeno 6 caratteri.");
        setIsLoading(false);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name,
          email: signupEmail,
          createdAt: serverTimestamp(),
          codiceFiscale: '',
          birthDate: '',
          birthplace: '',
          address: '',
          civicNumber: '',
          cap: '',
          comune: '',
          provincia: '',
          phone: '',
          isMinor: false,
          parentName: '',
          parentCf: '',
          parentPhone: '',
          parentEmail: '',
          firstAssociationYear: null,
          grade: null,
          isFormerMember: null,
          regulationsAccepted: false,
          regulationsAcceptanceDate: null,
          isSelectionPassportComplete: false,
          lessonSelected: false,
          isInsured: false,
          associationStatus: 'none',
          associationRequestDate: null,
          associationApprovalDate: null,
          martialArt: '',
          selectedDojo: '',
          lessonDate: '',
          paymentMethod: '',
          paymentAmount: '',
          medicalCertificate: {
              expirationDate: null,
              fileName: null,
              fileUrl: null,
              appointmentDate: null,
          },
          subscription: {
              plan: null,
              status: null,
              paymentDate: null,
              expiryDate: null,
          }
        });
        
        router.push('/dashboard');
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setErrorMessage("Questa email è già in uso. Prova ad accedere.");
        } else {
            setErrorMessage("Si è verificato un errore durante la registrazione. Riprova.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const capitalized = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    setName(capitalized);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold font-headline mt-4">LiberaSphere</h1>
          <p className="text-muted-foreground mt-2">La tua sfera di liberta nelle Arti Marziali</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Accedi</TabsTrigger>
            <TabsTrigger value="signup">Registrati</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Oss, benvenuto nel Dojo!</CardTitle>
                <CardDescription>Inserisci le tue credenziali per accedere al tuo account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input 
                    id="email-login" 
                    type="email" 
                    placeholder="m@example.com" 
                    required 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="password-login">Password</Label>
                    <Link href="#" className="ml-auto inline-block text-sm underline">
                      Password dimenticata?
                    </Link>
                  </div>
                  <Input 
                    id="password-login" 
                    type="password" 
                    required 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                   <p className="text-xs text-muted-foreground">La password deve essere minimo di 6 caratteri/numeri</p>
                </div>
                <Button type="submit" className="w-full" onClick={handleLogin} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Accedi"}
                </Button>
                 {errorMessage && (
                  <div className="mt-4 text-center text-sm font-medium text-destructive">
                    {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Crea un Account</CardTitle>
                <CardDescription>Inserisci le tue informazioni per creare un nuovo account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-signup">Nome e Cognome Allievo</Label>
                  <Input 
                    id="name-signup" 
                    placeholder="Mario Rossi" 
                    required 
                    value={name}
                    onChange={handleNameChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email (questa sarà l'email per le comunicazioni)</Label>
                  <Input 
                    id="email-signup" 
                    type="email" 
                    placeholder="m@example.com" 
                    required 
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input 
                    id="password-signup" 
                    type="password" 
                    required 
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">La password deve essere minimo di 6 caratteri/numeri</p>
                </div>
                <Button type="submit" className="w-full" onClick={handleSignup} disabled={isLoading}>
                   {isLoading ? <Loader2 className="animate-spin" /> : "Registrati"}
                </Button>
                 {errorMessage && (
                  <div className="mt-4 text-center text-sm font-medium text-destructive">
                    {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
