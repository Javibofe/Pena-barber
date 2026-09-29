import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso Legal",
};

export default function AvisoLegal() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <h1 className="font-serif text-3xl text-white mb-8">Aviso Legal</h1>
      <div className="text-neutral-400 space-y-6 text-sm leading-relaxed">
        <p>
          En cumplimiento con el deber de información recogido en el artículo 10 de la 
          Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del 
          Comercio Electrónico, a continuación se reflejan los siguientes datos:
        </p>
        
        <h2 className="text-white text-lg font-serif mt-8 mb-4">1. Identidad del titular web</h2>
        <p>
          La empresa titular de este dominio web es Germán Peña (en adelante, Peña Barber), 
          con domicilio a estos efectos en Av. de las Tinajas, 59, 41520 El Viso del Alcor, Sevilla.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">2. Usuarios</h2>
        <p>
          El acceso y/o uso de este portal atribuye la condición de USUARIO, que acepta, 
          desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas.
        </p>

        <h2 className="text-white text-lg font-serif mt-8 mb-4">3. Uso del portal</h2>
        <p>
          El sitio web proporciona el acceso a multitud de informaciones, servicios o 
          datos (en adelante, "los contenidos") en Internet pertenecientes a Peña Barber. 
          El USUARIO asume la responsabilidad del uso del portal.
        </p>
      </div>
    </main>
  );
}
