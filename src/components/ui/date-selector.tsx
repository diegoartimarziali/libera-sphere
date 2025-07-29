
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
        let newDay = part === 'day' ? val : day;
        let newMonth = part === 'month' ? val : month;
        let newYear = part === 'year' ? val : year;

        if (part === 'day') {
            const maxDays = new Date(Number(newYear) || 0, Number(newMonth) || 1, 0).getDate();
            if (Number(val) > maxDays) {
                newMonth = "";
                newYear = "";
            }
        }
        
        if (part === 'month') {
            const maxDays = new Date(Number(newYear) || 0, Number(val), 0).getDate();
            if (Number(newDay) > maxDays) {
                newDay = ""; 
            }
        }
        
        setDay(newDay);
        setMonth(newMonth);
        setYear(newYear);

        if (newDay && newMonth && newYear) {
            const newDate = new Date(Number(newYear), Number(newMonth) - 1, Number(newDay));
            if (!isNaN(newDate.getTime())) {
                onChange(newDate);
            }
        } else {
            onChange(undefined);
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
    
    const daysInMonth = (year && month) ? new Date(Number(year), Number(month), 0).getDate() : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="grid grid-cols-3 gap-2">
            <Select value={day} onValueChange={(v) => handleDateChange('day', v)}>
                <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                <SelectContent>
                    {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={month} onValueChange={(v) => handleDateChange('month', v)}>
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
