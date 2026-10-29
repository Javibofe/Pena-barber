"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppointmentItem {
  id: string;
  appointment_date: string;
  status: string;
  created_at: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const BARBER_PHONE = "34604407525";

export default function MyBookingsModal({ isOpen, onClose }: MyBookingsModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [clientFound, setClientFound] = useState<{ id: string; full_name: string; phone: string } | null>(null);

  // Cargar datos guardados en el móvil al abrir
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem("pena_barber_client");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.lastName) setLastName(parsed.lastName);
          if (parsed.phone) setPhone(parsed.phone);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  const searchClientAppointments = useCallback(async (
    targetPhone: string,
    targetFirst: string,
    targetLast: string,
    year: number,
    month: number
  ) => {
    const cleanPhone = targetPhone.trim();
    if (!cleanPhone && (!targetFirst.trim() || !targetLast.trim())) {
      setErrorMsg("Introduce tu teléfono o tu nombre y apellidos.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setHasSearched(true);

    try {
      // 1. Buscar el cliente en la base de datos
      let clientQuery = supabase.from("clients").select("id, full_name, phone");

      if (cleanPhone) {
        clientQuery = clientQuery.eq("phone", cleanPhone);
      } else {
        const targetFull = `${targetFirst.trim()} ${targetLast.trim()}`;
        clientQuery = clientQuery.ilike("full_name", `%${targetFull}%`);
      }

      const { data: clients, error: cErr } = await clientQuery;
      if (cErr) throw cErr;

      if (!clients || clients.length === 0) {
        setClientFound(null);
        setAppointments([]);
        setErrorMsg("No se ha encontrado ningún cliente con esos datos. Revisa el teléfono o nombre.");
        setIsLoading(false);
        return;
      }

      const matchedClient = clients[0];
      setClientFound(matchedClient);

      // Guardar en localStorage para futuras visitas
      try {
        const parts = matchedClient.full_name.trim().split(" ");
        const fName = parts[0] || targetFirst;
        const lName = parts.slice(1).join(" ") || targetLast;
        localStorage.setItem("pena_barber_client", JSON.stringify({
          firstName: fName,
          lastName: lName,
          phone: matchedClient.phone
        }));
      } catch (e) {
        // ignore
      }

      // 2. Buscar citas del cliente para el mes seleccionado
      const startOfMonth = new Date(year, month, 1, 0, 0, 0).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      const { data: apptData, error: aErr } = await supabase
        .from("appointments")
        .select("id, appointment_date, status, created_at")
        .eq("client_id", matchedClient.id)
        .neq("status", "cancelled")
        .gte("appointment_date", startOfMonth)
        .lte("appointment_date", endOfMonth)
        .order("appointment_date", { ascending: true });

      if (aErr) throw aErr;
      setAppointments((apptData || []).filter((a: any) => a.status !== "cancelled"));
    } catch (err: any) {
      console.error("Error buscando citas:", err);
      setErrorMsg(err.message || "Error al buscar las citas.");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Al cambiar de mes, si ya teníamos cliente localizado, refrescar automáticamente
  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);

    if (phone.trim() || (firstName.trim() && lastName.trim())) {
      searchClientAppointments(phone, firstName, lastName, newYear, newMonth);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchClientAppointments(phone, firstName, lastName, selectedYear, selectedMonth);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4">
        {/* Fondo oscuro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Ventana modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-lg bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Cabecera modal */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <img src="/calendar-icon.png" alt="Calendario" className="w-5 h-5 object-contain opacity-95" />
              <div>
                <h3 className="font-serif text-base text-white tracking-wide">Mis Citas</h3>
                <p className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                  Consulta tus turnos agendados
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-white/10 hover:border-white/30 text-neutral-400 hover:text-white flex items-center justify-center transition-colors text-xs font-mono"
            >
              ✕
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
            {/* Formulario de Búsqueda / Identificación */}
            <form onSubmit={handleSearchSubmit} className="space-y-3 bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-400 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Carlos"
                    className="w-full bg-[#141414] border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-400 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. García"
                    className="w-full bg-[#141414] border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-neutral-400 mb-1">
                  Teléfono Móvil
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 600123456"
                    className="flex-1 bg-[#141414] border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-mono uppercase tracking-wider font-bold rounded transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isLoading ? "Buscando..." : "Buscar"}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-[11px] text-red-400 font-mono mt-1">{errorMsg}</p>
              )}
            </form>

            {/* Selector de Mes */}
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 rounded transition-colors"
                title="Mes anterior"
              >
                ◀ Ant
              </button>

              <span className="font-serif text-sm tracking-wider text-white">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 rounded transition-colors"
                title="Mes siguiente"
              >
                Sig ▶
              </button>
            </div>

            {/* Listado de Citas */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-10 text-center">
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-2" />
                  <p className="text-xs font-mono text-neutral-400">Consultando agenda...</p>
                </div>
              ) : hasSearched && appointments.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-xl px-4">
                  <span className="text-2xl block mb-2">🗓️</span>
                  <p className="text-xs text-neutral-300 font-medium">
                    No tienes citas reservadas en {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-1">
                    Puedes navegar a otro mes con las flechas o reservar un nuevo turno.
                  </p>
                  <a
                    href="/#reserva"
                    onClick={onClose}
                    className="inline-block mt-4 px-4 py-2 bg-white/10 hover:bg-white text-white hover:text-black text-xs font-mono uppercase tracking-wider rounded transition-colors"
                  >
                    Pedir Cita Ahora
                  </a>
                </div>
              ) : (
                appointments.map((appt) => {
                  const dateObj = new Date(appt.appointment_date);
                  const dayName = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
                  const dayNumber = dateObj.getDate();
                  const monthName = MONTH_NAMES[dateObj.getMonth()];
                  const hours = String(dateObj.getHours()).padStart(2, "0");
                  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                  const timeFormatted = `${hours}:${minutes} hs`;

                  const isPast = dateObj < new Date();
                  const isCancelled = appt.status === "cancelled";
                  const isNoShow = appt.status === "no-show";

                  const waMessage = encodeURIComponent(
                    `Hola Peña Barber, soy ${clientFound?.full_name || firstName}. Quisiera consultar/modificar mi cita del ${dayNumber} de ${monthName} a las ${timeFormatted}.`
                  );
                  const waUrl = `https://wa.me/${BARBER_PHONE}?text=${waMessage}`;

                  return (
                    <div
                      key={appt.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCancelled
                          ? "bg-red-950/10 border-red-900/20 opacity-70"
                          : isPast
                          ? "bg-white/[0.02] border-white/5 opacity-70"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block capitalize">
                            {dayName}, {dayNumber} de {monthName}
                          </span>
                          <span className="font-serif text-lg font-bold text-white tracking-wide block mt-1">
                            {timeFormatted}
                          </span>
                        </div>

                        <div>
                          {isCancelled ? (
                            <span className="text-[9px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-red-950/40 text-red-400 border border-red-900/30">
                              Cancelada
                            </span>
                          ) : isNoShow ? (
                            <span className="text-[9px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-neutral-900 text-neutral-400 border border-white/10">
                              No asistido
                            </span>
                          ) : isPast ? (
                            <span className="text-[9px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-neutral-900 text-neutral-400 border border-white/10">
                              Completada
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase font-mono tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 font-medium">
                              Confirmada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Aviso y enlace a WhatsApp */}
                      {!isPast && !isCancelled && (
                        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
                            Para cancelar o modificar, contacta con el peluquero.
                          </p>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/20 hover:border-white bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono uppercase tracking-wider transition-colors shrink-0"
                          >
                            <span>Avisar por WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
