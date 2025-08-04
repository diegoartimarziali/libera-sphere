
"use client"

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, redirect } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70"
            )}
        >
            {children}
        </Link>
    );
}


export default function AdminLayout({ children }: { children: ReactNode }) {
    const [user, loadingAuth] = useAuthState(auth);
    const [isAuthorizing, setIsAuthorizing] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

     useEffect(() => {
        const checkAdminRole = async () => {
            if (loadingAuth) return;
            if (!user) {
                redirect('/'); // Se non c'è utente, reindirizza al login
                return;
            }

            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                    setIsAuthorizing(false); // Utente è admin, permette l'accesso
                } else {
                    // Se non ha il ruolo o il documento non esiste, nega l'accesso
                    toast({
                        variant: "destructive",
                        title: "Accesso Negato",
                        description: "Non disponi dei permessi per accedere a quest'area."
                    });
                    router.push('/dashboard');
                }
            } catch (error) {
                 console.error("Error checking admin role:", error);
                 toast({ variant: "destructive", title: "Errore", description: "Impossibile verificare i permessi." });
                 router.push('/dashboard');
            }
        };
        
        checkAdminRole();

    }, [user, loadingAuth, router, toast]);

    const handleLogout = useCallback(async () => {
      try {
          await signOut(auth);
          router.push('/');
          toast({ title: "Logout effettuato", description: "Sei stato disconnesso con successo." });
      } catch (error) {
          console.error("Error during logout:", error);
          toast({ variant: "destructive", title: "Errore di logout", description: "Impossibile disconnettersi. Riprova." });
      }
    }, [router, toast]);

    if (loadingAuth || isAuthorizing) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-muted/40">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-between">
                <nav className="flex items-center gap-2 rounded-md bg-muted p-1 text-muted-foreground">
                    <AdminNavLink href="/admin/payments">Pagamenti</AdminNavLink>
                    {/* Futuri link andranno qui, es:
                    <AdminNavLink href="/admin/certificates">Certificati Medici</AdminNavLink>
                    <AdminNavLink href="/admin/stages">Stages</AdminNavLink> 
                    */}
                </nav>
                 <div className="flex items-center gap-4">
                    <Button asChild variant="outline">
                        <Link href="/dashboard">Torna alla Dashboard</Link>
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        <span className="uppercase font-bold">Log out</span>
                    </Button>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {children}
            </main>
        </div>
    );
}
