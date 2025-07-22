
'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LiberaSpherePage() {
    const [isFormerMember, setIsFormerMember] = useState<string | undefined>();

    return (
        <Card>
            <CardHeader>
                <CardTitle>LiberaSphere</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a.
                </p>
                <Separator className="my-6" />
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Sei già stato socio di Libera Energia?</Label>
                    <RadioGroup value={isFormerMember} onValueChange={setIsFormerMember} className="flex items-center gap-6">
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
            </CardContent>
        </Card>
    )
}
