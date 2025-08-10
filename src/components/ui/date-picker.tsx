
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date | null;
    onChange: (date?: Date) => void;
    disableFuture?: boolean;
    disablePast?: boolean;
}

export function DatePicker({ value, onChange, disableFuture, disablePast }: DatePickerProps) {
    const today = new Date();
    
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
                <DayPicker
                    mode="single"
                    selected={value || undefined}
                    onSelect={onChange}
                    initialFocus
                    disabled={(date) =>
                        (disablePast && date < today) || (disableFuture && date > today) || false
                    }
                />
            </PopoverContent>
        </Popover>
    );
}
