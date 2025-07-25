
'use client'

import React, { useEffect, useState } from "react";
import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { AssociateEditForm } from "@/components/associate-edit-form";
import { useSearchParams } from "next/navigation";

export default function AssociatesPage({ setRegulationsAccepted, setAssociated, setAssociationRequested, userData }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void, userData?: any }) {
    const [hasUserData, setHasUserData] = useState(false);
    const [wantsToEdit, setWantsToEdit] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [forceShowForm, setForceShowForm] = useState(false);

    // We can't use useSearchParams at the top level in page.tsx
    // So we create a simple wrapper component.
    const SearchParamComponent = () => {
        const searchParams = useSearchParams();
        useEffect(() => {
            if (searchParams.get('fromSelection') === 'true' || searchParams.get('renewal') === 'true') {
                setForceShowForm(true);
            }
        }, [searchParams]);
        return null;
    }

    useEffect(() => {
        setIsClient(true);
        if (userData) {
            const { name, codiceFiscale, birthDate } = userData;
            if (name && codiceFiscale && birthDate) {
                setHasUserData(true);
            } else {
                setHasUserData(false);
            }
        }
    }, [userData]);

    const handleWantsToEdit = (wantsToEdit: boolean) => {
        setWantsToEdit(wantsToEdit);
    };

    const handleDataSaved = () => {
        setHasUserData(true);
        setWantsToEdit(false);
    }

    if (!isClient) {
        return null;
    }

    return (
        <div>
            <React.Suspense fallback={<div>Caricamento...</div>}>
                <SearchParamComponent />
            </React.Suspense>
            {(hasUserData && !forceShowForm) ? (
                wantsToEdit ? (
                    <AssociateEditForm onSave={handleDataSaved} />
                ) : (
                    <AssociateCard 
                        setAssociated={setAssociated} 
                        setAssociationRequested={setAssociationRequested} 
                        setWantsToEdit={handleWantsToEdit} 
                        userData={userData}
                    />
                )
            ) : (
                <AssociateForm setHasUserData={setHasUserData} userData={userData} />
            )}
        </div>
    );
}
