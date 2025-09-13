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
  open_to: "Tutti" | "Cinture Nere" | "Insegnanti";
  type: "stage" | "exam" | "course" | "aggiornamento" | "other";
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
    case "aggiornamento": return "Aggiornamento";
    default: return "Evento";
  }
};

interface InfoRowProps {
  icon: any;
  text: string;
  bold?: boolean;
}

const InfoRow = ({ icon: Icon, text, bold }: InfoRowProps) => (
  <div className="flex items-center text-sm text-[hsl(var(--background))]">
    <Icon className="h-4 w-4 mr-2 flex-shrink-0 text-[hsl(var(--background))]" />
    <span className={`text-[hsl(var(--background))]${bold ? ' font-bold' : ''}`}>{text}</span>
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
  <Card className="flex flex-col bg-[var(--my-gialchiar)] text-[hsl(var(--background))]">
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
  <CardHeader className="p-0 bg-[var(--my-gialchiar)] text-[hsl(var(--background))]">
        <div className="flex flex-col space-y-1.5 p-6 rounded-t-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center text-sm font-semibold text-[hsl(var(--background))]">
              <span className="text-[hsl(var(--background))]">{getEventTypeIcon(stage.type)}</span>
              <span className="text-[hsl(var(--background))]">{getEventTypeLabel(stage.type)}</span>
            </div>
            <div className="text-xs font-bold text-[hsl(var(--background))]">
              {stage.discipline ? `Disciplina: ${stage.discipline.charAt(0).toUpperCase() + stage.discipline.slice(1)}` : ''}
            </div>
          </div>
          <CardTitle className="font-semibold tracking-tight text-xl capitalize text-[hsl(var(--background))]">{stage.title}</CardTitle>
          <CardDescription className="text-sm text-[hsl(var(--background))]">{stage.description}</CardDescription>
        </div>
      </CardHeader>
  <CardContent className="flex-grow space-y-3 text-[hsl(var(--background))]">
  <InfoRow icon={Calendar} text={stage.startTime ? format(stage.startTime.toDate(), "eeee d MMMM yyyy", { locale: it }) : "Data da definire"} bold />
        <InfoRow icon={Clock} text={stage.startTime && stage.endTime ? `${format(stage.startTime.toDate(), "HH:mm")} - ${format(stage.endTime.toDate(), "HH:mm")}` : "Orario da definire"} />
        <InfoRow icon={MapPin} text={stage.location} />
        <InfoRow
          icon={Users}
          text={`Aperto a: ${stage.open_to ? stage.open_to : ""}`}
          bold={stage.open_to === "Insegnanti"}
        />
        <InfoRow icon={Tag} text={`Costo: ${stage.price.toFixed(2)} €`} />
      </CardContent>
      </Card>
    </div>
  );
}
