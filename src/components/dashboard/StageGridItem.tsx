import Image from "next/image";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";

interface StageGridItemProps {
  id: string;
  iconUrl?: string;
  type: string;
  discipline?: string;
  open_to?: string;
  startTime: any;
  onClick: () => void;
}

const getEventTypeLabel = (type: string) => {
  switch (type) {
    case "stage":
      return "Stage";
    case "exam":
      return "Esame";
    case "course":
      return "Corso";
    case "lesson":
      return "Lezione";
    default:
      return "Evento";
  }
};

export function StageGridItem({ event }: { event: StageGridItemProps }) {
  return (
    <Card 
      className="cursor-pointer group transition-transform hover:scale-105 hover:shadow-xl bg-card border-2 border-foreground w-48 h-80"
      onClick={event.onClick}
    >
      <CardContent className="p-4 flex flex-col items-center h-full">
        <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-[var(--my-marscuro)] bg-muted shadow-lg mb-4 flex-shrink-0">
          {event.iconUrl ? (
            <Image
              src={event.iconUrl}
              alt={event.type}
              width={128}
              height={128}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
              ?
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2 flex-grow flex flex-col justify-center">
          <div className="text-sm font-semibold text-card-foreground">
            {event.type ? getEventTypeLabel(event.type) : "Evento"}
          </div>
          <div className="text-xs font-bold text-card-foreground">
            {event.discipline
              ? event.discipline.charAt(0).toUpperCase() +
                event.discipline.slice(1)
              : ""}
          </div>
          <div className="text-sm font-bold text-card-foreground">
            {event.startTime
              ? format(event.startTime.toDate(), "dd MMM yyyy", { locale: it })
              : "Data da definire"}
          </div>
          <div className="text-xs text-card-foreground">
            Aperto a: {event.open_to ? event.open_to : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
