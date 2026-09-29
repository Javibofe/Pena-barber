import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { subscription, phone_number } = await request.json();

    if (!subscription || !phone_number) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (subscription o phone_number)." },
        { status: 400 }
      );
    }

    // Guardar la suscripción en Supabase
    const { data, error } = await supabase
      .from("push_subscriptions")
      .insert([{ phone_number, subscription }]);

    if (error) {
      console.error("Error al guardar suscripción en Supabase:", error);
      return NextResponse.json({ error: "Error de base de datos." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Suscripción guardada correctamente." });
  } catch (error: any) {
    console.error("Error en /api/push/subscribe:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
