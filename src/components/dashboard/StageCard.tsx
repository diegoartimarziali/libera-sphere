
"use client"

import type { Stage } from "@/app/dashboard/stages/page";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Tag, Users, ExternalLink, Clock } from "lucide-react";
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
    const formattedDate = stage.startTime ? format(stage.startTime.toDate(), "eeee d MMMM yyyy", { locale: it }) : "Data da definire";
    const formattedTime = stage.startTime && stage.endTime ? `${format(stage.startTime.toDate(), "HH:mm")} - ${format(stage.endTime.toDate(), "HH:mm")}` : "Orario da definire";

    const handleEnroll = () => {
        // Placeholder for future enrollment logic, e.g., navigating to a detailed page or opening a modal.
        // For now, it does nothing since sumupLink is removed.
        console.log("Enrollment for stage:", stage.id);
    };

    return (
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
            {stage.imageUrl && (
                <div className="relative h-40 w-full">
                    <Image
                        src={stage.imageUrl}
                        alt={`Immagine per ${stage.title}`}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="event martial-arts"
                    />
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-xl capitalize">{stage.title}</CardTitle>
                <CardDescription>{stage.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <InfoRow icon={Calendar} text={formattedDate} />
                <InfoRow icon={Clock} text={formattedTime} />
                <InfoRow icon={MapPin} text={stage.location} />
                <InfoRow icon={Users} text={`Aperto a: ${stage.open_to}`} />
                <InfoRow icon={Tag} text={`Costo: ${stage.price.toFixed(2)} €`} />
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handleEnroll}>
                    Maggiori Dettagli
                </Button>
            </CardFooter>
        </Card>
    );
}
