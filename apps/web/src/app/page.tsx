import { TopBar } from "@/components/TopBar";
import { DaySummary } from "@/components/home/DaySummary";
import { RightPanel } from "@/components/RightPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WeatherWidget } from "@/components/home/WeatherWidget";
import { ScreenTimeSection } from "@/components/home/ScreenTimeSection";
import { SubsSection } from "@/components/home/SubsSection";
import { YoutubeSection } from "@/components/home/YoutubeSection";
import { TwitchSection } from "@/components/home/TwitchSection";
import { DevicesSection } from "@/components/home/DevicesSection";

export default function Home() {
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 border-r border-zinc-800 p-4 sm:p-6">
        <TopBar />
        <ErrorBoundary label="Сводка дня">
          <DaySummary />
        </ErrorBoundary>

        <ErrorBoundary label="Погода">
          <WeatherWidget />
        </ErrorBoundary>

        <ErrorBoundary label="Экранное время">
          <ScreenTimeSection />
        </ErrorBoundary>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ErrorBoundary label="Подписки">
            <SubsSection />
          </ErrorBoundary>
          <ErrorBoundary label="YouTube">
            <YoutubeSection />
          </ErrorBoundary>
          <ErrorBoundary label="Twitch">
            <TwitchSection />
          </ErrorBoundary>
          <ErrorBoundary label="Устройства">
            <DevicesSection />
          </ErrorBoundary>
        </div>
      </main>

      {/* Right panel */}
      <ErrorBoundary label="Правая панель">
        <RightPanel />
      </ErrorBoundary>
    </>
  );
}
