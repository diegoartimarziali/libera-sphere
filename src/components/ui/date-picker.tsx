
"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
    value?: Date | null;
    onChange: (date?: Date) => void;
    disableFuture?: boolean;
    disablePast?: boolean;
}

export function DatePicker({ value, onChange, disableFuture, disablePast }: DatePickerProps) {
    const today = new Date().toISOString().split("T")[0];

    // Funzione per formattare la data nel formato YYYY-MM-DD richiesto dall'input type="date"
    const formatDateForInput = (date: Date | null | undefined): string => {
        if (!date) return "";
        try {
            return format(date, "yyyy-MM-dd");
        } catch (error) {
            return "";
        }
    };

    // Gestisce il cambio di data dall'input nativo
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
        if (dateString) {
            // L'input restituisce una stringa "yyyy-MM-dd".
            // `parseISO` la converte correttamente in un oggetto Date, 
            // gestendo anche i fusi orari in modo più robusto rispetto a `new Date()`.
            const newDate = parseISO(dateString);
            onChange(newDate);
        } else {
            onChange(undefined);
        }
    };
    
    return (
        <div className="relative w-full">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                type="date"
                value={formatDateForInput(value)}
                onChange={handleDateChange}
                max={disableFuture ? today : undefined}
                min={disablePast ? today : "1930-01-01"}
                className={cn(
                    "pl-10 justify-start text-left font-normal",
                     !value && "text-muted-foreground"
                )}
                // Aggiungiamo stili per migliorare l'aspetto dell'input data nativo
                style={{
                    colorScheme: 'light', // per forzare il calendario chiaro anche in dark mode se necessario
                }}
            />
        </div>
    );
