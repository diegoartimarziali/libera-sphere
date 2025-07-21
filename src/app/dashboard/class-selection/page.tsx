
'use client';

import { ClassSelection } from "@/components/class-selection";
import { useEffect, useState } from "react";

export default function ClassSelectionPage({ setLessonSelected }: { setLessonSelected?: (value: boolean) => void }) {
    const [initialStep, setInitialStep] = useState(1);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            // Check if the user has completed the data entry and payment selection part.
            // This is determined by the presence of key items in localStorage.
            const isDataComplete = localStorage.getItem('isSelectionPassportComplete') === 'true';
            const hasPaymentMethod = localStorage.getItem('paymentMethod');

            if (isDataComplete || hasPaymentMethod) {
                setInitialStep(2);
            } else {
                setInitialStep(1);
            }
        }
    }, []);

    if (!isClient) {
        return null; // Or a loading component
    }

    return (
        <div className="max-w-4xl mx-auto">
            <ClassSelection 
                setLessonSelected={setLessonSelected} 
                initialStep={initialStep}
            />
        </div>
    );
}
