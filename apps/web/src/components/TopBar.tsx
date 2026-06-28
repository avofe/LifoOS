import { ClockAndStatus } from "./ClockAndStatus";

export function TopBar() {
  return (
    <div className="flex items-center justify-between pb-1">
      <ClockAndStatus />
    </div>
  );
}
