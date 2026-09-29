import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Cita",
};

export default function Terminos() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <h1 className="font-serif text-3xl text-white mb-8">Términos de Cita</h1>
      <div className="text-neutral-400 space-y-6 text-sm leading-relaxed">
        <p>
          Las siguientes condiciones rigen el proceso de reserva y asistencia a Peña Barber.
          Al realizar una reserva en nuestra web, aceptas estos términos en su totalidad.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">1. Política de Asistencia</h2>
        <p>
          Se ruega puntualidad. Recomendamos llegar 5 minutos antes de la hora reservada.
          Si llegas con un retraso superior a 10 minutos, nos reservamos el derecho a cancelar
          la cita para no perjudicar a los clientes posteriores.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">2. Cancelaciones</h2>
        <p>
          Si no puedes acudir a tu cita, te pedimos que la canceles con la mayor antelación
          posible contactando directamente con nosotros. Esto nos permite ofrecer tu hueco
          a otra persona.
        </p>
      </div>
    </main>
  );
}
