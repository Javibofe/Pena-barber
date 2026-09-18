"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Tijeras verticales realistas: anillas abajo, puntas arriba.
// El pivote está en el centro del cuerpo.
// leftAngle rota la hoja izquierda (negativo = abre hacia la izquierda)
// rightAngle rota la hoja derecha (positivo = abre hacia la derecha)
// ─────────────────────────────────────────────────────────────────────────────
function ScissorsSVG({
  leftAngle,
  rightAngle,
}: {
  leftAngle: any;
  rightAngle: any;
}) {
  const PX = 40;
  const PY = 105;
  const origin = `${PX}px ${PY}px`;

  return (
    <svg
      viewBox="0 0 80 210"
      width="72"
      height="189"
      style={{
        overflow: "visible",
        filter: "drop-shadow(1px 3px 14px rgba(0,0,0,0.75))",
      }}
    >
      <defs>
        <linearGradient id="sg-bladeL" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#444" />
          <stop offset="30%"  stopColor="#c0c0c0" />
          <stop offset="55%"  stopColor="#e0e0e0" />
          <stop offset="100%" stopColor="#777" />
        </linearGradient>
        <linearGradient id="sg-bladeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#777" />
          <stop offset="45%"  stopColor="#e0e0e0" />
          <stop offset="70%"  stopColor="#c0c0c0" />
          <stop offset="100%" stopColor="#444" />
        </linearGradient>
        <radialGradient id="sg-ring" cx="38%" cy="38%" r="55%">
          <stop offset="0%"  stopColor="#e8e8e8" />
          <stop offset="65%" stopColor="#b0b0b0" />
          <stop offset="100%" stopColor="#555" />
        </radialGradient>
        <radialGradient id="sg-screw" cx="35%" cy="35%" r="55%">
          <stop offset="0%"  stopColor="#ddd" />
          <stop offset="55%" stopColor="#888" />
          <stop offset="100%" stopColor="#222" />
        </radialGradient>
      </defs>

      {/* ── Hoja IZQUIERDA + anilla ── */}
      <motion.g
        style={{ rotate: leftAngle, transformOrigin: origin, willChange: "transform" }}
      >
        {/* Anilla exterior */}
        <circle cx="16" cy="188" r="20" fill="none" stroke="#111" strokeWidth="4.5" />
        {/* Anilla relleno metálico */}
        <circle cx="16" cy="188" r="15.5" fill="url(#sg-ring)" />
        {/* Agujero del dedo */}
        <circle cx="16" cy="188" r="8"  fill="none" stroke="#444" strokeWidth="2" />
        {/* Brazo que conecta anilla con pivote */}
        <path
          d="M26 170 Q32 145 40 105"
          stroke="#1a1a1a" strokeWidth="8" fill="none" strokeLinecap="round"
        />
        <path
          d="M27 169 Q33 144 40 105"
          stroke="#666" strokeWidth="4" fill="none" strokeLinecap="round"
        />
        {/* Hoja: se estrecha desde el pivote hasta la punta */}
        <path
          d="M40 105 Q37 62 39 6 L44 8 Q42 62 45 105 Z"
          fill="url(#sg-bladeL)"
        />
        {/* Filo de la hoja (borde brillante) */}
        <path
          d="M40 105 Q37 62 39 6"
          stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" fill="none"
        />
      </motion.g>

      {/* ── Hoja DERECHA + anilla ── */}
      <motion.g
        style={{ rotate: rightAngle, transformOrigin: origin, willChange: "transform" }}
      >
        {/* Anilla exterior */}
        <circle cx="64" cy="188" r="20" fill="none" stroke="#111" strokeWidth="4.5" />
        <circle cx="64" cy="188" r="15.5" fill="url(#sg-ring)" />
        <circle cx="64" cy="188" r="8"  fill="none" stroke="#444" strokeWidth="2" />
        {/* Brazo */}
        <path
          d="M54 170 Q48 145 40 105"
          stroke="#1a1a1a" strokeWidth="8" fill="none" strokeLinecap="round"
        />
        <path
          d="M53 169 Q47 144 40 105"
          stroke="#666" strokeWidth="4" fill="none" strokeLinecap="round"
        />
        {/* Hoja */}
        <path
          d="M40 105 Q43 62 41 6 L36 8 Q38 62 35 105 Z"
          fill="url(#sg-bladeR)"
        />
        {/* Filo */}
        <path
          d="M40 105 Q43 62 41 6"
          stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" fill="none"
        />
      </motion.g>

      {/* ── Tornillo del pivote ── */}
      <circle cx={PX} cy={PY} r="10"  fill="#111" />
      <circle cx={PX} cy={PY} r="7"   fill="url(#sg-screw)" />
      <circle cx={PX} cy={PY} r="2.5" fill="#ccc" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fases de animación (600vh = 6 pantallas de scroll)
//
//  0.00 → 0.15  IDLE        — Logo en blanco, sin tijeras visibles
//  0.14 → 0.42  ENTRADA     — Tijeras suben desde abajo, rotan al ángulo de la A (~35°)
//  0.40 → 0.53  LOGO        — Tijeras en posición A, se abren en X (integrándose al logo)
//  0.51 → 0.63  TRANSICIÓN  — Tijeras vuelven a vertical (0°), logo se desvanece
//  0.61 → 0.88  CORTE       — Tijeras suben mientras oscilan abierto/cerrado
//                              Las dos mitades del logo/fondo blanco se separan L/R
//  0.86 → 0.97  FINAL       — Mitades salen de pantalla, tijeras se desvanecen
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroScissors() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Tijeras: posición Y ──────────────────────────────────────────
  // Empieza debajo de la pantalla, sube a la posición A, luego corta hacia arriba
  const scissorsY = useTransform(
    scrollYProgress,
    [0,      0.14,  0.16,  0.44,  0.53,  0.88],
    ["70vh", "70vh","45vh","-7vh","-7vh","-70vh"]
  );

  // ── Tijeras: rotación ────────────────────────────────────────────
  // 0° (vertical) → 35° (ángulo logo A) → 0° (vertical para cortar)
  const scissorsRotate = useTransform(
    scrollYProgress,
    [0.16, 0.44, 0.53, 0.63],
    [0, 35, 35, 0]
  );

  // ── Tijeras: escala ──────────────────────────────────────────────
  const scissorsScale = useTransform(
    scrollYProgress,
    [0.14, 0.16, 0.44, 0.63],
    [0.65, 0.65, 1.0, 1.1]
  );

  // ── Tijeras: opacidad ────────────────────────────────────────────
  const scissorsOpacity = useTransform(
    scrollYProgress,
    [0, 0.13, 0.16, 0.88, 0.96],
    [0, 0, 1, 1, 0]
  );

  // ── Hojas: ángulo de apertura ────────────────────────────────────
  // En posición A: abiertas en X (±30°)
  // En corte:      oscilan abierto/cerrado
  const leftBladeAngle = useTransform(
    scrollYProgress,
    [0.16, 0.44, 0.51, 0.63, 0.69, 0.75, 0.81, 0.87],
    [0, -30, -30, 0, -22, 0, -22, -8]
  );
  const rightBladeAngle = useTransform(
    scrollYProgress,
    [0.16, 0.44, 0.51, 0.63, 0.69, 0.75, 0.81, 0.87],
    [0, 30, 30, 0, 22, 0, 22, 8]
  );

  // ── Logo: opacidad ───────────────────────────────────────────────
  // Logo visible hasta que empieza el corte
  const logoOpacity = useTransform(
    scrollYProgress,
    [0, 0.53, 0.64],
    [1, 1, 0]
  );

  // ── Paneles blancos: separación L/R ─────────────────────────────
  // Mitad izquierda se desliza a la izquierda, derecha a la derecha.
  // clip-path: inset() recorta cada panel a su mitad, el translate los aleja.
  const leftPanelX = useTransform(
    scrollYProgress,
    [0.61, 0.93],
    ["0%", "-58%"]
  );
  const rightPanelX = useTransform(
    scrollYProgress,
    [0.61, 0.93],
    ["0%", "58%"]
  );
  const panelsOpacity = useTransform(
    scrollYProgress,
    [0.90, 0.97],
    [1, 0]
  );

  return (
    // 600vh = 6 pantallas de scroll para una animación fluida
    <div ref={containerRef} className="relative h-[600vh]">

      {/* ══════════════════════════════════════════════════════
          CAPA 0 — Fondo negro: contenido de reservas
      ══════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 bg-black z-0 flex flex-col items-center justify-center gap-6">
        <h1
          className="text-white text-5xl font-bold tracking-widest uppercase"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Peña Barber
        </h1>
        <p className="text-zinc-400 text-xl tracking-[0.3em] uppercase">
          Sistema de Reservas Premium
        </p>
        <div className="mt-8 flex gap-4">
          <button className="px-8 py-3 border border-white text-white uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-all duration-300">
            Reservar cita
          </button>
          <button className="px-8 py-3 bg-white text-black uppercase tracking-widest text-sm hover:bg-zinc-200 transition-all duration-300">
            Ver servicios
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CAPA 30 — Mitad IZQUIERDA del folio blanco
          clip-path recorta al 50% izquierdo, translateX lo aleja
      ══════════════════════════════════════════════════════ */}
      <motion.div
        className="fixed inset-0 bg-white z-30"
        style={{
          clipPath: "inset(0 50% 0 0)",
          x: leftPanelX,
          opacity: panelsOpacity,
          willChange: "transform, opacity",
        }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: logoOpacity, willChange: "opacity" }}
        >
          <Image
            src="/logo-pena.jpg"
            alt="Peña Barber"
            width={420}
            height={280}
            priority
            className="select-none"
            style={{ filter: "contrast(1.1)" }}
          />
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          CAPA 30 — Mitad DERECHA del folio blanco
      ══════════════════════════════════════════════════════ */}
      <motion.div
        className="fixed inset-0 bg-white z-30"
        style={{
          clipPath: "inset(0 0 0 50%)",
          x: rightPanelX,
          opacity: panelsOpacity,
          willChange: "transform, opacity",
        }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: logoOpacity, willChange: "opacity" }}
        >
          <Image
            src="/logo-pena.jpg"
            alt="Peña Barber"
            width={420}
            height={280}
            priority
            className="select-none"
            style={{ filter: "contrast(1.1)" }}
          />
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          CAPA 40 — Tijeras SVG animadas
      ══════════════════════════════════════════════════════ */}
      <motion.div
        className="fixed left-1/2 top-1/2 z-40"
        style={{
          x: "-50%",
          y: scissorsY,
          rotate: scissorsRotate,
          scale: scissorsScale,
          opacity: scissorsOpacity,
          willChange: "transform, opacity",
        }}
      >
        <ScissorsSVG leftAngle={leftBladeAngle} rightAngle={rightBladeAngle} />
      </motion.div>

    </div>
  );
}
