"use client";

import { useState, useEffect } from "react";
import BellToggle from "./BellToggle";

interface PushManagerProps {
  phoneNumber: string;
  onSubscribeStatus?: (isSubscribed: boolean) => void;
}

// Función auxiliar para convertir la clave pública de VAPID (base64) a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushManager({ phoneNumber, onSubscribeStatus }: PushManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Solo comprobamos soporte, no ocultamos el botón automáticamente
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      // Opcional: registrar el SW preventivamente
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  const subscribeToPush = async () => {
    if (!phoneNumber) {
      setErrorMsg("Debes introducir un teléfono válido primero.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // Pedir permisos
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permiso de notificación denegado.");
      }

      // Asegurar que el Service Worker esté activo
      const registration = await navigator.serviceWorker.ready;

      // Obtener la clave pública desde variables de entorno de Next
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error("Clave VAPID no configurada en el cliente.");
      }

      // Limpiar suscripción previa si existía (evita error 'push service error' por token desfasado o corrupto en Google FCM)
      try {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
      } catch (cleanErr) {
        console.warn("Aviso al comprobar suscripción previa:", cleanErr);
      }

      // Crear la suscripción
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Enviar suscripción al backend
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber,
          subscription: subscription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al suscribir en el servidor.");
      }

      setIsSubscribed(true);
      if (onSubscribeStatus) onSubscribeStatus(true);
    } catch (err: any) {
      console.error("Error suscribiéndose:", err);
      const msg = err?.message || "";
      if (msg.includes("push service error") || msg.includes("Registration failed")) {
        setErrorMsg("Tu móvil no pudo conectar con el servicio de avisos de Google. Comprueba si tienes un bloqueador de publicidad (DNS Privado), ahorro de batería extremo o ábrelo directamente en Google Chrome.");
      } else if (msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("denegado")) {
        setErrorMsg("Permiso de notificaciones denegado en tu navegador.");
      } else {
        setErrorMsg(msg || "No se pudo activar las notificaciones.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Si no soporta notificaciones, ocultamos el componente
  }

  return (
    <div className="bg-surface-elevated/50 border border-border-subtle p-4 rounded-lg mt-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <div>
          <p className="text-sm text-white font-medium mb-1">Avisos de Cita (Opcional)</p>
          <p className="text-xs text-neutral-400 font-light leading-relaxed">
            Activa las notificaciones automáticas para recibir confirmaciones y recordatorios directamente en tu dispositivo sin necesidad de WhatsApp o correos.
          </p>
        </div>
      </div>
      
      {errorMsg && (
        <p className="text-xs text-red-400 font-mono mt-1">{errorMsg}</p>
      )}

      <div className="mt-2 self-start">
        <BellToggle
          pressed={isSubscribed}
          disabled={loading}
          offLabel={loading ? "Activando..." : "Activar Avisos"}
          onLabel="Avisos Activados"
          onChange={(pressed) => {
            if (pressed && !isSubscribed) {
              subscribeToPush();
            }
          }}
          background="#18181b"
          color="#f5f5f5"
          onBackground="#ffffff"
          onColor="#000000"
          clapper={true}
          waves={true}
          size="sm"
          radius={12}
        />
      </div>
    </div>
  );
}
