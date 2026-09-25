import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const viewport: Viewport = {
  themeColor: "#080808",
};

export const metadata: Metadata = {
  title: { 
    default: "Peña Barber | Peluquería y Barbería", 
    template: "%s | Peña Barber" 
  },
  description: "Tu barbería de confianza. Cortes de pelo, arreglos de barba y trato cercano. Reserva tu cita online rápido y sin complicaciones.",
  openGraph: { 
    type: "website", 
    locale: "es_ES",
    images: ["/og-image.jpg"]
  },
  appleWebApp: { 
    capable: true, 
    title: "Peña Barber", 
    statusBarStyle: "black-translucent" 
  },
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark scroll-smooth">
      <body className="bg-surface-darkest text-accent-white antialiased selection:bg-white selection:text-black">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}