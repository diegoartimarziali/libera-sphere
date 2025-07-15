"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  PanelLeft,
  Search,
  Settings,
  Users,
  Info,
  FileText,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Custom Dumbbell Icon
const DumbbellIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <path d="M15.5 15.5c-1 0-1.5 1-1.5 2s.5 2 1.5 2 1.5-1 1.5-2-.5-2-1.5-2zM4.5 9.5c-1 0-1.5 1-1.5 2s.5 2 1.5 2 1.5-1 1.5-2-.5-2-1.5-2z" />
    <path d="M18 6.5V15a2 2 0 002 2h1" />
    <path d="M6 6.5V15a2 2 0 01-2 2H3" />
    <path d="M12 8V6.5a4.5 4.5 0 00-9 0V15" />
    <path d="M12 8h1a4.5 4.5 0 014.5 4.5V15" />
  </svg>
)

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Scheda personale" },
    { href: "#", icon: Info, label: "Istruzioni" },
    { href: "#", icon: FileText, label: "Regolamenti e Privacy" },
    { href: "#", icon: DumbbellIcon, label: "Lezioni di Selezione" },
    { href: "/dashboard/associates", icon: Users, label: "Associati" },
    { href: "#", icon: HeartPulse, label: "Medico" },
    { href: "#", icon: CreditCard, label: "Abbonamento" },
    { href: "#", icon: Calendar, label: "Stage ed Esami" },
  ]

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="#"
            className="group flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:text-base"
          >
            <TigerIcon className="h-4 w-4 transition-all group-hover:scale-110" />
            <span>LiberaSphere</span>
          </Link>
          <div className="flex-1 w-full">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Apri/Chiudi Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                    href="#"
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                    <TigerIcon className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">LiberaSphere</span>
                </Link>
                {navItems.map(item => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Avatar>
                  <AvatarImage src="https://placehold.co/32x32" alt="@shadcn" data-ai-hint="person face"/>
                  <AvatarFallback>LS</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Il Mio Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Impostazioni</DropdownMenuItem>
              <DropdownMenuItem>Supporto</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/">Esci</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 space-y-4">
            {children}
        </main>
      </div>
    </div>
  )
}
