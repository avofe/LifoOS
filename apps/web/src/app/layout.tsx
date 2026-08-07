import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { AccessKeyModal } from "@/components/AccessKeyModal";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Personal life operating system",
  icons: "/favicon.svg",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable} bg-black text-zinc-200`}
    >
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)_+_3.5rem)] pt-[env(safe-area-inset-top)] md:ml-12 md:pb-0">
            {children}
          </div>
        </div>
        <MobileNav />
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
        <AccessKeyModal />
      </body>
    </html>
  );
}
