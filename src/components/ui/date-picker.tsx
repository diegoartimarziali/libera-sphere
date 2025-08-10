"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value?: Date | null;
    onChange: (date?: Date) => void;
}

export function DatePicker({ value, onChange, ...props }: DatePickerProps) {
    const [textValue, setTextValue] = React.useState(value ? format(value, "dd/MM/yyyy") : "");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const str = e.target.value;
        setTextValue(str);

        if (str.length === 10) { // Basic validation for "dd/MM/yyyy"
            const parsedDate = parse(str, "dd/MM/yyyy", new Date());
            if (!isNaN(parsedDate.getTime())) {
                onChange(parsedDate);
            } else {
                 onChange(undefined);
            }
        } else {
             onChange(undefined);
        }
    };
    
    React.useEffect(() => {
        if (value) {
            setTextValue(format(value, "dd/MM/yyyy"));
        } else {
            setTextValue("");
        }
    }, [value]);


    return (
       <Input
            type="text"
            placeholder="GG/MM/AAAA"
            value={textValue}
            onChange={handleChange}
            {...props}
       />
    );
}
