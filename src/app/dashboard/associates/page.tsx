
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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Pre-fill form data from userData if available
        if (userData) {
            setFormData(prev => ({ ...prev, ...userData }));
        }

        // Logic to decide whether to show the form or the summary card
        const isAlreadyMember = userData?.associationStatus === 'approved';
        const hasRequested = userData?.associationStatus === 'requested';
        const shouldShowSummaryFromUrl = searchParams.get('showSummary') === 'true';

        if (isAlreadyMember || hasRequested) {
            setShowSummary(true);
        } else if (shouldShowSummaryFromUrl) {
            // This handles the return from the payment gateway
            // We need to retrieve the form data somehow, for now we just show the card
            // but the data might be lost. A better approach would be to store it in localStorage
            // before redirecting to payment. For now, let's just control the view.
            const storedData = localStorage.getItem('associationFormData');
            if (storedData) {
                setFormData(JSON.parse(storedData));
            }
            setShowSummary(true);
        }
        setIsLoading(false);
    }, [userData, searchParams]);

    const handleFormSubmit = (data: any) => {
        // Store data in localStorage before showing summary/redirecting
        localStorage.setItem('associationFormData', JSON.stringify(data));
        setFormData(data);
        setShowSummary(true);
    };

    const handleBackToForm = () => {
        setShowSummary(false);
    }
    
    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Caricamento...</p>
            </div>
        );
    }

    // This logic ensures that if we are supposed to see the summary, we see it with the available data.
    // The formData from userData will be used if the user is already a member.
    // The formData from the form submission (via localStorage or state) will be used for new applicants.
    const summaryData = showSummary ? (formData || userData) : null;


    return (
        <div>
            {showSummary ? (
                <AssociateCard 
                    initialData={summaryData} 
                    onBack={handleBackToForm}
                />
            ) : (
                <AssociateForm 
                    initialData={formData} // Pass existing data to pre-fill the form
                    onFormSubmit={handleFormSubmit} 
                />
            )}
        </div>
    );
}
