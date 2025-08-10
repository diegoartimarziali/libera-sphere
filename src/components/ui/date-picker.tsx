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
    const [textValue, setTextValue] = React.useState(value ? format(value, "dd/MM/yyyy") : "");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value.replace(/\D/g, ''); // Rimuove tutto tranne i numeri
        
        if (input.length > 8) {
            input = input.slice(0, 8);
        }

        let formattedInput = '';
        if (input.length > 4) {
            formattedInput = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4)}`;
        } else if (input.length > 2) {
            formattedInput = `${input.slice(0, 2)}/${input.slice(2)}`;
        } else {
            formattedInput = input;
        }

        setTextValue(formattedInput);

        if (formattedInput.length === 10) {
            const parsedDate = parse(formattedInput, "dd/MM/yyyy", new Date());
            if (isValid(parsedDate)) {
                onChange(parsedDate);
            } else {
                onChange(undefined);
            }
        } else {
            onChange(undefined);
        }
    };
    
    React.useEffect(() => {
        if (value && isValid(value)) {
            const formatted = format(value, "dd/MM/yyyy");
            if (textValue !== formatted) {
               setTextValue(formatted);
            }
        } else if (!value) {
             setTextValue("");
        }
    }, [value, textValue]);


    return (
       <Input
            type="text"
            placeholder="GG/MM/AAAA"
            value={textValue}
            onChange={handleInputChange}
            maxLength={10}
            {...props}
       />
    );
}
