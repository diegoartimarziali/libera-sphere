
"use client"

import type { Stage } from "@/app/dashboard/stages/page";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Tag, Users, ExternalLink } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface StageCardProps {
    stage: Stage;
}

const InfoRow = ({ icon: Icon, text }: { icon: React.ElementType, text: string }) => (
    <div className="flex items-center text-sm text-muted-foreground">
        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{text}</span>
    </div>
);

export function StageCard({ stage }: StageCardProps) {
    const formattedDate = stage.date ? format(stage.date.toDate(), "eeee d MMMM yyyy", { locale: it }) : "Data da definire";

    const handleEnroll = () => {
        if (stage.sumupLink) {
            window.open(stage.sumupLink, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
            {stage.imageUrl && (
                <div className="relative h-40 w-full">
                    <Image
                        src={stage.imageUrl}
                        alt={`Immagine per ${stage.name}`}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="event martial-arts"
                    />
                </div>
            )}
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl capitalize">{stage.name}</CardTitle>
                    <Badge variant={stage.type === 'internal' ? 'secondary' : 'default'}>
                        {stage.type === 'internal' ? 'Interno' : 'Esterno'}
                    </Badge>
                </div>
                <CardDescription>{stage.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <InfoRow icon={Calendar} text={formattedDate} />
                <InfoRow icon={MapPin} text={stage.location} />
                <InfoRow icon={Users} text={`Aperto a: ${stage.open_to}`} />
                <InfoRow icon={Tag} text={`Costo: ${stage.price.toFixed(2)} €`} />
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleEnroll} disabled={!stage.sumupLink}>
                    <ExternalLink className="mr-2" />
                    Iscriviti Ora
                </Button>
            </CardFooter>
        </Card>
    );
}
