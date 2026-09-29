import { NextResponse } from "next/server";
import webPush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

webPush.setVapidDetails(
  "mailto:contacto@penabarber.com",
  vapidPublicKey,
  vapidPrivateKey
);

export async function POST(request: Request) {
  try {
    const { phone_number, title, message, url } = await request.json();

    if (!phone_number || !title || !message) {
      return NextResponse.json(
        { error: "Faltan datos (phone_number, title o message)." },
        { status: 400 }
      );
    }

    // Buscar la suscripción del teléfono
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("phone_number", phone_number);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron suscripciones para ese número." },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: title,
      body: message,
      url: url || "/"
    });

    let successCount = 0;
    
    // Enviar a todas las suscripciones asociadas a ese número (si tiene varios dispositivos)
    for (const sub of subs) {
      try {
        await webPush.sendNotification(sub.subscription, payload);
        successCount++;
      } catch (err: any) {
        console.error("Error al enviar notificación:", err);
        // Aquí podríamos borrar la suscripción si err.statusCode === 410 (Gone)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Notificación enviada a ${successCount} dispositivos.` 
    });
  } catch (error: any) {
    console.error("Error en /api/push/test:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
