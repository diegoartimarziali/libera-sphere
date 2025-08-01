
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, Award, Sparkles, CalendarDays, ShieldCheck, HeartPulse, Star, CalendarPlus, CalendarCheck2, FileText } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export interface TrialLesson {
    date: Date;
    time: string;
}

export interface MemberSummaryProps {
    name: string;
    email: string;
    socioDal?: Date;
    sportingSeason?: string;
    regulationsStatus: string;
    medicalStatus: string;
    discipline?: string;
    grade?: string;
    qualifica?: string;
    membershipStatus: string;
    isInsured?: boolean;
    trialLessons?: TrialLesson[];
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | boolean | null }) => {
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue: string;
    if (typeof value === 'boolean') {
        displayValue = value ? 'Sì' : 'No';
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
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-col items-center text-center p-4">
                <CardTitle className="text-2xl">{props.name}</CardTitle>
                <CardDescription>Questo è il riepilogo del tuo profilo</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 p-4">
                 <div className="space-y-3">
                    <InfoRow icon={<Mail size={16} />} label="Email" value={props.email} />
                    <InfoRow icon={<CalendarPlus size={16} />} label="Socio Dal" value={props.socioDal ? format(props.socioDal, 'dd MMMM yyyy', {locale: it}) : undefined} />
                    <InfoRow icon={<CalendarDays size={16} />} label="Stagione Sportiva" value={props.sportingSeason} />
                    <InfoRow icon={<FileText size={16} />} label="Statuto e Regolamenti" value={props.regulationsStatus} />
                    <InfoRow icon={<HeartPulse size={16} />} label="Certificato Medico" value={props.medicalStatus} />
                 </div>
                 
                 <Separator />

                 <div className="space-y-3">
                    <InfoRow icon={<Sparkles size={16} />} label="Disciplina" value={props.discipline} />
                    <InfoRow icon={<Award size={16} />} label="Grado" value={props.grade} />
                    <InfoRow icon={<Star size={16} />} label="Qualifica" value={props.qualifica} />
                    <InfoRow icon={<Shield size={16} />} label="Stato Associazione" value={props.membershipStatus} />
                    <InfoRow icon={<ShieldCheck size={16} />} label="Assicurato" value={props.isInsured} />
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
