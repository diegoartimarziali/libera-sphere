/*
  AuthPage - Pagina di autenticazione per LiberaSphere.
  Permette agli utenti di accedere o registrarsi tramite Firebase Auth.
  Gestisce la creazione del documento utente su Firestore al momento della registrazione.
  UI realizzata con componenti personalizzati e validazione con Zod.
  Ultima modifica: 6 settembre 2025
*/
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"

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
  confirmPassword: z.string().min(1, { message: "La conferma password è richiesta." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono.",
});

// Funzioni di utilità per la formattazione
const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
const capitalizeWords = (str: string) => {
    if (!str) return str;
    return str.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
};

export default function AuthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", surname: "", email: "", password: "", confirmPassword: "" },
  })

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, values.email.toLowerCase(), values.password)
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
    const formattedEmail = values.email.toLowerCase();
    const formattedName = capitalizeWords(values.name.trim());
    const formattedSurname = capitalizeWords(values.surname.trim());

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, values.password)
      const user = userCredential.user

      // Crea il documento utente in Firestore con l'UID corretto
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formattedName,
        surname: formattedSurname,
        email: formattedEmail,
        createdAt: serverTimestamp(),
        // Valori di default per l'onboarding
  regulationsAccepted: false,
  medicalCertificateSubmitted: false,
  applicationSubmitted: false,
  associationStatus: 'not_associated',
  isInsured: false, // Punto di partenza corretto
        progress: {
            presences: 0,
        },
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

  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Flogo.png?alt=media&token=d1a26a21-2c18-43c5-8cd5-bb9074f84797";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8" style={{ background: 'var(--my-marscuro)' }}>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-6 flex justify-center">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Flogo.png?alt=media&token=2ae6fdd4-f165-4603-b170-d832d97bd004"
            alt="Logo Libera Energia"
            width={120}
            height={120}
            className="rounded-full shadow-lg"
            priority
          />
        </div>
  <h1 className="text-4xl font-bold my-gialoro">LiberaSphere</h1>
  <p className="text-lg my-gialoro mt-2">Guerrieri digitali</p>
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
          <Button type="submit" variant="gold" className="w-full" disabled={isLoading && activeTab === 'login'}>
            {isLoading && activeTab === 'login' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <span className="font-bold">Accedi</span>
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
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Minimo 6 caratteri"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2 text-gray-500"
                              onClick={() => setShowPassword((v) => !v)}
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Ripeti la password"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2 text-gray-500"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="gold" className="w-full" disabled={isLoading && activeTab === 'register'}>
                    {isLoading && activeTab === 'register' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <span className="font-bold">Registrati</span>
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
