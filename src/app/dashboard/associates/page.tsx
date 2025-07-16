import { AssociateCard } from "@/components/associate-card";

export default function AssociatesPage({ setRegulationsAccepted, setAssociated }: { setRegulationsAccepted?: (value: boolean) => void, setAssociated?: (value: boolean) => void }) {
    return (
        <div>
            <AssociateCard setAssociated={setAssociated} />
        </div>
    );
}
