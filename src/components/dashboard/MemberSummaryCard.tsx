
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, Award, Sparkles } from "lucide-react"

export interface MemberSummaryProps {
    name: string;
    email: string;
    membershipType: string;
    discipline?: string;
    grade?: string;
    avatarUrl?: string;
}

const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => {
    if (!value) return null;
    return (
        <div className="flex items-center text-sm">
            <div className="w-5 text-muted-foreground">{icon}</div>
            <span className="ml-3 font-medium">{label}:</span>
            <span className="ml-auto text-muted-foreground text-right">{value}</span>
        </div>
    )
}

export function MemberSummaryCard(props: MemberSummaryProps) {
    const initials = getInitials(props.name);

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                    {props.avatarUrl && <AvatarImage src={props.avatarUrl} alt={props.name} />}
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <CardTitle className="text-xl">{props.name}</CardTitle>
                    <CardDescription>Riepilogo del tuo profilo</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <Separator />
                 <div className="space-y-3">
                    <InfoRow icon={<Mail size={16} />} label="Email" value={props.email} />
                    <InfoRow icon={<Shield size={16} />} label="Stato" value={props.membershipType} />
                    <InfoRow icon={<Sparkles size={16} />} label="Disciplina" value={props.discipline} />
                    <InfoRow icon={<Award size={16} />} label="Grado" value={props.grade} />
                 </div>
            </CardContent>
            <CardFooter>
                 <Badge variant={"default"} className="w-full justify-center">
                    Accesso Completo
                </Badge>
            </CardFooter>
        </Card>
    )
}
