
'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2016 + 1 }, (_, i) => String(currentYear - i));
const grades = [
  "bianca", "bianca/gialla", "gialla", "gialla/arancio", "arancio", 
  "verde", "blu", "viola", "marrone 2 kyu", "marrone 1 kyu", 
  "nera 1 dan", "nera 2 dan", "nera 3 dan", "nera 4 dan"
];

export default function LiberaSpherePage() {
    const [isFormerMember, setIsFormerMember] = useState<string | undefined>();
    const [startYear, setStartYear] = useState<string | undefined>();
    const [grade, setGrade] = useState<string | undefined>();

    const isButtonDisabled = () => {
        if (isFormerMember === 'no') {
            return false;
        }
        if (isFormerMember === 'yes') {
            return !startYear || !grade;
        }
        return true; // Disabled by default if no selection is made
    };

    const handleIsFormerMemberChange = (value: string) => {
        setIsFormerMember(value);
        // Reset dependent fields when the main choice changes
        setStartYear(undefined);
        setGrade(undefined);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="bg-stone-800 text-amber-400 p-6 -mt-6 -mx-6 rounded-t-lg mb-6">LiberaSphere</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a.
                </p>
                <Separator className="my-6" />
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Sei già stato socio di Libera Energia?</Label>
                    <RadioGroup value={isFormerMember} onValueChange={handleIsFormerMemberChange} className="flex items-center gap-6">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes" />
                            <Label htmlFor="yes" className="font-normal">Sì</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no" />
                            <Label htmlFor="no" className="font-normal">No</Label>
                        </div>
                    </RadioGroup>
                </div>

                {isFormerMember === 'yes' && (
                    <div className="grid md:grid-cols-2 gap-4 mt-6 animate-in fade-in-50 duration-500">
                        <div className="space-y-2">
                            <Label htmlFor="start-year">Da che anno?</Label>
                             <Select onValueChange={setStartYear} value={startYear}>
                                <SelectTrigger id="start-year">
                                    <SelectValue placeholder="Seleziona l'anno" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grade">Il tuo grado:</Label>
                             <Select onValueChange={setGrade} value={grade}>
                                <SelectTrigger id="grade">
                                    <SelectValue placeholder="Seleziona il grado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {grades.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button disabled={isButtonDisabled()} className="bg-stone-800 text-amber-400 hover:bg-stone-700 disabled:bg-stone-800/50 disabled:text-amber-400/50">Entra in Libera Sphere</Button>
            </CardFooter>
        </Card>
    );
}
