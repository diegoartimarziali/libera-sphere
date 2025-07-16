
'use client'

import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { useEffect, useState } from "react";

export default function AssociatesPage({ setRegulationsAccepted, setAssociated }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void }) {
    const [hasUserData, setHasUserData] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const name = localStorage.getItem('userName');
            const lessonSelected = localStorage.getItem('lessonSelected');
            // We consider user data present if they have a name and have either
            // gone through the selection process or have existing data.
            // For now, `lessonSelected` is a good proxy.
            if (name && lessonSelected === 'true') {
                setHasUserData(true);
            }
        }
    }, []);

    return (
        <div>
            {hasUserData ? (
                <AssociateCard setAssociated={setAssociated} />
            ) : (
                <AssociateForm />
            )}
        </div>
    );
}
