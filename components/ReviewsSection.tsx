"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Review = {
  id: string;
  name: string;
  service: string;
  rating: number;
  timeAgo: string;
  timestamp: number; // para ordenar por fecha
  comment: string;
};

type SortKey = "best" | "worst" | "newest" | "oldest";

const INITIAL_REVIEWS: Review[] = [
  {
    id: "1",
    name: "Rodrigo Mendoza",
    service: "Corte de Autor",
    rating: 5,
    timeAgo: "Hace 3 días",
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    comment:
      "El dominio del filo de la navaja de Germán es algo que no había experimentado en ninguna otra barbería. Cero irritación, precisión quirúrgica y una puntualidad brutal. Es una delicia no tener gente esperando al lado.",
  },
  {
    id: "2",
    name: "Ignacio V. Carvajal",
    service: "Corte + barba",
    rating: 5,
    timeAgo: "Hace 1 semana",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    comment:
      "El arreglo de barba con toalla caliente hace que el ajetreo diario desaparezca por un momento. Trato cercano, muy a gusto. Totalmente recomendado.",
  },
  {
    id: "3",
    name: "Álvaro de la Serna",
    service: "Corte",
    rating: 5,
    timeAgo: "Hace 2 semanas",
    timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
    comment:
      "Sillón cómodo, ambiente tranquilo. Germán entiende al instante lo que quieres y te lo deja perfecto. No cambio de barbero nunca más.",
  },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Mejor valoración" },
  { key: "worst", label: "Peor valoración" },
  { key: "newest", label: "Más recientes" },
  { key: "oldest", label: "Más antiguas" },
];

const PREVIEW_COUNT = 3;

