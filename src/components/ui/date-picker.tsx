
"use client"

import * as React from "react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date;
    onChange: (date?: Date) => void;
    disableFuture?: boolean;
    disablePast?: boolean;
    placeholder?: string;
}

export function DatePicker({ value, onChange, disableFuture, disablePast, placeholder = "Seleziona una data" }: DatePickerProps) {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Gestione del range di anni selezionabili
    const fromYear = disablePast ? currentYear : 1930;
    const toYear = disableFuture ? currentYear : currentYear + 10;
    
    // Gestione delle date disabilitate
    const disabledDateMatcher = (date: Date) => {
        if (disableFuture) {
            return date > today;
        }
        if (disablePast) {
            return date < today;
        }
        return false;
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
          {value ? format(value, "PPP", { locale: it }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          locale={it}
          captionLayout="dropdown-buttons"
          fromYear={fromYear}
          toYear={toYear}
          disabled={disabledDateMatcher}
        />
      </PopoverContent>
    </Popover>
  )
}
