
'use client'

import React, { useState, useEffect } from "react";
import { AssociateCard } from "@/components/associate-card";
import { AssociateForm } from "@/components/associate-form";
import { Loader2 } from "lucide-react";

export default function AssociatesPage({ userData }: { userData?: any }) {
    const [formData, setFormData] = useState<any>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userData) {
            // If user has already submitted (status is 'requested' or 'approved'),
            // show the summary card immediately with data from Firestore.
            if (userData.associationStatus === 'requested' || userData.associationStatus === 'approved') {
                setFormData(userData); // Use Firestore data
                setShowSummary(true);
            }
        }
        setIsLoading(false);
    }, [userData]);

    const handleFormSubmit = (data: any) => {
        setFormData(data);
        setShowSummary(true);
    };

    const handleBackToForm = () => {
        // This function allows the user to go back and edit their data
        // from the summary card before final submission.
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

    return (
        <div>
            {showSummary ? (
                <AssociateCard 
                    initialData={formData} 
                    onBack={handleBackToForm}
                />
            ) : (
                <AssociateForm 
                    initialData={formData || userData} // Pass existing data to pre-fill the form
                    onFormSubmit={handleFormSubmit} 
                />
            )}
        </div>
    );
}
