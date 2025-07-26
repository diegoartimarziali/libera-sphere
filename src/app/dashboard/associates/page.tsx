
'use client'

import React, { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { Loader2 } from "lucide-react";

export default function AssociatesPage({ userData }: { userData?: any }) {
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState<any>(null);
    const [showSummary, setShowSummary] = useState(false);
    
    // This effect runs only once on mount to handle the case where we return from payment
    useEffect(() => {
        const shouldShowSummaryFromUrl = searchParams.get('showSummary') === 'true';
        if (shouldShowSummaryFromUrl) {
            const storedData = localStorage.getItem('associationFormData');
            if (storedData) {
                setFormData(JSON.parse(storedData));
            }
            setShowSummary(true);
        }
    }, [searchParams]);

    // This effect reacts to userData changes to decide the initial view
    useEffect(() => {
        if (userData) {
            const isAlreadyMember = userData.associationStatus === 'approved';
            const hasRequested = userData.associationStatus === 'requested';

            if (isAlreadyMember || hasRequested) {
                // If user is already a member or has a pending request, show their data from DB
                setFormData(userData);
                setShowSummary(true);
            }
        }
    }, [userData]);


    const handleFormSubmit = (data: any) => {
        // When the form is submitted, we save data to localStorage and show the summary card.
        // This data will be used by the AssociateCard.
        localStorage.setItem('associationFormData', JSON.stringify(data));
        setFormData(data);
        setShowSummary(true);
    };

    const handleBackToForm = () => {
        // If the user wants to edit data from the summary card,
        // we clear the localStorage and show the form again.
        localStorage.removeItem('associationFormData');
        setShowSummary(false);
    }
    
    if (!userData) {
         return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Caricamento...</p>
            </div>
        );
    }

    return (
        <div>
            {showSummary ? (
                <AssociateCard 
                    initialData={formData} 
                    onBack={handleBackToForm}
                />
            ) : (
                <AssociateForm 
                    initialData={formData} // Pass existing data (from userData or previous attempt) to pre-fill the form
                    onFormSubmit={handleFormSubmit} 
                />
            )}
        </div>
    );
}
