
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, Award, Sparkles, CalendarDays, ShieldCheck, HeartPulse, Star, CalendarPlus, CalendarCheck2, FileText, Activity, KeyRound, Repeat, CalendarClock, Building } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface TrialLesson {
    date: Date;
    time: string;
}

export interface MemberSummaryProps {
    name: string;
    email: string;
    socioDal?: string;
    sportingSeason?: string;
    regulationsStatus: string;
    medicalStatus: string;
    gymName?: string;
    discipline?: string;
    grade?: string;
    qualifica?: string;
    membershipStatus: string;
    isInsured?: boolean;
    trialLessons?: TrialLesson[];
    trialStatus?: string;
    subscriptionType?: string;
    subscriptionStatus?: string;
    subscriptionValidity?: string;
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | boolean | null }) => {
    if (value === undefined || value === null || value === '' || value === 'Nessuna') return null;
    
    let displayValue: string;
    if (typeof value === 'boolean') {
        displayValue = value ? 'Sì' : 'No';
    } else {
        displayValue = value;
    }
    
    const isEmail = label.toLowerCase() === 'email';
    const isRegulations = label.toLowerCase() === 'statuto e regolamenti' && displayValue === 'Accettati';

    const valueClassName = cn('ml-auto text-muted-foreground text-right', {
        'font-bold': isEmail,
        'text-success font-bold': isRegulations,
    });

    return (
        <div className="flex items-center text-sm">
            <div className="w-5 text-muted-foreground">{icon}</div>
            <span className="ml-3 font-bold">{label}:</span>
            <span className={valueClassName}>{displayValue}</span>
        </div>
    )
}

export function MemberSummaryCard(props: MemberSummaryProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-col items-center text-center p-4">
                <CardTitle className="text-2xl">{props.name}</CardTitle>
                 {props.sportingSeason && (
                    <div className="text-lg font-bold pt-1">
                       Stagione Sportiva: {props.sportingSeason}
                    </div>
                )}
                 <div className="text-lg pt-1">
                    <span className="font-semibold">{props.discipline}</span>
                    {props.grade && <span className="font-semibold ml-2">{props.grade}</span>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 p-4">
                 <div className="space-y-3">
                    <InfoRow icon={<Mail size={16} />} label="Email" value={props.email} />
                    <InfoRow icon={<CalendarPlus size={16} />} label="Socio Dal" value={props.socioDal} />
                    <InfoRow icon={<FileText size={16} />} label="Statuto e Regolamenti" value={props.regulationsStatus} />
                    <InfoRow icon={<HeartPulse size={16} />} label="Certificato Medico" value={props.medicalStatus} />
                 </div>
                 
                 <Separator />

                 <div className="space-y-3">
                    <InfoRow icon={<Building size={16} />} label="Palestra" value={props.gymName} />
                    <InfoRow icon={<Star size={16} />} label="Qualifica" value={props.qualifica} />
                    <InfoRow icon={<Shield size={16} />} label="Stato Associazione" value={props.membershipStatus} />
                    <InfoRow icon={<ShieldCheck size={16} />} label="Assicurato" value={props.isInsured} />
                    <InfoRow icon={<Activity size={16} />} label="Stato Prova" value={props.trialStatus} />
                    <InfoRow icon={<Repeat size={16}/>} label="Abbonamento" value={props.subscriptionType} />
                    <InfoRow icon={<CalendarClock size={16}/>} label="Valido per il mese di" value={props.subscriptionValidity} />
                    <InfoRow icon={<KeyRound size={16} />} label="Stato Abbonamento" value={props.subscriptionStatus} />
                 </div>
                 
                {props.trialLessons && props.trialLessons.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                             <h4 className="text-sm font-bold flex items-center">
                                <CalendarCheck2 size={16} className="mr-3 w-5 text-muted-foreground" />
                                Lezioni di Prova
                            </h4>
                            {props.trialLessons.map((lesson, index) => (
                                <div key={index} className="flex items-center text-sm ml-8">
                                    <span className="font-bold">{index + 1}ª Lezione:</span>
                                    <span className="ml-auto text-muted-foreground text-right capitalize">
                                        {format(lesson.date, "EEEE dd/MM", { locale: it })} - {lesson.time}
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
