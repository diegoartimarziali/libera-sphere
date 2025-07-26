import { RegulationsAcceptance } from "@/components/regulations-acceptance";

export default function RegulationsPage({ userData }: { userData?: any }) {
    return (
        <div className="max-w-4xl mx-auto">
            <RegulationsAcceptance userData={userData} />
        </div>
    );
}
