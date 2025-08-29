import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, MapPin, Tag, Users, Clock, Award, FileText, Sparkles } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export interface StageCardProps {
  stage: {
    id: string;
    title: string;
    description: string;
    startTime: any;
    endTime: any;
    location: string;
    price: number;
    imageUrl?: string;
    open_to: "Tutti" | "Cinture Nere";
    type: "stage" | "exam" | "course" | "other";
    discipline?: "karate" | "aikido";
    alertDate?: string;
    requireConfirmation?: boolean;
  };
}

const getEventTypeIcon = (type: StageCardProps["stage"]["type"]) => {
  switch (type) {
    case "stage": return <Award className="h-4 w-4 mr-2 flex-shrink-0" />;
    case "exam": return <FileText className="h-4 w-4 mr-2 flex-shrink-0" />;
    case "course": return <Users className="h-4 w-4 mr-2 flex-shrink-0" />;
    default: return <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />;
  }
};
const getEventTypeLabel = (type: StageCardProps["stage"]["type"]) => {
  switch (type) {
    case "stage": return "Stage";
    case "exam": return "Esame";
    case "course": return "Corso";
    default: return "Evento";
  }
};

const InfoRow = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center text-sm text-muted-foreground">
    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
    <span>{text}</span>
  </div>
);

export function StageCard({ stage }: StageCardProps) {
  return (
    <div
      className="rounded-lg shadow-2xl"
      style={{
        borderWidth: '4px',
        borderStyle: 'solid',
        borderColor: 'var(--my-marscuro)',
        background: 'white',
        display: 'block',
        width: '100%',
        height: '100%',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <Card className="flex flex-col bg-[var(--my-gialchiar)] text-[var(--my-marscuro)]">
      {stage.imageUrl && (
        <div className="relative h-64 w-full bg-[var(--my-gialchiar)]">
          <Image
            src={stage.imageUrl}
            alt={`Immagine per ${stage.title}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="event martial-arts"
          />
        </div>
      )}
      <CardHeader className="p-0 bg-[var(--my-gialchiar)] text-[var(--my-marscuro)]">
        <div className="flex flex-col space-y-1.5 p-6 rounded-t-md">
          <div className="flex items-center text-sm font-semibold text-[var(--my-marscuro)]">
            {getEventTypeIcon(stage.type)}
            {getEventTypeLabel(stage.type)}
          </div>
          <CardTitle className="font-semibold tracking-tight text-xl capitalize text-[var(--my-marscuro)]">{stage.title}</CardTitle>
          <CardDescription className="text-sm text-[var(--my-marscuro)]">{stage.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-[var(--my-marscuro)]">
        <InfoRow icon={Calendar} text={stage.startTime ? format(stage.startTime.toDate(), "eeee d MMMM yyyy", { locale: it }) : "Data da definire"} />
        <InfoRow icon={Clock} text={stage.startTime && stage.endTime ? `${format(stage.startTime.toDate(), "HH:mm")} - ${format(stage.endTime.toDate(), "HH:mm")}` : "Orario da definire"} />
        <InfoRow icon={MapPin} text={stage.location} />
        <InfoRow icon={Users} text={`Aperto a: ${stage.open_to}`} />
        <InfoRow icon={Tag} text={`Costo: ${stage.price.toFixed(2)} €`} />
      </CardContent>
      </Card>
    </div>
  );
}
