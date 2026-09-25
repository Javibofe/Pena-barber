"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Persistencia: no mostrar si el usuario lo cerró en los últimos 15 días
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 15) {
        return; // Aún dentro del periodo de 15 días
      }
    }

    // 2. Comprobar si la app ya está instalada (Standalone)
    const isStandAloneMatch = window.matchMedia("(display-mode: standalone)").matches;
    const isNavStandalone = (navigator as any).standalone === true;
    const currentlyStandalone = isStandAloneMatch || isNavStandalone;

    if (currentlyStandalone) return;

    // 3. Detectar si es iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // En iOS no existe beforeinstallprompt, lo mostramos manualmente
      setShowPrompt(true);
    }

    // 4. Lógica Android (Chrome/Edge): interceptar el prompt nativo
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
      >
        <div className="bg-surface-elevated/95 backdrop-blur-xl border border-border-light rounded-2xl p-4 shadow-2xl max-w-sm w-full pointer-events-auto flex items-start gap-4">
          <div className="flex-1">
            {isIOS ? (
              <div className="text-sm text-neutral-300 font-light leading-relaxed">
                <p className="mb-2 text-white font-medium">Instalar Aplicación</p>
                Para instalar la app, pulsa el botón{" "}
                <span className="inline-flex items-center justify-center bg-white/10 rounded p-1 mx-0.5 align-middle">
                  {/* Icono Compartir genérico de iOS */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </span>
                Compartir y selecciona <strong className="text-white">'Añadir a la pantalla de inicio'</strong>{" "}
                <span className="inline-flex items-center justify-center bg-white/10 rounded p-1 mx-0.5 align-middle">
                  {/* Icono Plus */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-white font-medium mb-1">Peña Barber App</p>
                <p className="text-xs text-neutral-400 mb-3 leading-relaxed">Instala nuestra app en tu dispositivo para un acceso más rápido a tus reservas.</p>
                <button
                  onClick={handleInstall}
                  className="bg-white text-black text-xs font-bold uppercase tracking-widest py-2.5 px-4 rounded hover:bg-neutral-200 transition-colors self-start shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                >
                  Instalar App
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-neutral-500 hover:text-white transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded-full mt-1"
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
