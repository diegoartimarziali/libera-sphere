
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TigerIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}>
            <path d="M18.2 12c0-3.4-2.8-6.2-6.2-6.2S5.8 8.6 5.8 12" />
            <path d="M12 18.2c3.4 0 6.2-2.8 6.2-6.2" />
            <path d="M12 18.2c-3.4 0-6.2-2.8-6.2-6.2" />
            <path d="M13 12c0-1.1-.9-2-2-2" />
            <path d="M15 9.4c0-1.3-1-2.4-2.4-2.4" />
            <path d="M18 10c0-2.2-1.8-4-4-4" />
            <path d="M6 10c0-2.2 1.8-4 4-4" />
            <path d="m9.1 14.1 3-3" />
            <path d="m14.9 14.1-3-3" />
            <path d="M12 6V3" />
            <path d="M12 21v-3" />
            <path d="M16 4.5 14 6" />
            <path d="M8 4.5 10 6" />
    </svg>
)

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');

  const handleLogin = () => {
    // In a real app, you would fetch user data. For this prototype, we'll use a default name.
    if (typeof window !== 'undefined') {
        localStorage.setItem('userName', 'Alex Doe');
    }
    router.push('/dashboard');
  };

  const handleSignup = () => {
    if (typeof window !== 'undefined' && name) {
      localStorage.setItem('userName', name);
    }
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <TigerIcon className="mx-auto h-12 w-12 text-primary" />
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
                  <Label htmlFor="name-signup">Nome e Cognome</Label>
                  <Input 
                    id="name-signup" 
                    placeholder="Mario Rossi" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input id="email-signup" type="email" placeholder="m@example.com" required />
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
