"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MyBookingsModal from "@/components/MyBookingsModal";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);

  const menuItems = [
    { name: "Cortes Reales", href: "/#trabajos" },
    { name: "Horarios", href: "/#reserva" },
    { name: "Opiniones", href: "/#opiniones" },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/90 backdrop-blur-md border-b border-border-subtle transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a className="flex items-center gap-3 group" href="/">
            <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-white text-xs font-serif font-bold group-hover:border-white transition-colors">
              P
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif tracking-[0.25em] text-lg font-bold text-white uppercase">Peña</span>
              <span className="text-[9px] tracking-[0.35em] text-neutral-400 uppercase font-light">Barber</span>
            </div>
          </a>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-[0.18em] uppercase font-medium text-neutral-400">
            {menuItems.map((item) => (
              <a key={item.name} className="hover:text-white transition-colors duration-200" href={item.href}>
                {item.name}
              </a>
            ))}
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Botón Calendario Discreto (sólo icono, sin texto) */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMyBookingsOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-white/15 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-colors shadow-sm"
              title="Consultar mis citas"
              aria-label="Consultar mis citas"
            >
              <img
                src="/calendar-icon.png"
                alt="Consultar citas"
                className="w-5 h-5 object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            </motion.button>

            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex px-5 py-2.5 rounded text-xs uppercase tracking-[0.18em] font-semibold bg-white text-black hover:bg-neutral-200 transition-colors shadow-sm items-center gap-2"
              href="/#reserva"
            >
              <span>Pedir Cita</span>
            </motion.a>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden flex flex-col items-center justify-center w-10 h-10 gap-1.5 focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Abrir menú"
            >
              <motion.span
                animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                className="w-6 h-[2px] bg-white block rounded-full transition-all"
              />
              <motion.span
                animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-6 h-[2px] bg-white block rounded-full transition-all"
              />
              <motion.span
                animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                className="w-6 h-[2px] bg-white block rounded-full transition-all"
              />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#080808]/95 backdrop-blur-xl pt-24 px-6 md:hidden flex flex-col items-center"
          >
            <nav className="flex flex-col items-center gap-7 mt-8 w-full max-w-xs">
              {menuItems.map((item, i) => (
                <motion.a
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={item.name}
                  onClick={() => setIsOpen(false)}
                  className="text-xl tracking-[0.2em] uppercase font-serif text-white hover:text-neutral-300 transition-colors"
                  href={item.href}
                >
                  {item.name}
                </motion.a>
              ))}

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsMyBookingsOpen(true);
                }}
                className="mt-2 flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs uppercase tracking-[0.18em] font-mono text-neutral-200 border border-white/20 hover:border-white transition-colors w-full bg-white/5"
              >
                <img src="/calendar-icon.png" alt="" className="w-4 h-4 object-contain opacity-90" />
                <span>Consultar Mis Citas</span>
              </button>

              <motion.a
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => setIsOpen(false)}
                className="mt-3 px-8 py-3 rounded-lg text-sm uppercase tracking-[0.18em] font-semibold bg-white text-black text-center w-full shadow-lg"
                href="/#reserva"
              >
                Pedir Cita
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Consulta Mis Citas */}
      <MyBookingsModal
        isOpen={isMyBookingsOpen}
        onClose={() => setIsMyBookingsOpen(false)}
      />
    </>
  );
}
