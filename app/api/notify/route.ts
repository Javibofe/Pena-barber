import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientName, clientPhone, service, date, time } = body;

    // Aquí iría la integración real con un servicio de correos como Resend o SendGrid.
    // Ejemplo con Resend (necesitarías npm install resend y una API KEY):
    /*
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'Reservas Peña Barber <reservas@tudominio.com>',
      to: ['correo_de_german@gmail.com'],
      subject: `Nueva reserva: ${clientName} - ${date} a las ${time}`,
      html: `
        <h2>¡Tienes una nueva cita, Germán!</h2>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Teléfono:</strong> ${clientPhone}</p>
        <p><strong>Servicio:</strong> ${service}</p>
        <p><strong>Cuándo:</strong> ${date} a las ${time}</p>
      `
    });
    */

    // Por ahora, simulamos el envío logueando en el servidor:
    console.log("=========================================");
    console.log("📩 NUEVA RESERVA RECIBIDA (Email simulación)");
    console.log(`Cliente: ${clientName} (${clientPhone})`);
    console.log(`Cita: ${date} a las ${time} - ${service}`);
    console.log("=========================================");

    return NextResponse.json({ success: true, message: "Notificación enviada (simulada)" });
  } catch (error: any) {
    console.error("Error enviando notificación:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
