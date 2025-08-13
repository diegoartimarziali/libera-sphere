
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

    // Effect to synchronize the input field when the external `value` prop changes.
    // This is crucial for loading initial data or for external updates.
    React.useEffect(() => {
        if (value && isValid(value)) {
            const formattedDate = format(value, "dd/MM/yyyy");
            // Only update if the input value is different, to avoid interrupting user typing
            if (parse(inputValue, "dd/MM/yyyy", new Date()).getTime() !== value.getTime()) {
                setInputValue(formattedDate);
            }
        } else {
            // If the external value is null/undefined, clear the input
            setInputValue("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const userInput = e.target.value;
        setInputValue(userInput);

        // Try to parse the date as the user types
        const parsedDate = parse(userInput, 'dd/MM/yyyy', new Date());

        // Check if the input string is a potentially valid date structure (e.g., "dd/MM/yyyy")
        // and if the parsed date is a valid date.
        if (userInput.length === 10 && isValid(parsedDate)) {
            // The date is valid and complete, call onChange with the Date object
            onChange(parsedDate);
        } else {
            // The date is incomplete or invalid, call onChange with undefined
            // This tells react-hook-form that the field is currently invalid.
            onChange(undefined);
        }
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const userInput = e.target.value;
        const parsedDate = parse(userInput, "dd/MM/yyyy", new Date());

        // If the input is invalid or incomplete on blur,
        // reset it to the last known valid 'value' prop.
        if (!isValid(parsedDate) || userInput.length !== 10) {
            if (value && isValid(value)) {
                setInputValue(format(value, "dd/MM/yyyy"));
            } else {
                setInputValue("");
            }
        }
    };


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
