
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet as WalletIcon } from "lucide-react"

export default function WalletPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Il Mio Portafoglio</CardTitle>
                <CardDescription>
                    Riepilogo dei tuoi documenti, ricevute e attestazioni.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <WalletIcon className="h-16 w-16 mb-4" />
                    <h2 className="text-xl font-semibold">Funzionalità in arrivo</h2>
                    <p className="mt-2">Questa sezione è in fase di sviluppo.</p>
                </div>
            </CardContent>
        </Card>
    )
}
