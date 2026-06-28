import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Personal life operating system",
  icons: "/favicon.svg",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="bg-black text-zinc-200">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="ml-12 flex min-h-0 flex-1 overflow-hidden">
            {children}
          </div>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1A1A2E",
              border: "1px solid #2D2D44",
              color: "#E4E4E7",
            },
          }}
        />
      </body>
    </html>
  );
}
