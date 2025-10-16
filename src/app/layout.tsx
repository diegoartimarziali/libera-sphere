
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'LiberaSphere',
  description: 'Piattaforma di gestione per associazioni sportive di arti marziali',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Special+Elite&family=Noto+Serif:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
        <footer className="bg-dark-brown text-title-yellow border-t border-title-yellow/20 py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Logo e informazioni principali */}
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/libera-energia-soci.firebasestorage.app/o/grafimg%2Ftigre-M.png?alt=media&token=b5f3540f-ab42-46ed-9722-9c4e9663a97b"
                    alt="Logo Libera Energia"
                    className="w-auto object-contain"
                    style={{ height: '32px' }}
                  />
                  <div className="text-sm font-bold">
                    <span>Libera Energia</span>
                    <br />
                    <span>Arti Marziali</span>
                  </div>
                </div>
                <p className="text-xs opacity-80">Associazione Sportiva Dilettantistica</p>
              </div>

              {/* Informazioni centrali */}
              <div className="text-center">
                <p className="text-sm font-semibold mb-1">LiberaSphere v1.1.0</p>
                <p className="text-xs opacity-80">Piattaforma Motivazionale e di Gestione Associativa.</p>
              </div>

              {/* Copyright e sviluppatore */}
              <div className="text-center md:text-right">
                <p className="text-xs opacity-90 font-medium">© 2025 Libera Energia ASD</p>
                <p className="text-xs opacity-70 mt-1">Developed by Diego Carcassi</p>
                <p className="text-xs opacity-70">Designer & Full-stack Developer</p>
              </div>
            </div>

            {/* Linea separatrice e note legali */}
            <div className="border-t border-title-yellow/20 mt-4 pt-4">
              <p className="text-xs text-center opacity-60">
                Tutti i diritti riservati. Questa piattaforma è dedicata esclusivamente ai membri dell'associazione.
              </p>
            </div>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
