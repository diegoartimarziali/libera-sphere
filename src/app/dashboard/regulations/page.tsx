import { RegulationsAcceptance } from "@/components/regulations-acceptance";

export default function RegulationsPage({ setRegulationsAccepted, setAssociated }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void }) {
    return (
        <div className="max-w-4xl mx-auto">
            <RegulationsAcceptance setRegulationsAccepted={setRegulationsAccepted} />
        </div>
    );
}
