import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configuración de Web Push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    "mailto:contacto@penabarber.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function GET(request: Request) {
  try {
    // 1. Verificar seguridad del CRON
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Si tenemos configurada una contraseña en Vercel, la exigimos
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Definir ventana de tiempo (desde AHORA hasta dentro de 65 minutos)
    const now = new Date();
    const in65Mins = new Date(now.getTime() + 65 * 60000);

    // 3. Buscar citas confirmadas en esa ventana que NO hayan sido recordadas
    const { data: appts, error: apptError } = await supabase
      .from("appointments")
      .select("id, appointment_date, clients(phone, full_name)")
      .eq("status", "confirmed")
      .eq("reminded", false)
      .gte("appointment_date", now.toISOString())
      .lte("appointment_date", in65Mins.toISOString());

    if (apptError) throw apptError;
    if (!appts || appts.length === 0) {
      return NextResponse.json({ success: true, message: "No hay citas para recordar en la próxima hora." });
    }

    let remindersSent = 0;

    // 4. Por cada cita, buscar suscripciones y enviar push
    for (const appt of appts) {
      const client = appt.clients as any;
      if (!client || !client.phone) continue;

      // Buscar si este teléfono tiene notificaciones web activadas
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("phone_number", client.phone);

      if (subs && subs.length > 0) {
        const timeFormatted = new Date(appt.appointment_date).toLocaleTimeString("es-ES", { 
          hour: "2-digit", 
          minute: "2-digit",
          timeZone: "Europe/Madrid"
        });
        
        const payload = JSON.stringify({
          title: "¡Tu cita es en 1 hora!",
          body: `Hola ${client.full_name}, te recordamos tu reserva hoy a las ${timeFormatted}.`,
          url: "/"
        });

        for (const sub of subs) {
          try {
            await webPush.sendNotification(sub.subscription, payload);
            remindersSent++;
          } catch (err) {
            console.error("Fallo al enviar push al teléfono", client.phone, ":", err);
          }
        }
      }

      // 5. Marcar como recordado para no volver a enviar (incluso si no tiene Push activado)
      await supabase
        .from("appointments")
        .update({ reminded: true })
        .eq("id", appt.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Proceso finalizado. Avisos enviados: ${remindersSent}` 
    });

  } catch (error: any) {
    console.error("Error en cron de recordatorios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
