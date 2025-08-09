
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
    medicalStatusState?: 'valid' | 'expiring' | 'expired' | null;
    gymName?: string;
    discipline?: string;
    grade?: string;
    qualifica?: string;
    membershipStatus: string;
    membershipStatusState?: 'pending' | 'active' | 'expired' | 'not_associated';
    isInsured?: boolean;
    trialLessons?: TrialLesson[];
    trialStatus?: string;
    trialStatusState?: 'pending_payment' | 'active' | 'completed' | 'not_applicable' | 'declined';
    subscriptionType?: string;
    subscriptionStatus?: string;
    subscriptionValidity?: string;
}

const InfoRow = ({ icon, label, value, valueClassName: externalValueClassName }: { icon: React.ReactNode, label: string, value?: string | boolean | null, valueClassName?: string }) => {
    if (value === undefined || value === null || value === '' || value === 'Nessuna') return null;
    
    let displayValue: string;
    if (typeof value === 'boolean') {
        displayValue = value ? 'Sì' : 'No';
    } else {
        displayValue = value;
    }
    
    const isEmail = label.toLowerCase() === 'email';

    const valueClassName = cn('ml-auto text-muted-foreground text-right font-bold', {
        'font-bold': isEmail,
    }, externalValueClassName);

    return (
        <div className="flex items-center text-sm">
            <div className="w-5 text-muted-foreground">{icon}</div>
            <span className="ml-3 font-bold">{label}:</span>
            <span className={valueClassName}>{displayValue}</span>
        </div>
    )
}

export function MemberSummaryCard(props: MemberSummaryProps) {

    const regulationsClassName = props.regulationsStatus === 'Accettati' ? 'text-green-600 font-bold' : '';

    const medicalStatusClassName = cn('font-bold', {
        'text-green-600': props.medicalStatusState === 'valid',
        'text-orange-500': props.medicalStatusState === 'expiring',
        'text-destructive': props.medicalStatusState === 'expired',
    });

    const insuredStatusClassName = cn('font-bold', {
        'text-green-600': props.isInsured,
        'text-destructive': !props.isInsured,
    });
    
    const trialStatusClassName = cn('font-bold', {
        'text-orange-500': props.trialStatusState === 'pending_payment',
        'text-green-600': props.trialStatusState === 'active',
        'text-muted-foreground': props.trialStatusState === 'completed',
    });

    const membershipStatusClassName = cn('font-bold', {
        'text-orange-500': props.membershipStatusState === 'pending',
        'text-green-600': props.membershipStatusState === 'active',
        'text-destructive': props.membershipStatusState === 'expired',
    });

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-col items-center text-center p-4">
                <CardTitle className="text-2xl">{props.name}</CardTitle>
                <div className="text-lg font-bold pt-1">
                   {props.sportingSeason}
                </div>
                <div className="text-base pt-1">
                    <span className="font-semibold">Disciplina:</span> {props.discipline}
                    {props.grade && <><span className="font-semibold ml-2">Grado:</span> {props.grade}</>}
                </div>
                 <div className="text-base pt-1">
                    <span className="font-semibold">Palestra:</span> {props.gymName}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 p-4">
                 <div className="space-y-3">
                    <InfoRow icon={<Mail size={16} />} label="Email" value={props.email} />
                    <InfoRow icon={<CalendarPlus size={16} />} label="Socio Dal" value={props.socioDal} />
                    <InfoRow icon={<FileText size={16} />} label="Statuto e Regolamenti" value={props.regulationsStatus} valueClassName={regulationsClassName} />
                    <InfoRow icon={<HeartPulse size={16} />} label="Certificato Medico" value={props.medicalStatus} valueClassName={medicalStatusClassName} />
                    <InfoRow icon={<ShieldCheck size={16} />} label="Assicurato" value={props.isInsured} valueClassName={insuredStatusClassName} />
                 </div>
                 
                 <Separator />

                 <div className="space-y-3">
                    
                    <InfoRow icon={<Star size={16} />} label="Qualifica" value={props.qualifica} />
                    <InfoRow icon={<Shield size={16} />} label="Stato Associazione" value={props.membershipStatus} valueClassName={membershipStatusClassName} />
                    <InfoRow icon={<Activity size={16} />} label="Stato Prova" value={props.trialStatus} valueClassName={trialStatusClassName} />
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