import { supabase } from "@/lib/supabase/client";

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const [showAll, setShowAll] = useState(false);

  // Cargar reseñas desde Supabase
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mappedReviews: Review[] = (data || []).map((r) => {
          const d = new Date(r.created_at);
          // Calcula el "hace X tiempo" aproximado
          const diffMs = Date.now() - d.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          let timeAgo = "Hoy";
          if (diffDays === 1) timeAgo = "Hace 1 día";
          else if (diffDays > 1 && diffDays < 7) timeAgo = `Hace ${diffDays} días`;
          else if (diffDays >= 7 && diffDays < 14) timeAgo = "Hace 1 semana";
          else if (diffDays >= 14 && diffDays < 30) timeAgo = `Hace ${Math.floor(diffDays/7)} semanas`;
          else if (diffDays >= 30) timeAgo = `Hace ${Math.floor(diffDays/30)} meses`;

          return {
            id: r.id,
            name: r.name || "Anónimo",
            service: r.service || "Cita Verificada",
            rating: r.rating,
            timeAgo,
            timestamp: d.getTime(),
            comment: r.comment,
          };
        });

        setReviews(mappedReviews);
      } catch (e) {
        console.error("Error al cargar reseñas:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim() || !phone.trim()) return;

    setFeedback("Verificando cita...");

    try {
      // Verificar si existe el cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, full_name")
        .eq("phone", phone.trim())
        .single();

      if (clientError || !clientData) {
        setFeedback("❌ No hemos encontrado citas con este teléfono.");
        return;
      }

      const optimisticReview: Review = {
        id: Date.now().toString(),
        name: clientData.full_name || name.trim(),
        service: "Cita Verificada",
        rating,
        timeAgo: "Ahora mismo",
        timestamp: Date.now(),
        comment: comment.trim(),
      };

      setFeedback("Publicando comentario...");

      // Insertar en Supabase
      const { error } = await supabase.from("reviews").insert({
        name: optimisticReview.name,
        service: optimisticReview.service,
        rating: optimisticReview.rating,
        comment: optimisticReview.comment,
      });

      if (error) throw error;
      
      // Actualización optimista de UI si todo fue bien
      setReviews([optimisticReview, ...reviews]);
      setName("");
      setPhone("");
      setRating(5);
      setComment("");
      setFeedback("✓ Comentario publicado. ¡Muchas gracias!");
    } catch (err: any) {
      console.error(err);
      setFeedback("❌ Error al publicar. Inténtalo de nuevo.");
    }

    setTimeout(() => setFeedback(""), 4000);
  };

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    switch (sortKey) {
      case "best":    return sorted.sort((a, b) => b.rating - a.rating || b.timestamp - a.timestamp);
      case "worst":   return sorted.sort((a, b) => a.rating - b.rating || b.timestamp - a.timestamp);
      case "newest":  return sorted.sort((a, b) => b.timestamp - a.timestamp);
      case "oldest":  return sorted.sort((a, b) => a.timestamp - b.timestamp);
    }
  }, [reviews, sortKey]);

  const visibleReviews = showAll ? sortedReviews : sortedReviews.slice(0, PREVIEW_COUNT);
  const hiddenCount = sortedReviews.length - PREVIEW_COUNT;

  return (
    <section
      className="w-full py-20 px-6 border-b border-border-subtle bg-surface-darkest"
      id="opiniones"
    >
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-xs font-mono tracking-[0.3em] uppercase text-neutral-400 block mb-2">
              Comunidad & Testimonios
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white uppercase tracking-tight">
              Experiencias en Primera Persona
            </h2>
          </div>
        </div>

        {/* FILTRO DE ORDEN */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-widest mr-1 shrink-0">
            Ordenar por:
          </span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setSortKey(opt.key); setShowAll(false); }}
              className={`relative px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all border ${
                sortKey === opt.key
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-400 hover:text-neutral-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LISTA DE REVIEWS */}
          <div className="lg:col-span-7 space-y-4">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleReviews.map((rev, i) => (
                <motion.div
                  key={rev.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="p-6 rounded-lg bg-surface-card border border-border-subtle flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-base ${i < rev.rating ? "text-yellow-500" : "text-neutral-700"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {rev.timeAgo}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                      &quot;{rev.comment}&quot;
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{rev.name}</span>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      {rev.service}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* BOTÓN VER MÁS / VER MENOS */}
            {sortedReviews.length > PREVIEW_COUNT && (
              <motion.button
                layout
                onClick={() => setShowAll((v) => !v)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-lg border border-border-subtle text-neutral-400 hover:text-white hover:border-neutral-500 transition-all text-xs font-mono uppercase tracking-widest group"
              >
                <span>
                  {showAll
                    ? "Ver menos comentarios"
                    : `Ver todos los comentarios (${hiddenCount} más)`}
                </span>
                <motion.span
                  animate={{ rotate: showAll ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-base leading-none"
                >
                  ↓
                </motion.span>
              </motion.button>
            )}
          </div>

          {/* FORMULARIO */}
          <div className="lg:col-span-5 bg-surface-base p-6 rounded-lg border border-border-subtle">
            <div className="mb-4">
              <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block">
                Tu Experiencia Cuenta
              </span>
              <h3 className="font-serif text-xl text-white mt-1">
                Deja Tu Comentario
              </h3>
              <p className="text-xs text-neutral-400 font-light mt-1">
                Si has tenido una cita, comparte tus impresiones con la comunidad.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Nombre
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-card border border-border-subtle rounded px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white"
                    placeholder="Tu nombre y apellido"
                    required
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Teléfono (Para verificar)
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-card border border-border-subtle rounded px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white"
                    placeholder="Ej. 600123456"
                    required
                    type="tel"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Puntuación
                </label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starVal = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(starVal)}
                        className={`${starVal <= rating ? "text-white" : "text-neutral-600"} focus:outline-none transition-colors`}
                      >
                        <span className={`text-xl ${starVal <= rating ? "text-yellow-500" : "text-neutral-700"}`}>
                          ★
                        </span>
                      </button>
                    );
                  })}
                  <span className="text-xs font-mono text-neutral-400 ml-2">
                    {rating} {rating === 1 ? "estrella" : "estrellas"}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Tu Reseña
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-surface-card border border-border-subtle rounded p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white resize-none"
                  placeholder="Describe la atención, el corte, la navaja..."
                  required
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded bg-surface-elevated hover:bg-white hover:text-black text-white text-xs uppercase tracking-[0.18em] font-semibold transition-all border border-border-light"
              >
                Publicar Comentario
              </button>
            </form>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 font-mono text-center"
              >
                {feedback}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
