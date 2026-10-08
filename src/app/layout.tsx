import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StudyMoon — Preparação gratuita para o ENEM",
    template: "%s · StudyMoon",
  },
  description:
    "Plataforma gratuita que prepara você para o ENEM do zero ao avançado: aulas com demonstrações interativas, prática adaptativa, revisão inteligente, simulados e correção de redação por IA.",
  keywords: [
    "ENEM",
    "estudo",
    "grátis",
    "simulado",
    "redação",
    "questões",
    "repetição espaçada",
  ],
  applicationName: "StudyMoon",
  manifest: "/manifest.json",
  openGraph: {
    title: "StudyMoon — Preparação gratuita para o ENEM",
    description:
      "Estude para o ENEM de graça, do zero ao avançado, com um plano que se adapta a você.",
    siteName: "StudyMoon",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070812" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6fb" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
