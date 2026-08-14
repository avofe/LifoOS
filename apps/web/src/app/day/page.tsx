import { PageHeader } from "@/components/PageHeader";
import { PlanSection } from "@/components/day/PlanSection";
import { HabitsSection } from "@/components/day/HabitsSection";

export default function DayPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 bg-black p-4 sm:p-6">
      <PageHeader
        title="День · ритм"
        subtitle="Задачи и привычки — то, из чего складывается день"
      />

      <PlanSection />

      <HabitsSection />
    </div>
  );
}
