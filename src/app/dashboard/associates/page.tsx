

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
    
    useEffect(() => {
        // This effect runs to handle returning from payment or if data is already in progress
        const shouldShowSummaryFromUrl = searchParams.get('showSummary') === 'true';
        if (shouldShowSummaryFromUrl) {
            const storedData = localStorage.getItem('associationFormData');
            if (storedData) {
                setFormData(JSON.parse(storedData));
                setShowSummary(true);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        // This effect handles showing the summary if the user is already associated or has a pending request
        if (userData?.associationStatus === 'requested' || userData?.associationStatus === 'approved') {
            setFormData(userData);
            setShowSummary(true);
        }
    }, [userData]);


    const handleFormSubmit = (data: any) => {
        localStorage.setItem('associationFormData', JSON.stringify(data));
        setFormData(data);
        setShowSummary(true);
    };

    const handleBackToForm = () => {
        localStorage.removeItem('associationFormData');
        setShowSummary(false);
        // Also remove the URL param to avoid being stuck on the summary page on reload
        const newUrl = window.location.pathname;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
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
                    initialData={userData} // Pass userData to pre-fill the form with any existing data
                    onFormSubmit={handleFormSubmit} 
                />
            )}
        </div>
    );
}
