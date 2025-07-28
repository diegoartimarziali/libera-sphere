
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2016 + 1 }, (_, i) => String(currentYear - i));
const grades = [
  "bianca", "bianca/gialla", "gialla", "gialla/arancio", "arancio", 
  "verde", "blu", "viola", "marrone 2 kyu", "marrone 1 kyu", 
  "nera 1 dan", "nera 2 dan", "nera 3 dan", "nera 4 dan"
];

export default function LiberaSpherePage({ userData }: { userData?: any }) {
    const router = useRouter();
    const [isFormerMember, setIsFormerMember] = useState<string | undefined>();
    const [startYear, setStartYear] = useState<string | undefined>();
    const [grade, setGrade] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (userData && userData.isFormerMember !== null) {
            const destination = userData.isFormerMember === 'yes' ? '/dashboard/associates' : '/dashboard/class-selection';
            router.push(destination);
        }
    }, [userData, router]);

    const isButtonDisabled = () => {
        if (isLoading) return true;
        if (isFormerMember === 'yes') {
            return !startYear || !grade;
        }
        return !isFormerMember;
    };

    const handleIsFormerMemberChange = (value: string) => {
        setIsFormerMember(value);
        setStartYear(undefined);
        setGrade(undefined);
    };

    const handleEnterLiberaSphere = async () => {
        if (isButtonDisabled()) return;

        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
            console.error("User not authenticated");
            setIsLoading(false);
            return;
        }

        let dataToUpdate: any = {
            isFormerMember: isFormerMember
        };

        if (isFormerMember === 'no') {
            dataToUpdate.firstAssociationYear = String(currentYear);
            dataToUpdate.grade = 'Nessuno';
        } else if (isFormerMember === 'yes') {
            dataToUpdate.firstAssociationYear = startYear;
            dataToUpdate.grade = grade;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, dataToUpdate);

            // DIRECT and FORCED redirection.
            if (isFormerMember === 'yes') {
                window.location.href = '/dashboard/associates';
            } else {
                window.location.href = '/dashboard/class-selection';
            }

        } catch (error) {
            console.error("Error updating user document:", error);
            setIsLoading(false);
        }
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

                {isFormerMember === 'no' && (
                    <Alert className="mt-4">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Prossimo passo</AlertTitle>
                        <AlertDescription>
                            Procederai con l'iscrizione per le lezioni di selezione.
                        </AlertDescription>
                    </Alert>
                )}

                {isFormerMember === 'yes' && (
                     <Alert className="mt-4" variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Prossimo passo</AlertTitle>
                        <AlertDescription>
                            Procederai con la domanda di associazione per la nuova stagione.
                        </AlertDescription>
                    </Alert>
                )}

                {isFormerMember === 'yes' && (
                    <div className="grid md:grid-cols-2 gap-4 mt-6 animate-in fade-in-50 duration-500">
                        <div className="space-y-2">
                            <Label htmlFor="start-year" className="font-bold">Da che anno?</Label>
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
                            <Label htmlFor="grade" className="font-bold">il tuo grado attuale</Label>
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
                <Button 
                    onClick={handleEnterLiberaSphere} 
                    disabled={isButtonDisabled()} 
                    className="bg-stone-800 text-amber-400 hover:bg-stone-700 disabled:bg-stone-800/50 disabled:text-amber-400/50"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : "Prosegui"}
                </Button>
            </CardFooter>
        </Card>
    );
}

    