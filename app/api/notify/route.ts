import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientName, clientPhone, service, price, date, time } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const rawChatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !rawChatId) {
      console.warn("Telegram no configurado: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en .env.local");
      return NextResponse.json({
        success: false,
        warning: "Variables de entorno de Telegram no configuradas.",
      });
    }

    // Soporta uno o múltiples chat IDs separados por coma (ej: "123456789,987654321")
    const chatIds = rawChatId.split(",").map((id) => id.trim()).filter(Boolean);

    // Enlace directo para abrir chat de WhatsApp con el cliente
    const cleanPhone = clientPhone ? clientPhone.replace(/\D/g, "") : "";
    const waLink = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("34") ? cleanPhone : "34" + cleanPhone}`
      : null;

    const messageLines = [
      "💈 <b>¡NUEVA CITA CONFIRMADA!</b> 💈",
      "",
      `👤 <b>Cliente:</b> ${escapeHtml(clientName || "Sin nombre")}`,
      `📱 <b>Teléfono:</b> ${escapeHtml(clientPhone || "No indicado")}`,
      `✂️ <b>Servicio:</b> ${escapeHtml(service || "Corte")}${price ? ` (${escapeHtml(price)})` : ""}`,
      `🗓 <b>Fecha:</b> ${escapeHtml(date || "")}`,
      `⏰ <b>Hora:</b> ${escapeHtml(time || "")} hs`,
    ];

    if (waLink) {
      messageLines.push("", `💬 <a href="${waLink}">Contactar por WhatsApp</a>`);
    }

    const messageHtml = messageLines.join("\n");

    const sendPromises = chatIds.map(async (chatId) => {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageHtml,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error(`Error enviando a Telegram (chatId ${chatId}):`, errorData);
      }
      return res;
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, message: "Aviso enviado a Telegram con éxito" });
  } catch (error: any) {
    console.error("Error en /api/notify:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
