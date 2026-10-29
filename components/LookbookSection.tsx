"use client";

import DriftWall, { DriftWallItem } from "./DriftWall";

const CORTE_ITEMS: DriftWallItem[] = [
  { image: "/corte-1.png", title: "Mohicano - Fade & Textura" },
  { image: "/corte-2.png", title: "Taper Fade - Taper & Textura" },
  { image: "/corte-3.png", title: "Modern Mullet - Mullet Clásico" },
  { image: "/corte-4.png", title: "Skin Fade - Low Fade Limpio" },
  { image: "/corte-5.png", title: "Textured Crop - Caída Natural" },
  { image: "/corte-6.png", title: "Burst Fade - Estilo Contemporáneo" },
  { image: "/corte-7.png", title: "Mid Fade - Sombreado Preciso" },
  { image: "/corte-8.png", title: "Drop Fade - Contorno Definido" },
  { image: "/corte-9.png", title: "Classic Taper - Navaja Tradicional" },
  { image: "/corte-10.png", title: "Buzz Cut Fade - Degradado Pulido" },
  { image: "/corte-11.png", title: "Pompadour Fade - Volumen & Estilo" },
  { image: "/corte-12.png", title: "Perfilado & Barba - Navaja Clásica" },
];

export default function LookbookSection() {
  return (
    <section
      className="w-full py-16 sm:py-24 border-b border-border-subtle bg-surface-darkest overflow-hidden relative"
      id="trabajos"
    >
      <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-6">
        {/* Cabecera de Sección */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-10 max-w-6xl mx-auto px-4">
          <div>
            <span className="text-xs font-mono tracking-[0.3em] uppercase text-neutral-400 block mb-2">
              Galería Técnica
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white uppercase tracking-tight">
              Cortes Reales
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
            <span>✦</span>
            <span>Pasa el cursor para explorar en 3D</span>
            <span>✦</span>
          </div>
        </div>

        {/* Muro Drifting 3D de Cortes Reales */}
        <div className="relative w-full h-[620px] sm:h-[700px] md:h-[760px] flex items-center justify-center overflow-hidden">
          {/* Viñetas de difuminado superior e inferior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-surface-darkest via-surface-darkest/70 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface-darkest via-surface-darkest/70 to-transparent z-10" />

          {/* Viñetas laterales */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-surface-darkest to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-surface-darkest to-transparent z-10" />

          <DriftWall
            items={CORTE_ITEMS}
            columns={6}
            tileWidth={220}
            tileHeight={285}
            gap={20}
            radius={14}
            speed={32}
            tilt={14}
            turn={-8}
            perspective={1200}
            depth={110}
            parallax={0.55}
            fade={0.65}
            dim={0.7}
            lift={52}
            offsetX={-85}
            overlayColor="#080808"
          />
        </div>

        <p className="sm:hidden text-center font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-4">
          ✦ Toca cualquier corte para destacarlo en 3D ✦
        </p>
      </div>
    </section>
  );
}
