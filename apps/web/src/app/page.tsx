import { TopBar } from "@/components/TopBar";
import { AiBrief } from "@/components/AiBrief";
import { StatsGrid } from "@/components/StatsGrid";
import { ScreenTimeCard } from "@/components/ScreenTimeCard";
import { RightPanel } from "@/components/RightPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 border-r border-zinc-800 p-4 sm:p-6">
        <TopBar />
        <ErrorBoundary label="AI брифинг">
          <AiBrief />
        </ErrorBoundary>
        <ErrorBoundary label="Статистика">
          <StatsGrid />
        </ErrorBoundary>
        <ErrorBoundary label="Экранное время">
          <ScreenTimeCard />
        </ErrorBoundary>
      </main>

      {/* Right panel */}
      <ErrorBoundary label="Правая панель">
        <RightPanel />
      </ErrorBoundary>
    </>
  );
}
