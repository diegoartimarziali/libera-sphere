
"use client"

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, redirect } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { LogOut, Loader2, Menu, X, CreditCard, Users, Calendar, Award, Gift, FileText, UserCheck, Shield, Trash2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AdminNavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: AdminNavItem[] = [
    { href: "/admin/payments", label: "Pagamenti", icon: CreditCard },
    { href: "/admin/attendances", label: "Presenze", icon: UserCheck },
    { href: "/admin/calendar", label: "Calendario", icon: Calendar },
    { href: "/admin/stages", label: "Stage", icon: Award },
    { href: "/admin/awards", label: "Premi", icon: Gift },
    { href: "/admin/subscriptions", label: "Abbonamenti", icon: Users },
    { href: "/admin/medical-certificates", label: "Certificati", icon: FileText },
    { href: "/admin/delete-users", label: "Elimina/Admin", icon: Trash2 },
];

function AdminNavLink({ href, label, icon: Icon, onClick }: { 
    href: string; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    onClick?: () => void;
}) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [user, loading] = useAuthState(auth);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        setIsAdmin(userData.role === 'admin');
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setAdminLoading(false);
        };

        if (!loading) {
            checkAdminStatus();
        }
    }, [user, loading]);

    if (loading || adminLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Caricamento...</div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Accesso negato. Non hai i permessi per accedere a questa area.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden" 
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 z-30 h-full w-64 transform bg-background border-r transition-transform duration-200 ease-in-out lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-14 items-center justify-between border-b px-4">
                    <Link href="/admin" className="flex items-center gap-2 font-semibold">
                        <Shield className="h-5 w-5" />
                        Admin
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <nav className="flex flex-col gap-1 p-4">
                    {adminNavItems.map(({ href, label, icon }) => (
                        <AdminNavLink
                            key={href}
                            href={href}
                            label={label}
                            icon={icon}
                            onClick={() => setSidebarOpen(false)}
                        />
                    ))}
                </nav>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64">
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:border-none">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="lg:hidden">
                            <Link href="/admin" className="flex items-center gap-2 font-semibold">
                                <Shield className="h-5 w-5" />
                                Admin
                            </Link>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => signOut(auth)}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </header>
                <main className="p-4">{children}</main>
            </div>
        </div>
    );
}