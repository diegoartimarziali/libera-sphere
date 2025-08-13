"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
    value?: Date | null;
    onChange: (date?: Date) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
    const handleSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            onChange(selectedDate);
        } else {
            onChange(undefined);
        }
    };
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, "PPP") : <span>Scegli una data</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={value || undefined}
                    onSelect={handleSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}