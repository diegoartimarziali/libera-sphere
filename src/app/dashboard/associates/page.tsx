
'use client'

import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { AssociateEditForm } from "@/components/associate-edit-form";
import { useEffect, useState } from "react";

export default function AssociatesPage({ setRegulationsAccepted, setAssociated, setAssociationRequested }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void }) {
    const [hasUserData, setHasUserData] = useState(false);
    const [wantsToEdit, setWantsToEdit] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
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

    const handleWantsToEdit = (wantsToEdit: boolean) => {
        setWantsToEdit(wantsToEdit);
    };

    const handleDataSaved = () => {
        setHasUserData(true);
        setWantsToEdit(false);
        // We can optionally add a toast message here to confirm saving
    }

    if (!isClient) {
        return null; // or a loading skeleton
    }

    return (
        <div>
            {hasUserData ? (
                wantsToEdit ? (
                    <AssociateEditForm onSave={handleDataSaved} />
                ) : (
                    <AssociateCard 
                        setAssociated={setAssociated} 
                        setAssociationRequested={setAssociationRequested} 
                        setWantsToEdit={handleWantsToEdit} 
                    />
                )
            ) : (
                <AssociateForm setHasUserData={setHasUserData}/>
            )}
        </div>
    );
}
