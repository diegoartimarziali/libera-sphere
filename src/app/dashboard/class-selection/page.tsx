
'use client';

import { ClassSelection } from "@/components/class-selection";
import { useEffect, useState } from "react";

export default function ClassSelectionPage({ setLessonSelected, userData }: { setLessonSelected?: (value: boolean) => void, userData?: any }) {
    const [initialStep, setInitialStep] = useState(1);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (userData) {
            const isDataComplete = userData.isSelectionPassportComplete;
            const hasPaymentMethod = userData.paymentMethod;

            if (isDataComplete || hasPaymentMethod) {
                setInitialStep(2);
            } else {
                setInitialStep(1);
            }
        }
    }, [userData]);

    if (!isClient) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <ClassSelection 
                setLessonSelected={setLessonSelected} 
                initialStep={initialStep}
                userData={userData}
            />
        </div>
    );
}

    