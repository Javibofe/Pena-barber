"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12 border-b border-border-subtle bg-white" id="animacion">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center justify-center w-full mt-20"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-200 bg-neutral-100 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping"></span>
          <span className="text-[11px] tracking-[0.25em] text-neutral-600 uppercase font-mono">El Viso Del Alcor • Sillón Único</span>
        </div>
        
        <div className="text-center max-w-4xl mx-auto mb-8 flex flex-col items-center">
          <Image 
            src="/img/logo-pena.jpg" 
            alt="Peña Barber" 
            width={400} 
            height={150} 
            className="mb-4 mix-blend-multiply"
            priority
          />
          <p className="font-serif italic text-xl sm:text-2xl text-neutral-600 mt-2 font-light">
            El Arte del Corte de Peña
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <a className="px-8 py-3.5 rounded bg-black text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-neutral-800 transition-all text-center shadow-lg" href="#reserva">
            Reserva ya tu cita
          </a>
        </div>
      </motion.div>
    </section>
  );
}
