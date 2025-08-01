
"use client"

import { ReactNode, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { toast } = useToast();

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

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
                    <Link
                        href="/admin/payments"
                        className="text-foreground transition-colors hover:text-foreground"
                    >
                        Admin Pagamenti
                    </Link>
                </nav>
                 <div className="ml-auto flex items-center gap-4">
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

    