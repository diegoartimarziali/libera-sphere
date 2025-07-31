
"use client"

import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// NOTA: Questo è un layout di base. Per un'applicazione reale, dovresti
// implementare un controllo degli accessi per assicurarti che solo gli
// amministratori possano visualizzare queste pagine.

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
                    <Link
                        href="/admin/payments"
                        className="text-foreground transition-colors hover:text-foreground"
                    >
                        Admin Pagamenti
                    </Link>
                </nav>
                 <div className="ml-auto">
                    <Button asChild>
                        <Link href="/dashboard">Torna alla Dashboard</Link>
                    </Button>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {children}
            </main>
        </div>
    );
}
