
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, Award, Sparkles, CalendarDays, ShieldCheck, HeartPulse, Star, CalendarPlus, CalendarCheck2, FileText, Activity, KeyRound, Repeat, CalendarClock, Building, Phone, MapPin, Cake, UserCircle, Users } from "lucide-react"
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
    taxCode?: string;
    phone?: string;
    birthDate?: Date;
    birthPlace?: string;
    fullAddress?: string;
    isMinor?: boolean;
    parentData?: {
        parentName: string;
        parentSurname: string;
        parentTaxCode: string;
    };
    socioDal?: string;
    sportingSeason?: string;
    regulationsStatus: string;
    regulationsAccepted: boolean;
    regulationsAcceptedAt?: Date | null;
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

    const valueClassName = cn('ml-auto text-muted-foreground text-right', {
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
    
    const regulationsDisplayValue = props.regulationsAccepted && props.regulationsAcceptedAt
        ? `${props.regulationsStatus} il ${format(props.regulationsAcceptedAt, 'dd/MM/yyyy', { locale: it })}`
        : props.regulationsStatus;

    const regulationsClassName = props.regulationsAccepted ? 'text-green-600 font-bold' : '';

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

    const subscriptionTypeClassName = 'text-foreground font-black';

    const subscriptionStatusClassName = cn('font-bold', {
        'text-orange-500': props.subscriptionStatus === 'In attesa di approvazione' || props.subscriptionStatus === 'In scadenza',
        'text-green-600': props.subscriptionStatus === 'Attivo',
        'text-destructive': props.subscriptionStatus === 'Scaduto' || props.subscriptionStatus === 'Non Approvato',
    });
    
    const subscriptionValidityClassName = "font-bold text-muted-foreground";

    const socioDalClassName = 'text-muted-foreground font-black';

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-col items-center text-center p-4">
                <CardTitle className="text-2xl">{props.name}</CardTitle>
                <div className="text-lg font-bold pt-1">
                   {props.sportingSeason}
                </div>
                                            <div className="text-base pt-1">
                                                    <span>Disciplina:</span> <span className="font-bold">{props.discipline}</span>
                                                {props.grade && <><span className="ml-2">Grado:</span> <span className="font-bold">{props.grade}</span></>}
                                            </div>
                 <div className="text-base pt-1">
                    {props.qualifica && props.qualifica !== 'Nessuna' && <><span>Qualifica:</span> <span className="font-bold">{props.qualifica}</span></>}
                 </div>
                 <div className="text-base pt-1">
                    <span>Palestra:</span> <span className="font-bold">{props.gymName}</span>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 p-4">
                 <div className="space-y-3">
                    <h4 className="text-lg font-bold flex items-center justify-center text-center" style={{ color: 'hsl(30, 100%, 38%)' }}>
                        <UserCircle size={16} className="mr-3 w-5 text-muted-foreground" />
                        Dati Anagrafici
                    </h4>
                    <div className="pl-8 space-y-3">
                        <InfoRow icon={<Mail size={16} />} label="Email" value={props.email} />
                        <InfoRow icon={<Phone size={16} />} label="Telefono" value={props.phone} valueClassName="font-bold" />
                        <InfoRow icon={<User size={16} />} label="Codice Fiscale" value={props.taxCode} valueClassName="font-bold" />
                        <InfoRow icon={<Cake size={16} />} label="Nato/a il" value={props.birthDate ? `${format(props.birthDate, 'dd/MM/yyyy', { locale: it })} a ${props.birthPlace}`: undefined} valueClassName="font-bold" />
                        <InfoRow icon={<MapPin size={16} />} label="Indirizzo" value={props.fullAddress} valueClassName="font-bold" />
                    </div>
                </div>

                {props.isMinor && props.parentData && (
                     <div className="space-y-3">
                        <h4 className="text-sm font-bold flex items-center">
                            <Users size={16} className="mr-3 w-5 text-muted-foreground" />
                            Dati Genitore/Tutore
                        </h4>
                        <div className="pl-8 space-y-3">
                            <InfoRow icon={<User size={16} />} label="Nome" value={`${props.parentData.parentName} ${props.parentData.parentSurname}`} />
                            <InfoRow icon={<User size={16} />} label="Codice Fiscale" value={props.parentData.parentTaxCode} />
                        </div>
                    </div>
                )}
                 
                 <Separator />

                 <div className="space-y-3">
                    <h4 className="text-lg font-bold flex items-center justify-center text-center" style={{ color: 'hsl(30, 100%, 38%)' }}>
                        <Award size={16} className="mr-3 w-5 text-muted-foreground" />
                        Stato Associativo, Medico e Assicurativo
                    </h4>
                    <div className="pl-8 space-y-3">
                        <InfoRow icon={<CalendarPlus size={16} />} label="Socio Dal" value={props.socioDal} valueClassName={socioDalClassName} />
                        <InfoRow icon={<FileText size={16} />} label="Statuto e Regolamenti" value={regulationsDisplayValue} valueClassName={regulationsClassName} />
                        <InfoRow icon={<HeartPulse size={16} />} label="Certificato Medico" value={props.medicalStatus} valueClassName={medicalStatusClassName} />
                        <InfoRow icon={<ShieldCheck size={16} />} label="Assicurato" value={props.isInsured} valueClassName={insuredStatusClassName} />
                        <InfoRow icon={<Shield size={16} />} label="Stato Associazione" value={props.membershipStatus} valueClassName={membershipStatusClassName} />
                    </div>
                 </div>
                 
                 <Separator />

                 <div className="space-y-3">
                    <h4 className="text-lg font-bold flex items-center justify-center text-center" style={{ color: 'hsl(30, 100%, 38%)' }}>
                        <KeyRound size={16} className="mr-3 w-5 text-muted-foreground" />
                        Abbonamenti e Prove
                    </h4>
                    <div className="pl-8 space-y-3">
                        <InfoRow icon={<Activity size={16} />} label="Stato Prova" value={props.trialStatus} valueClassName={trialStatusClassName} />
                        <InfoRow icon={<CalendarClock size={16}/>} label="Abbonamento mese di" value={props.subscriptionValidity} valueClassName={subscriptionValidityClassName} />
                        <InfoRow icon={<KeyRound size={16} />} label="Stato Abbonamento" value={props.subscriptionStatus} valueClassName={subscriptionStatusClassName} />
                    </div>
                 </div>
                 
                {props.trialLessons && props.trialLessons.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                             <h4 className="text-sm font-bold flex items-center">
                                <CalendarCheck2 size={16} className="mr-3 w-5 text-muted-foreground" />
                                Lezioni di Prova Prenotate
                            </h4>
                            {props.trialLessons.map((lesson, index) => {
                                const formattedDate = format(lesson.date, "EEEE dd/MM", { locale: it });
                                const day = formattedDate.split(' ')[0];
                                const datePart = formattedDate.substring(day.length).trim();

                                return (
                                    <div key={index} className="flex items-center text-sm ml-8">
                                        <span className="font-bold">{index + 1}ª Lezione:</span>
                                        <span className="ml-auto text-muted-foreground text-right capitalize">
                                            <span className="font-bold text-foreground">{day}</span> {datePart} - {lesson.time}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

            </CardContent>
        </Card>
    )
}
