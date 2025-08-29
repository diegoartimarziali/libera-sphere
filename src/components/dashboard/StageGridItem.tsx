import Image from "next/image";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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
    <div
      className="flex flex-col items-center cursor-pointer group"
      onClick={event.onClick}
    >
      <div
        className="w-32 h-32 rounded-lg overflow-hidden border-4 border-[var(--my-marscuro)] bg-muted shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl"
      >
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
      <div className="mt-2 text-center">
        <div className="flex flex-col items-center gap-1 mt-2">
          <div className="text-xs font-semibold text-[var(--my-marscuro)]">
            Tipologia evento:{" "}
            {event.type ? getEventTypeLabel(event.type) : ""}
          </div>
          <div className="text-xs text-[var(--my-marscuro)]">
            Disciplina:{" "}
            {event.discipline
              ? event.discipline.charAt(0).toUpperCase() +
                event.discipline.slice(1)
              : ""}
          </div>
          <div className="text-xs font-semibold text-black">
            {event.startTime
              ? format(event.startTime.toDate(), "dd MMM yyyy", { locale: it })
              : "Data da definire"}
          </div>
          <div className="text-xs text-[var(--my-marscuro)]">
            Aperto a: {event.open_to ? event.open_to : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
