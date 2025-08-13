
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

    // Effect to update the input value when the external `value` prop changes
    React.useEffect(() => {
        if (value && isValid(value)) {
            setInputValue(format(value, "dd/MM/yyyy"));
        } else {
            // This handles the case where the parent form resets the date
            setInputValue("");
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        let formattedValue = rawValue;

        if (rawValue.length > 2) {
            formattedValue = `${rawValue.slice(0, 2)}/${rawValue.slice(2)}`;
        }
        if (rawValue.length > 4) {
            formattedValue = `${formattedValue.slice(0, 5)}/${rawValue.slice(4, 8)}`;
        }

        setInputValue(formattedValue);

        // If the formatted text is a full date, try to parse it and update the parent
        if (formattedValue.length === 10) {
            const parsedDate = parse(formattedValue, 'dd/MM/yyyy', new Date());
            if (isValid(parsedDate)) {
                // Only call onChange if the new date is different from the current prop `value`
                if (!value || parsedDate.getTime() !== value.getTime()) {
                    onChange(parsedDate);
                }
            } else {
                onChange(undefined); // Invalid date format
            }
        }
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const finalValue = e.target.value;
        const parsedDate = parse(finalValue, "dd/MM/yyyy", new Date());

        if (!isValid(parsedDate)) {
            onChange(undefined);
            // Optionally reset to the last valid value if the input is invalid on blur
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
