"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";

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
          <stop offset="0%" stopColor="#444" />
          <stop offset="30%" stopColor="#c0c0c0" />
          <stop offset="55%" stopColor="#e0e0e0" />
          <stop offset="100%" stopColor="#777" />
        </linearGradient>
        <linearGradient id="sg-bladeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#777" />
          <stop offset="45%" stopColor="#e0e0e0" />
          <stop offset="70%" stopColor="#c0c0c0" />
          <stop offset="100%" stopColor="#444" />
        </linearGradient>
        <radialGradient id="sg-ring" cx="38%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="65%" stopColor="#b0b0b0" />
          <stop offset="100%" stopColor="#555" />
        </radialGradient>
        <radialGradient id="sg-screw" cx="35%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#ddd" />
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
        <circle cx="16" cy="188" r="8" fill="none" stroke="#444" strokeWidth="2" />
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
        <circle cx="64" cy="188" r="8" fill="none" stroke="#444" strokeWidth="2" />
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
      <circle cx={PX} cy={PY} r="10" fill="#111" />
      <circle cx={PX} cy={PY} r="7" fill="url(#sg-screw)" />
      <circle cx={PX} cy={PY} r="2.5" fill="#ccc" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fases de animación (Nueva Lógica - Fase 1: Desprendimiento)
