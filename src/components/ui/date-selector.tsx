
"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

interface DateSelectorProps {
    value?: Date;
    onChange: (date?: Date) => void;
    disableFuture?: boolean;
    disablePast?: boolean;
}

export function DateSelector({ value, onChange, disableFuture, disablePast }: DateSelectorProps) {
    const [day, setDay] = React.useState<string>(value ? String(value.getDate()) : "");
    const [month, setMonth] = React.useState<string>(value ? String(value.getMonth() + 1) : "");
    const [year, setYear] = React.useState<string>(value ? String(value.getFullYear()) : "");

    React.useEffect(() => {
        if (value) {
            const date = new Date(value);
            setDay(String(date.getDate()));
            setMonth(String(date.getMonth() + 1));
            setYear(String(date.getFullYear()));
        } else {
            setDay("");
            setMonth("");
            setYear("");
        }
    }, [value]);

    const handleDateChange = (part: 'day' | 'month' | 'year', val: string) => {
        let currentDay = day;
        let currentMonth = month;
        let currentYear = year;

        if (part === 'day') currentDay = val;
        if (part === 'month') currentMonth = val;
        if (part === 'year') currentYear = val;
        
        // Reset day if month/year changes and day is invalid for new month/year
        if (part === 'month' || part === 'year') {
            const maxDays = new Date(Number(currentYear), Number(currentMonth), 0).getDate();
            if (Number(currentDay) > maxDays) {
                currentDay = "";
            }
        }
        
        setDay(currentDay);
        setMonth(currentMonth);
        setYear(currentYear);

        if (currentDay && currentMonth && currentYear) {
            const newDate = new Date(Number(currentYear), Number(currentMonth) - 1, Number(currentDay));
            if (!isNaN(newDate.getTime()) && newDate.getTime() !== value?.getTime()) {
                onChange(newDate);
            }
        } else {
             if (value !== undefined) {
                onChange(undefined);
            }
        }
    };

    const today = new Date();
    const currentYear = today.getFullYear();
    const startYear = disablePast ? currentYear : 1930;
    const endYear = disableFuture ? currentYear : currentYear + 10;
    
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ 
        value: i + 1, 
        label: capitalizeFirstLetter(new Date(0, i).toLocaleString('it-IT', { month: 'long' })) 
    }));
    
    const maxDaysInMonth = (m: string, y: string) => {
        if (!m || !y) return 31;
        return new Date(Number(y), Number(m), 0).getDate();
    };
    
    const days = Array.from({ length: maxDaysInMonth(month, year) }, (_, i) => i + 1);

    return (
        <div className="grid grid-cols-3 gap-2">
            <Select value={day} onValueChange={(v) => handleDateChange('day', v)} disabled={!month || !year}>
                <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                <SelectContent>
                    {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={month} onValueChange={(v) => handleDateChange('month', v)} disabled={!year}>
                <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={year} onValueChange={(v) => handleDateChange('year', v)}>
                <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}
