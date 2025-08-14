
"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page is no longer used and will be removed.
// It redirects to the main subscriptions page.
export default function SeasonalSubscriptionRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/subscriptions');
    }, [router]);

    return null; // Render nothing while redirecting
}

    