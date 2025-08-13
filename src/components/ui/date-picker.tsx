
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
    const [inputValue, setInputValue] = React.useState("");

    // This effect synchronizes the input field when the external `value` prop changes.
    // It's crucial for loading initial data into the form.
    React.useEffect(() => {
        if (value && isValid(value)) {
            setInputValue(format(value, "dd/MM/yyyy"));
        } else {
            setInputValue("");
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        let formattedValue = rawValue;

        // Auto-insert slashes for dd/MM/yyyy format
        if (rawValue.length > 2 && rawValue.length <= 4) {
            formattedValue = `${rawValue.slice(0, 2)}/${rawValue.slice(2)}`;
        } else if (rawValue.length > 4) {
            formattedValue = `${rawValue.slice(0, 2)}/${rawValue.slice(2, 4)}/${rawValue.slice(4, 8)}`;
        }

        setInputValue(formattedValue);

        // Try to parse the date and call onChange if it's valid
        if (formattedValue.length === 10) {
            const parsedDate = parse(formattedValue, 'dd/MM/yyyy', new Date());
            if (isValid(parsedDate)) {
                 onChange(parsedDate);
            } else {
                // If user types an invalid date like "99/99/9999"
                onChange(undefined);
            }
        } else {
             // If the date is incomplete, the value is not valid yet.
             onChange(undefined);
        }
    };
    
    // When the user leaves the input, we ensure the format is correct
    // or reset it if it's invalid.
    const handleBlur = () => {
        const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
        if (!isValid(parsedDate)) {
             // If the input is invalid on blur, reset to the last valid prop value
             if (value && isValid(value)) {
                setInputValue(format(value, "dd/MM/yyyy"));
             } else {
                setInputValue("");
             }
        }
    }


    return (
        <Input
            type="text"
            placeholder="GG/MM/AAAA"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
            )}
            maxLength={10}
        />
    );
}

