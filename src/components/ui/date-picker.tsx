"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DatePickerProps {
    value?: Date | null;
    onChange: (date?: Date) => void;
    disabled?: boolean;
}

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
    const [displayValue, setDisplayValue] = React.useState("");

    React.useEffect(() => {
        if (value && isValid(value)) {
            setDisplayValue(format(value, "dd/MM/yyyy"));
        } else {
            setDisplayValue("");
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value.replace(/[^0-9]/g, '');
        
        if (input.length > 8) {
            input = input.substring(0, 8);
        }

        let formattedInput = '';
        if (input.length > 4) {
            formattedInput = `${input.substring(0, 2)}/${input.substring(2, 4)}/${input.substring(4)}`;
        } else if (input.length > 2) {
            formattedInput = `${input.substring(0, 2)}/${input.substring(2)}`;
        } else {
            formattedInput = input;
        }

        setDisplayValue(formattedInput);

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
    
     const handleBlur = () => {
        if (displayValue.length > 0 && displayValue.length < 10) {
            onChange(undefined); // Invalida la data se non completa
        }
    };


    return (
        <Input
            type="text"
            placeholder="GG/MM/AAAA"
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
            )}
        />
    );
}
