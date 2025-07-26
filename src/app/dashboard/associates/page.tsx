
'use client'

import React, { useState } from "react";
import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { AssociateEditForm } from "@/components/associate-edit-form";

export default function AssociatesPage({ setRegulationsAccepted, setAssociated, setAssociationRequested, userData }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void, userData?: any }) {
    const [wantsToEdit, setWantsToEdit] = useState(false);

    const handleDataSaved = () => {
        setWantsToEdit(false);
        // Reload to ensure all data is fresh from the layout down
        window.location.reload(); 
    }

    // Determine whether to show the summary card based on a clear, single source of truth.
    const showSummary = userData?.associationStatus === 'requested' || userData?.associationStatus === 'approved';

    return (
        <div>
            {showSummary ? (
                wantsToEdit ? (
                    <AssociateEditForm onSave={handleDataSaved} userData={userData} />
                ) : (
                    <AssociateCard 
                        setAssociated={setAssociated} 
                        setAssociationRequested={setAssociationRequested} 
                        setWantsToEdit={setWantsToEdit} // Pass the setter directly
                        userData={userData}
                    />
                )
            ) : (
                <AssociateForm setHasUserData={() => {}} userData={userData} />
            )}
        </div>
    );
}
