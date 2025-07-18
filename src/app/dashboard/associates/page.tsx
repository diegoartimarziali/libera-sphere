
'use client'

import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { useEffect, useState } from "react";

export default function AssociatesPage({ setRegulationsAccepted, setAssociated, setAssociationRequested }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void }) {
    const [hasUserData, setHasUserData] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // We check for essential data to determine if the user has already provided their info.
            const name = localStorage.getItem('userName');
            const codiceFiscale = localStorage.getItem('codiceFiscale');
            const birthDate = localStorage.getItem('birthDate');
            
            // If these essential pieces of information exist, we show the confirmation card.
            // Otherwise, we show the form to input the data.
            if (name && codiceFiscale && birthDate) {
                setHasUserData(true);
            } else {
                setHasUserData(false);
            }
        }
    }, []);

    return (
        <div>
            {hasUserData ? (
                <AssociateCard setAssociated={setAssociated} setAssociationRequested={setAssociationRequested} />
            ) : (
                <AssociateForm />
            )}
        </div>
    );
}
