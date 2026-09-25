"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function LookbookSection() {
  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const viewportConfig = { once: true, margin: "-100px" };

  return (
    <section
      className="w-full py-20 px-6 border-b border-border-subtle bg-surface-darkest"
      id="trabajos"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-mono tracking-[0.3em] uppercase text-neutral-400 block mb-2">
              Galería Técnica
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white uppercase tracking-tight">
              Cortes Reales
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* CORTE 1 */}
          <motion.article
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={cardVariants}
            className="bg-surface-card border border-border-subtle rounded-lg overflow-hidden group flex flex-col justify-between hover:border-neutral-500 transition-colors duration-300"
          >
            <div>
              <div className="relative aspect-square overflow-hidden bg-black">
                <Image
                  src="/corte-1.png"
                  alt="Low Skin Fade y Textured Crop en Peña Barber"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] tracking-widest uppercase font-mono text-white border border-white/20">
                  Fade & Textura
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="font-serif text-lg text-white font-medium">
                    Low Skin Fade & Textured Crop
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-light">
                  Degradado a ras desde cero bajo la nuca, textura francesa
                  cortada a navaja en coronilla y perfilado frontal geométrico
                  milimétrico.
                </p>
              </div>
            </div>
          </motion.article>

          {/* CORTE 2 */}
          <motion.article
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={cardVariants}
            transition={{ delay: 0.1 }}
            className="bg-surface-card border border-border-subtle rounded-lg overflow-hidden group flex flex-col justify-between hover:border-neutral-500 transition-colors duration-300"
          >
            <div>
              <div className="relative aspect-square overflow-hidden bg-black">
                <Image
                  src="/corte-2.png"
                  alt="Taper Clásico y Barba Esculpida por Mateo Peña"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] tracking-widest uppercase font-mono text-white border border-white/20">
                  Taper & Textura
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="font-serif text-lg text-white font-medium">
                    Taper & Textura
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-light">
                  [añadir texto opcional]
                </p>
              </div>
            </div>
          </motion.article>

          {/* CORTE 3 */}
          <motion.article
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={cardVariants}
            transition={{ delay: 0.2 }}
            className="bg-surface-card border border-border-subtle rounded-lg overflow-hidden group flex flex-col justify-between hover:border-neutral-500 transition-colors duration-300"
          >
            <div>
              <div className="relative aspect-square overflow-hidden bg-black">
                <Image
                  src="/corte-3.png"
                  alt="Modern Mullet y Pompadour Editorial"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] tracking-widest uppercase font-mono text-white border border-white/20">
                  Tijera & Fade
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="font-serif text-lg text-white font-medium">
                    Modern Mullet
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-light pb-4">
                  [añadir texto opcional]
                </p>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
