'use client';

import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  const handleAuthAction = () => {
    // In a real app, you'd handle auth here.
    // For this prototype, we'll just navigate to the dashboard.
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Dumbbell className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold font-headline mt-4">LiberaSphere</h1>
          <p className="text-muted-foreground mt-2">Your sphere of fitness freedom.</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account.</CardDescription>
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
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password-login" type="password" required />
                </div>
                <Button type="submit" className="w-full" onClick={handleAuthAction}>
                  Log In
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>Enter your information to create a new account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-signup">Full Name</Label>
                  <Input id="name-signup" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input id="email-signup" type="email" placeholder="m@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input id="password-signup" type="password" required />
                </div>
                <Button type="submit" className="w-full" onClick={handleAuthAction}>
                  Sign Up
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
