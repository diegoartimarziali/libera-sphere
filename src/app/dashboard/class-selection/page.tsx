import { ClassSelection } from "@/components/class-selection";

export default function ClassSelectionPage({ setLessonSelected }: { setLessonSelected?: (value: boolean) => void }) {
    return (
        <div className="max-w-4xl mx-auto">
            <ClassSelection setLessonSelected={setLessonSelected} />
        </div>
    );
}
