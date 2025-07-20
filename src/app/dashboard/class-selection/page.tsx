
'use client';

import { ClassSelection } from "@/components/class-selection";
import { useEffect, useState } from "react";

export default function ClassSelectionPage({ setLessonSelected }: { setLessonSelected?: (value: boolean) => void }) {
    const [isCompleted, setIsCompleted] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            const completed = localStorage.getItem('isDojoPassportComplete') === 'true';
            setIsCompleted(completed);
        }
    }, []);

    if (!isClient) {
        return null; // o un componente di caricamento
    }

    return (
        <div className="max-w-4xl mx-auto">
            <ClassSelection 
                setLessonSelected={setLessonSelected} 
                initialStep={isCompleted ? 2 : 1}
            />
        </div>
    );
}