//
//  0.00 → 0.10  IDLE       — SVG disfrazado como las tijeras de la "A"
//  0.10 → 0.30  SALIDA     — Las tijeras se desprenden, rotan y van hacia arriba
//  0.30 → 0.60  ESPERANDO  — (A la espera de los siguientes fotogramas)
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroScissors() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Tijeras: posición Y ──────────────────────────────────────────
  // 0.00 → 0.10: en la A (+25px)
  // 0.10 → 0.25: suben al centro arriba (-25vh)
  // 0.25 → 0.35: rotan y se preparan
  // 0.35 → 0.85: bajan cortando (110vh)
  const scissorsY = useTransform(
    scrollYProgress,
    [0, 0.10, 0.25, 0.35, 0.85],
    ["25px", "25px", "-25vh", "-25vh", "110vh"]
  );

  // ── Tijeras: posición X ──────────────────────────────────────────
  // 0.00 → 0.10: en la A (+80px)
  // 0.10 → 0.25: se centran (0px) para cortar por el medio
  const scissorsX = useTransform(
    scrollYProgress,
    [0, 0.10, 0.25, 0.85],
    ["80px", "80px", "0px", "0px"]
  );

  // ── Tijeras: rotación ───────────────────────────────────────────
  // 0.00 → 0.10: inclinadas como la A (-72 deg)
  // 0.10 → 0.25: giran a 15 (abriendo en el aire)
  // 0.25 → 0.35: giran a 180 (apuntando hacia abajo para cortar)
  const scissorsRotate = useTransform(
    scrollYProgress,
    [0, 0.10, 0.25, 0.35, 0.85],
    [-72, -72, 15, 180, 180]
  );

  // ── Tijeras: escala ──────────────────────────────────────────────
  // Pequeñitas en la A, grandes para cortar
  const scissorsScale = useTransform(
    scrollYProgress,
    [0, 0.10, 0.25, 0.85],
    [0.32, 0.32, 1.2, 1.2]
  );

  // ── Tijeras: opacidad ────────────────────────────────────────────
  const scissorsOpacity = useTransform(
    scrollYProgress,
    [0, 0.85, 0.95],
    [1, 1, 0]
  );

  // ── Hojas: ángulo de apertura (SNIPPING) ──────────────────────────
  // 0.00 → 0.10: cruzadas en la A
  // 0.10 → 0.25: se abren en el aire
  // 0.35 → 0.85: snip snip snip mientras bajan
  const leftBladeAngle = useTransform(
    scrollYProgress,
    [0, 0.10, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85],
    [-15, -15, -35, -35, -5, -35, -5, -35, -5]
  );
  const rightBladeAngle = useTransform(
    scrollYProgress,
    [0, 0.10, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85],
    [15, 15, 35, 35, 5, 35, 5, 35, 5]
  );

  // ── Logo: opacidad ───────────────────────────────────────────────
  const logoOpacity = useTransform(
    scrollYProgress,
    [0, 0.70, 0.80],
    [1, 1, 0]
  );

  // ── Paneles blancos: CLIP POLIGONAL (CORTE VERTICAL DESDE ARRIBA) ──
  // La física real del corte:
  // Tijeras cortan de arriba a abajo en el centro exacto (50%).
  
  // Progreso del corte en Y (0 a 100%)
  const cutY = useTransform(
    scrollYProgress,
    [0.35, 0.85],
    [0, 100]
  );

  // Separación superior: forma de V
  // Cuando la tijera baja, la parte superior se separa (efecto rasgado).
  const topSeparation = useTransform(
    scrollYProgress,
    [0.35, 0.85],
    [0, 25] // 25% de separación para cada lado
  );

  const leftEdgeTop = useTransform(topSeparation, (v) => 50 - v);
  const rightEdgeTop = useTransform(topSeparation, (v) => 50 + v);

  // Panel izquierdo: (0% 0%) -> (leftEdgeTop% 0%) -> (50% cutY%) -> (50% 100%) -> (0% 100%)
  const leftClipPath = useMotionTemplate`polygon(0% 0%, ${leftEdgeTop}% 0%, 50% ${cutY}%, 50% 100%, 0% 100%)`;
  
  // Panel derecho: (rightEdgeTop% 0%) -> (100% 0%) -> (100% 100%) -> (50% 100%) -> (50% cutY%)
  const rightClipPath = useMotionTemplate`polygon(${rightEdgeTop}% 0%, 100% 0%, 100% 100%, 50% 100%, 50% ${cutY}%)`;

  // Desplazamiento final (fase de salida de pantalla)
  const leftPanelX = useTransform(
    scrollYProgress,
    [0.85, 0.98],
    ["0%", "-60%"]
  );
  const leftPanelRotate = useTransform(
    scrollYProgress,
    [0.85, 0.98],
    [0, -6]
  );
  
  const rightPanelX = useTransform(
    scrollYProgress,
    [0.85, 0.98],
    ["0%", "60%"]
  );
  const rightPanelRotate = useTransform(
    scrollYProgress,
    [0.85, 0.98],
    [0, 6]
  );

  const panelsOpacity = useTransform(
    scrollYProgress,
    [0.91, 0.98],
    [1, 0]
  );

  return (
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
          Clip poligonal: borde inferior se retira progresivamente
          conforme las tijeras avanzan (parte ya cortada → más separada)
      ══════════════════════════════════════════════════════ */}
      <motion.div
        className="fixed inset-0 bg-white z-30"
        style={{
          clipPath: leftClipPath,
          x: leftPanelX,
          opacity: panelsOpacity,
          willChange: "clip-path, transform, opacity",
        }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: logoOpacity, willChange: "opacity" }}
        >
          <div className="relative">
            <Image
              src="/logo-pena.jpg"
              alt="Peña Barber"
              width={420}
              height={280}
              priority
              className="select-none"
              style={{ filter: "contrast(1.1)" }}
            />
            {/* Parche blanco para tapar las tijeras impresas en la imagen */}
            <div className="absolute top-[52%] left-[69.5%] w-[45px] h-[75px] bg-[#fff] -translate-x-1/2 -translate-y-1/2 rotate-[18deg] rounded-full" />
          </div>
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          CAPA 31 — Mitad DERECHA del folio blanco
      ══════════════════════════════════════════════════════ */}
      <motion.div
        className="fixed inset-0 bg-white z-30"
        style={{
          clipPath: rightClipPath,
          x: rightPanelX,
          opacity: panelsOpacity,
          willChange: "clip-path, transform, opacity",
        }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: logoOpacity, willChange: "opacity" }}
        >
          <div className="relative">
            <Image
              src="/logo-pena.jpg"
              alt="Peña Barber"
              width={420}
              height={280}
              priority
              className="select-none"
              style={{ filter: "contrast(1.1)" }}
            />
            {/* Parche blanco para tapar las tijeras impresas en la imagen */}
            <div className="absolute top-[52%] left-[69.5%] w-[45px] h-[75px] bg-[#fff] -translate-x-1/2 -translate-y-1/2 rotate-[18deg] rounded-full" />
          </div>
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          CAPA 40 — Tijeras SVG animadas
      ══════════════════════════════════════════════════════ */}
      <motion.div
        className="fixed left-1/2 top-1/2 z-40"
        style={{
          x: scissorsX,
          y: scissorsY,
          rotate: scissorsRotate,
          scale: scissorsScale,
          opacity: scissorsOpacity,
          marginLeft: "-36px", // compensar la mitad del width del svg para que X sea centro
          marginTop: "-94px",  // compensar la mitad del height del svg
          willChange: "transform, opacity",
        }}
      >
        <ScissorsSVG leftAngle={leftBladeAngle} rightAngle={rightBladeAngle} />
      </motion.div>

    </div>
  );
}
