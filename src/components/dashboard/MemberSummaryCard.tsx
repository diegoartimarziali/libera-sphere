
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, Award, Sparkles, CalendarDays, ShieldCheck, HeartPulse, CreditCard, CalendarCheck2 } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export interface TrialLesson {
    date: Date;
    time: string;
}

export interface MemberSummaryProps {
    name: string;
    email: string;
    membershipStatus: string;
    medicalStatus: string;
    discipline?: string;
    grade?: string;
    avatarUrl?: string;
    sportingSeason?: string;
    isInsured?: boolean;
    trialLessons?: TrialLesson[];
}

const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | boolean | null }) => {
    if (value === undefined || value === null) return null;
    
    let displayValue: string;
    if (typeof value === 'boolean') {
        displayValue = value ? 'SI' : 'NO';
    } else {
        displayValue = value;
    }

    return (
        <div className="flex items-center text-sm">
            <div className="w-5 text-muted-foreground">{icon}</div>
            <span className="ml-3 font-medium">{label}:</span>
            <span className="ml-auto text-muted-foreground text-right">{displayValue}</span>
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
                    <InfoRow icon={<ShieldCheck size={16} />} label="Assicurato" value={props.isInsured} />
                    <InfoRow icon={<CalendarDays size={16} />} label="Stagione Sportiva" value={props.sportingSeason} />
                    <InfoRow icon={<Shield size={16} />} label="Stato Associazione" value={props.membershipStatus} />
                    <InfoRow icon={<HeartPulse size={16} />} label="Certificato Medico" value={props.medicalStatus} />
                    <InfoRow icon={<Sparkles size={16} />} label="Disciplina" value={props.discipline} />
                    <InfoRow icon={<Award size={16} />} label="Grado" value={props.grade} />
                 </div>
                 
                {props.trialLessons && props.trialLessons.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                             <h4 className="text-sm font-medium flex items-center">
                                <CalendarCheck2 size={16} className="mr-3 w-5 text-muted-foreground" />
                                Lezioni di Prova
                            </h4>
                            {props.trialLessons.map((lesson, index) => (
                                <div key={index} className="flex items-center text-sm ml-8">
                                    <span className="font-medium">{index + 1}ª Lezione:</span>
                                    <span className="ml-auto text-muted-foreground text-right capitalize">
                                        {format(lesson.date, "EEEE dd/MM", { locale: it })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

            </CardContent>
        </Card>
    )
}
