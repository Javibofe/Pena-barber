import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
};

export default function Privacidad() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <h1 className="font-serif text-3xl text-white mb-8">Política de Privacidad</h1>
      <div className="text-neutral-400 space-y-6 text-sm leading-relaxed">
        <p>
          En Peña Barber respetamos tu privacidad y nos comprometemos a proteger tus datos personales. 
          Esta política explica cómo recopilamos, utilizamos y protegemos la información cuando utilizas 
          nuestro sistema de reservas.
        </p>
        
        <h2 className="text-white text-lg font-serif mt-8 mb-4">1. Recopilación de datos</h2>
        <p>
          Para procesar tus reservas, solicitamos únicamente los datos estrictamente necesarios: 
          tu nombre y tu número de teléfono. Estos datos se utilizan exclusivamente para gestionar 
          tu cita y contactarte en caso de incidencias relacionadas con la misma.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">2. Finalidad del tratamiento</h2>
        <p>
          Los datos proporcionados serán utilizados para:<br/>
          - Confirmar, modificar o cancelar tus citas.<br/>
          - Identificarte al llegar a la barbería.<br/>
          - Llevar un control interno contra el fraude o ausencias injustificadas (No-Shows).
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">3. Derechos del usuario</h2>
        <p>
          Tienes derecho a acceder, rectificar o eliminar tus datos personales en cualquier momento. 
          Puedes ejercer estos derechos comunicándolo directamente en nuestro establecimiento físico 
          o a través del número de teléfono habilitado.
        </p>
      </div>
    </main>
  );
}
