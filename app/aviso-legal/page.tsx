import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso Legal — Peña Barber",
};

export default function AvisoLegal() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <h1 className="font-serif text-3xl text-white mb-8">Aviso Legal</h1>
      <div className="text-neutral-400 space-y-6 text-sm leading-relaxed">
        <p>
          En cumplimiento con el deber de información recogido en el artículo 10 de la 
          <strong> Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del 
          Comercio Electrónico (LSSI-CE)</strong>, a continuación se reflejan los datos identificativos
          del titular del sitio web:
        </p>
        
        <h2 className="text-white text-lg font-serif mt-8 mb-4">1. Identidad del titular web</h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2.5 font-mono text-xs text-neutral-300">
          <p><strong className="text-white">Titular / Razón Social:</strong> Germán Peña Jiménez (Peña Barber)</p>
          <p><strong className="text-white">NIF / CIF:</strong> [Pendiente de indicar DNI/NIF del titular]</p>
          <p><strong className="text-white">Domicilio de la actividad:</strong> Av. de las Tinajas, 59, 41520 El Viso del Alcor, Sevilla</p>
          <p><strong className="text-white">Teléfono / WhatsApp:</strong> +34 604 40 75 25</p>
          <p><strong className="text-white">Email de contacto:</strong> contacto@penabarber.com</p>
          <p><strong className="text-white">Actividad:</strong> Servicios de peluquería y barbería masculina bajo cita previa</p>
        </div>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">2. Condiciones Generales de Uso</h2>
        <p>
          El acceso y/o uso de este portal web atribuye la condición de USUARIO, que acepta, 
          desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas.
          El portal web está concebido principalmente como herramienta de cita previa y catálogo
          de servicios para los clientes de Peña Barber.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">3. Propiedad Intelectual e Industrial</h2>
        <p>
          Peña Barber es titular de todos los derechos de propiedad intelectual e industrial 
          de su página web, así como de los elementos contenidos en la misma (a título enunciativo: 
          imágenes, fotografías del lookbook, logotipo, combinaciones de colores, estructura y diseño).
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">4. Exclusión de garantías y responsabilidad</h2>
        <p>
          Peña Barber no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier 
          naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, 
          falta de disponibilidad del portal o la transmisión de virus o programas maliciosos, 
          a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">5. Legislación aplicable y jurisdicción</h2>
        <p>
          La relación entre Peña Barber y el USUARIO se regirá por la normativa española vigente.
          Cualquier controversia se someterá a los Juzgados y Tribunales de Sevilla.
        </p>
      </div>
    </main>
  );
}
