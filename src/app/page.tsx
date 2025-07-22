
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const KanjiIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24" 
        fill="currentColor"
        {...props}>
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="24" fontFamily="serif">
            道
        </text>
    </svg>
)

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  const handleLogin = () => {
    // In a real app, you would fetch user data. For this prototype, we'll use a default name.
    if (typeof window !== 'undefined') {
        localStorage.clear(); // Clear previous session
        localStorage.setItem('userName', 'Alex Doe');
        localStorage.setItem('registrationEmail', 'm@example.com'); // Default for existing user
    }
    router.push('/dashboard');
  };

  const handleSignup = () => {
    if (typeof window !== 'undefined' && name && signupEmail) {
      localStorage.clear(); // Clear previous session
      localStorage.setItem('userName', name);
      localStorage.setItem('registrationEmail', signupEmail);
      localStorage.setItem('codiceFiscale', '');
      localStorage.setItem('birthDate', '');
      localStorage.setItem('address', '');
      localStorage.setItem('comune', '');
      localStorage.setItem('provincia', '');
    }
    router.push('/dashboard');
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
          <KanjiIcon className="mx-auto h-12 w-12 text-primary" />
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
                  <Input id="email-login" type="email" placeholder="m@example.com" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="password-login">Password</Label>
                    <Link href="#" className="ml-auto inline-block text-sm underline">
                      Password dimenticata?
                    </Link>
                  </div>
                  <Input id="password-login" type="password" required />
                </div>
                <Button type="submit" className="w-full" onClick={handleLogin}>
                  Accedi
                </Button>
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
                  <Input id="password-signup" type="password" required />
                </div>
                <Button type="submit" className="w-full" onClick={handleSignup}>
                  Registrati
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
