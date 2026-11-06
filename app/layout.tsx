import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Le Carnet Gourmand",
  description: "Mes recettes, mes essais et mes ajustements, toujours sous la main.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Gourmand", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#D95D39",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${nunito.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
