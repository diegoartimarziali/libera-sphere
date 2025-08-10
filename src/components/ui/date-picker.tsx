"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value?: Date | null;
    onChange: (date?: Date) => void;
}

export function DatePicker({ value, onChange, ...props }: DatePickerProps) {
    const [inputValue, setInputValue] = React.useState("");

    // Questo effect sincronizza l'input field solo quando il valore esterno (prop) cambia.
    React.useEffect(() => {
        if (value && isValid(value)) {
            setInputValue(format(value, "dd/MM/yyyy"));
        } else if (value === null || value === undefined) {
             setInputValue("");
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, ''); // Rimuove tutto tranne i numeri
        setInputValue(formatInput(rawValue));

        if (rawValue.length === 8) {
            const parsedDate = parse(rawValue, "ddMMyyyy", new Date());
            if (isValid(parsedDate)) {
                // Notifica al parent il cambiamento con un oggetto Date valido
                onChange(parsedDate);
            } else {
                 onChange(undefined);
            }
        } else {
            // Se la data non è completa, notifica che non è valida
            onChange(undefined);
        }
    };
    
    const formatInput = (text: string): string => {
        if (!text) return "";
        let formatted = text;
        if (text.length > 2) {
            formatted = `${text.slice(0, 2)}/${text.slice(2)}`;
        }
        if (text.length > 4) {
            formatted = `${text.slice(0, 2)}/${text.slice(2, 4)}/${text.slice(4, 8)}`;
        }
        return formatted;
    }


    return (
       <Input
            type="text"
            placeholder="GG/MM/AAAA"
            value={inputValue}
            onChange={handleInputChange}
            maxLength={10}
            {...props}
       />
    );
}
