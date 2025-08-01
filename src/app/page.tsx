
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

// Schema di validazione per il login
const loginSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(1, { message: "La password è richiesta." }),
})

// Schema di validazione per la registrazione
const registerSchema = z.object({
  name: z.string().min(2, { message: "Il nome è richiesto." }),
  surname: z.string().min(2, { message: "Il cognome è richiesto." }),
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
})

export default function AuthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("login")

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", surname: "", email: "", password: "" },
  })

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password)
      router.push("/dashboard")
    } catch (error: any) {
        let description = "Email o password non corretti. Riprova."
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            description = "Nessun account trovato con queste credenziali. Prova a registrarti."
        }
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: description,
      })
      setIsLoading(false)
    }
  }

  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password)
      const user = userCredential.user

      // Crea il documento utente in Firestore con l'UID corretto
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: values.name.trim(),
        surname: values.surname.trim(),
        email: values.email,
        createdAt: serverTimestamp(),
        // Valori di default per l'onboarding
        regulationsAccepted: false,
        medicalCertificateSubmitted: false,
        applicationSubmitted: false,
        associationStatus: 'not_associated',
        isInsured: false,
        // Altri campi inizializzati a valori sicuri
        birthPlace: "",
        birthDate: null,
        taxCode: "",
        address: "",
        streetNumber: "",
        zipCode: "",
        city: "",
        province: "",
        phone: "",
        isFormerMember: "",
        hasPracticedBefore: "",
        discipline: "",
        lastGrade: "",
      })
      
      router.push("/dashboard");
      
    } catch (error: any) {
      let description = "Si è verificato un errore durante la registrazione."
      if (error.code === 'auth/email-already-in-use') {
          description = "Questa email è già stata utilizzata. Prova ad accedere."
      }
      toast({
        variant: "destructive",
        title: "Errore di registrazione",
        description: description,
      })
      setIsLoading(false)
    }
  }

  const onTabChange = (value: string) => {
    setIsLoading(false)
    setActiveTab(value)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8" style={{ background: 'var(--background)' }}>
      <div className="flex flex-col items-center text-center mb-8">
         <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-16 w-16 mb-4"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          <path d="M12 12L16 8"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
        <h1 className="text-4xl font-bold text-foreground">LiberaSphere</h1>
        <p className="text-lg text-muted-foreground mt-2">Pronti a ricominciare.</p>
      </div>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Accedi</TabsTrigger>
          <TabsTrigger value="register">Registrati</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Bentornato</CardTitle>
              <CardDescription>Inserisci le tue credenziali per accedere.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="tua@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading && activeTab === 'login'}>
                    {isLoading && activeTab === 'login' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Accedi
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Crea un nuovo account</CardTitle>
              <CardDescription>Registrati per iniziare il tuo percorso.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={registerForm.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome Allievo</FormLabel>
                                <FormControl>
                                <Input placeholder="Mario" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={registerForm.control}
                            name="surname"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cognome Allievo</FormLabel>
                                <FormControl>
                                <Input placeholder="Rossi" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                   </div>
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (sarà l'email di contatto)</FormLabel>
                        <FormControl>
                          <Input placeholder="tua@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimo 6 caratteri" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading && activeTab === 'register'}>
                    {isLoading && activeTab === 'register' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrati
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

    
