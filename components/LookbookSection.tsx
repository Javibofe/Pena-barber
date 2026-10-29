"use client";

import CircularCarousel, { CircularCarouselItem } from "./CircularCarousel";

const CORTE_ITEMS: CircularCarouselItem[] = [
  {
    src: "/corte-1.png",
    alt: "Mohicano - Fade & Textura",
    title: "Mohicano",
    subtitle: "Fade & Textura",
  },
  {
    src: "/corte-2.png",
    alt: "Taper Fade - Taper & Textura",
    title: "Taper & Textura",
    subtitle: "Taper Fade",
  },
  {
    src: "/corte-3.png",
    alt: "Modern Mullet - Mullet Clásico",
    title: "Modern Mullet",
    subtitle: "Mullet Clásico",
  },
  {
    src: "/corte-4.png",
    alt: "Skin Fade - Low Fade Limpio",
    title: "Skin Fade",
    subtitle: "Low Fade Limpio",
  },
  {
    src: "/corte-5.png",
    alt: "Textured Crop - Caída Natural",
    title: "Textured Crop",
    subtitle: "Caída Natural",
  },
  {
    src: "/corte-6.png",
    alt: "Burst Fade - Estilo Contemporáneo",
    title: "Burst Fade",
    subtitle: "Estilo Contemporáneo",
  },
  {
    src: "/corte-7.png",
    alt: "Mid Fade - Sombreado Preciso",
    title: "Mid Fade",
    subtitle: "Sombreado Preciso",
  },
  {
    src: "/corte-8.png",
    alt: "Drop Fade - Contorno Definido",
    title: "Drop Fade",
    subtitle: "Contorno Definido",
  },
  {
    src: "/corte-9.png",
    alt: "Classic Taper - Navaja Tradicional",
    title: "Classic Taper",
    subtitle: "Navaja Tradicional",
  },
  {
    src: "/corte-10.png",
    alt: "Buzz Cut Fade - Degradado Pulido",
    title: "Buzz Cut Fade",
    subtitle: "Degradado Pulido",
  },
  {
    src: "/corte-11.png",
    alt: "Pompadour Fade - Volumen & Estilo",
    title: "Pompadour Fade",
    subtitle: "Volumen & Estilo",
  },
  {
    src: "/corte-12.png",
    alt: "Perfilado & Barba - Navaja Clásica",
    title: "Arreglo & Barba",
    subtitle: "Perfilado a Navaja",
  },
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
            <span>←</span>
            <span>Arrastra para rotar la galería</span>
            <span>→</span>
          </div>
        </div>

        {/* Carrusel Circular 3D Panorámico de ReactBits */}
        <div className="relative w-full h-[580px] sm:h-[640px] md:h-[720px] lg:h-[760px] flex items-center justify-center">
          <CircularCarousel
            items={CORTE_ITEMS}
            preset="cylinder"
            intro="rise"
            autoplay="drift"
            speed={7}
            cardWidth={330}
            aspectRatio={0.82}
            gap={32}
            spread={1.12}
            window={3.3}
            captions={false}
            depthFade={0.65}
            fadeColor="#080808"
            cornerRadius={16}
          />
        </div>

        <p className="sm:hidden text-center font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-3">
          ← Desliza para explorar los 12 cortes en 3D →
        </p>
      </div>
    </section>
  );
}
