"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

const SERVICES = [
  {
    id: "corte",
    name: "Corte",
    price: "7€",
    duration: "35 min",
    desc: "Corte personalizado a tu gusto. El buen hacer de toda la vida, rematado a navaja.",
  },
  {
    id: "barba",
    name: "Corte + barba",
    price: "9€",
    duration: "40 min",
    desc: "El arreglo completo. Corte a tu estilo y perfilado de barba para salir como nuevo.",
  },
];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getLocalToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BookingSection() {
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth();

  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalToday());
  const [selectedHour, setSelectedHour] = useState("");

  const [monthOccupied, setMonthOccupied] = useState<Record<string, string[]>>({});
  const [monthSlots, setMonthSlots] = useState<Record<string, string[]>>({});
  const [isLoadingHours, setIsLoadingHours] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isLegalAccepted, setIsLegalAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Efecto: carga slots disponibles Y citas ocupadas del mes seleccionado
  useEffect(() => {
    const fetchMonthData = async () => {
      setIsLoadingHours(true);
      try {
        const startOfMonth = new Date(currentYear, selectedMonth, 1);
        const endOfMonth = new Date(currentYear, selectedMonth + 1, 0, 23, 59, 59, 999);
        const monthStart = `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
        const monthEnd = `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(new Date(currentYear, selectedMonth + 1, 0).getDate()).padStart(2, "0")}`;

        // Slots disponibles del mes
        const { data: slotsData, error: slotsError } = await supabase
          .from("available_slots")
          .select("slot_date, slot_time")
          .gte("slot_date", monthStart)
          .lte("slot_date", monthEnd);

        if (slotsError) throw slotsError;

        const groupedSlots: Record<string, string[]> = {};
        (slotsData || []).forEach((s: any) => {
          const key = s.slot_date;
          const time = s.slot_time.slice(0, 5);
          if (!groupedSlots[key]) groupedSlots[key] = [];
          groupedSlots[key].push(time);
        });
        // Ordenar cada día cronológicamente
        Object.keys(groupedSlots).forEach((k) => groupedSlots[k].sort());
        setMonthSlots(groupedSlots);

        // Citas ocupadas del mes
        const { data: apptData, error: apptError } = await supabase
          .from("appointments")
          .select("appointment_date, status")
          .gte("appointment_date", startOfMonth.toISOString())
          .lte("appointment_date", endOfMonth.toISOString())
          .neq("status", "no-show");

        if (apptError) throw apptError;

        const groupedOccupied: Record<string, string[]> = {};
        (apptData || []).forEach((appt: any) => {
          const d = new Date(appt.appointment_date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const dateKey = `${yyyy}-${mm}-${dd}`;
          const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
          if (!groupedOccupied[dateKey]) groupedOccupied[dateKey] = [];
          groupedOccupied[dateKey].push(time);
        });
        setMonthOccupied(groupedOccupied);

      } catch (err) {
        console.error("Error fetching month data:", err);
      } finally {
        setIsLoadingHours(false);
      }
    };

    fetchMonthData();
  }, [selectedMonth, currentYear]);

  const occupiedHours = selectedDateStr ? (monthOccupied[selectedDateStr] || []) : [];
  const availableSlots = selectedDateStr ? (monthSlots[selectedDateStr] || []) : [];
  const availableHours = availableSlots.filter((h) => !occupiedHours.includes(h)).sort();

  // Un día se deshabilita si no tiene turnos definidos, o todos están ocupados
  const isFull = (fullDate: string) => {
    const daySlots = monthSlots[fullDate] || [];
    const dayOccupied = monthOccupied[fullDate] || [];
    if (daySlots.length === 0) return true;
    return daySlots.every((s) => dayOccupied.includes(s));
  };

  const handleConfirm = async () => {
    if (!isLegalAccepted) return;

    setErrorMsg("");
    setBookingMessage("");

    if (!selectedDateStr) {
      setErrorMsg("Por favor, selecciona un día en el calendario.");
      return;
    }
    if (!selectedHour) {
      setErrorMsg("Por favor, selecciona una hora.");
      return;
    }

    const phoneRegex = /^[67]\d{8}$/;
    if (!phoneRegex.test(clientPhone.trim())) {
      setErrorMsg("Móvil inválido (9 dígitos, empezando por 6 o 7).");
      return;
    }
    if (!clientName.trim()) {
      setErrorMsg("Por favor, introduce tu nombre.");
      return;
    }

    setIsLoading(true);
    //prueba
    try {
      // Paso A: Upsert de Cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .upsert(
          { phone: clientPhone.trim(), full_name: clientName.trim() },
          { onConflict: "phone" }
        )
        .select()
        .single();

      if (clientError || !clientData) {
        throw new Error(clientError?.message || "Error al registrar cliente.");
      }

      // Preparar el timestamptz
      const [hourStr, minStr] = selectedHour.split(":");
      const appointmentDate = new Date(`${selectedDateStr}T00:00:00`);
      appointmentDate.setHours(parseInt(hourStr), parseInt(minStr), 0, 0);

      // Paso B: Insertar Reserva
      const { error: apptError } = await supabase
        .from("appointments")
        .insert({
          client_id: clientData.id,
          appointment_date: appointmentDate.toISOString(),
          status: "confirmed"
        });

      if (apptError) {
        if (apptError.code === '23505') {
          throw new Error("Lo sentimos, alguien acaba de reservar esa misma hora. Por favor, elige otra.");
        }
        throw new Error(apptError.message || "Error al registrar la reserva.");
      }

      setBookingMessage(
        `✓ Cita confirmada para ${clientName.trim()} el ${getDisplayDate()} a las ${selectedHour} hs para ${selectedService.name} (${selectedService.price}).`
      );

      // Paso C: Notificar al barbero
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            service: selectedService.name,
            date: getDisplayDate(),
            time: selectedHour,
          }),
        });
      } catch (notifyErr) {
        console.error("No se pudo enviar la notificación al barbero", notifyErr);
      }

    } catch (err: any) {
      setErrorMsg(err.message || "Ha ocurrido un error inesperado.");
    } finally {
      setIsLoading(false);
      // Recargar horas disponibles tras intentar reservar (éxito o fallo)
      const syntheticEvent = new Event("reloadHours");
      window.dispatchEvent(syntheticEvent);
    }
  };

  // Helper de calendario
  const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, selectedMonth, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 = Domingo, ajustar a Lunes

  const blanks = Array.from({ length: startOffset });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDisplayDate = () => {
    if (!selectedDateStr) return "Día no seleccionado";
    const d = new Date(`${selectedDateStr}T12:00:00`);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  return (
    <section
      className="w-full py-20 px-6 border-b border-border-subtle bg-surface-base"
      id="reserva"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl text-white uppercase tracking-tight">
            Agenda tu cita
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-3 font-light">
            Selecciona tu fecha en el calendario y la hora que mejor te venga.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: SERVICIOS + CALENDARIO + HORAS */}
          <div className="lg:col-span-8 space-y-8">
            {/* PASO 1: SELECCIÓN DE SERVICIO */}
            <div className="p-6 rounded-lg bg-surface-card border border-border-subtle">
              <div className="flex items-center mb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                  Paso 1 • Escoge el Servicio
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICES.map((srv, index) => (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20px" }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    className={`text-left p-4 rounded transition-all flex flex-col justify-between border-2 ${selectedService.id === srv.id
                        ? "bg-surface-elevated border-white"
                        : "bg-surface-card border-border-subtle hover:border-neutral-500"
                      }`}
                    type="button"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">
                          {srv.name}
                        </span>
                        <span className="font-mono text-sm text-white font-bold">
                          {srv.price}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-2 font-light">
                        {srv.desc}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 mt-3 block">
                      Duración: {srv.duration}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* PASO 2: CALENDARIO DE DÍAS (MES DINÁMICO) */}
            <div className="p-6 rounded-lg bg-surface-card border border-border-subtle">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                  Paso 2 • Selecciona Día
                </span>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      setSelectedDateStr(""); // Reset día al cambiar de mes
                      setSelectedHour("");
                    }}
                    className="bg-surface-elevated border border-border-subtle text-white rounded pl-3 pr-7 py-1.5 text-xs font-mono focus:outline-none focus:border-white transition-colors cursor-pointer appearance-none"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i} disabled={i < currentMonthNum}>
                        {m} {currentYear}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-3">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>

              {/* Rejilla interactiva de días */}
              <div className="grid grid-cols-7 gap-2">
                {blanks.map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {days.map((day) => {
                  const dStr = String(day).padStart(2, "0");
                  const mStr = String(selectedMonth + 1).padStart(2, "0");
                  const fullDate = `${currentYear}-${mStr}-${dStr}`;
                  const isSelected = selectedDateStr === fullDate;
                  const isPast = fullDate < getLocalToday();

                  const isDisabled = isFull(fullDate) || fullDate < getLocalToday();

                  return (
                    <button
                      key={day}
                      disabled={isDisabled}
                      onClick={() => {
                        setSelectedDateStr(fullDate);
                        setSelectedHour("");
                      }}
                      className={`py-3 rounded text-center text-xs font-mono transition-colors ${isDisabled
                          ? "opacity-20 text-neutral-500 cursor-not-allowed"
                          : isSelected
                            ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                            : "text-neutral-300 hover:bg-neutral-800 bg-surface-elevated/50"
                        }`}
                      type="button"
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PASO 3: FRANJA HORARIA (CONDICIONAL) */}
            <AnimatePresence>
              {selectedDateStr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 rounded-lg bg-surface-card border border-border-subtle overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                      Paso 3 • Selecciona Franja Horaria
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {getDisplayDate()}
                    </span>
                  </div>

                  {isLoadingHours ? (
                    <div className="flex justify-center py-6">
                      <span className="material-symbols-outlined animate-spin text-neutral-500 text-2xl">
                        sync
                      </span>
                    </div>
                  ) : availableHours.length === 0 ? (
                    <div className="text-center text-xs text-neutral-500 py-6 border border-dashed border-border-subtle rounded bg-surface-elevated/30">
                      Lo sentimos, no quedan turnos disponibles para este día.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {availableHours.map((hour) => (
                        <button
                          key={hour}
                          onClick={() => setSelectedHour(hour)}
                          className={`py-2 rounded text-center text-xs font-mono transition-all border ${selectedHour === hour
                              ? "bg-white text-black font-bold border-white"
                              : "border-border-light hover:border-white text-neutral-300 bg-surface-elevated/50"
                            }`}
                          type="button"
                        >
                          {hour}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* COLUMNA DERECHA: TARJETA DE RESUMEN Y CONFIRMACIÓN */}
          <div className="lg:col-span-4 sticky top-28">
            <div className="bg-surface-card border border-border-light p-6 rounded-lg shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                  <span className="font-serif text-lg text-white font-medium">
                    Resumen del Turno
                  </span>
                </div>
                <div className="py-5 space-y-4 text-xs">

                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                      Servicio Solicitado
                    </span>
                    <span className="font-medium text-white text-sm">
                      {selectedService.name}
                    </span>
                    <span className="text-neutral-400 block text-[11px]">
                      {selectedService.duration} estimados
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                      Fecha y Hora Seleccionada
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-white font-mono capitalize">
                        {getDisplayDate()}
                      </span>
                      <span className="text-neutral-600">—</span>
                      <span className="font-medium text-white font-mono">
                        {selectedHour ? `${selectedHour} hs` : "--:-- hs"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                      Localización
                    </span>
                    <span className="text-neutral-400">
                      Av. de las Tinajas, 59, El Viso del Alcor, Sevilla
                    </span>
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-neutral-400 font-mono">
                      Total a abonar
                    </span>
                    <span className="font-mono text-2xl font-bold text-white">
                      {selectedService.price}
                    </span>
                  </div>
                </div>

                {/* Formulario Rápido */}
                <div className="space-y-3 pt-2">
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-subtle rounded px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white transition-colors"
                    placeholder="Tu nombre completo"
                    type="text"
                  />
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-subtle rounded px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white transition-colors"
                    placeholder="Teléfono para confirmar por WhatsApp"
                    type="tel"
                  />
                </div>
              </div>

              {/* Legal Requirement */}
              <div className="mt-5 mb-4">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isLegalAccepted}
                    onChange={(e) => setIsLegalAccepted(e.target.checked)}
                    className="mt-0.5 rounded bg-surface-elevated border-border-subtle text-neutral-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 leading-tight group-hover:text-neutral-300 transition-colors">
                    Acepto el tratamiento de mis datos y recibir recordatorios
                    de citas vía WhatsApp.
                  </span>
                </label>
              </div>

              {/* Botón Confirmar */}
              <div className="pt-4 border-t border-border-subtle relative">
                {errorMsg && (
                  <div className="mb-3 p-2 rounded bg-red-950/40 border border-red-900/50 text-[11px] text-red-200 text-center font-mono">
                    {errorMsg}
                  </div>
                )}
                <motion.button
                  onClick={handleConfirm}
                  disabled={!isLegalAccepted || isLoading || !!bookingMessage}
                  whileHover={isLegalAccepted && !isLoading && !bookingMessage ? { scale: 1.02 } : {}}
                  whileTap={isLegalAccepted && !isLoading && !bookingMessage ? { scale: 0.98 } : {}}
                  className={`w-full py-3 rounded font-semibold text-xs tracking-[0.18em] uppercase transition-all flex items-center justify-center gap-2 ${!isLegalAccepted
                      ? "bg-white/50 text-black/50 cursor-not-allowed"
                      : bookingMessage
                        ? "bg-neutral-800 text-white"
                        : "bg-white text-black hover:bg-neutral-200"
                    }`}
                  type="button"
                >
                  {isLoading ? (
                    <span>Procesando...</span>
                  ) : bookingMessage ? (
                    <span>Cita Confirmada</span>
                  ) : (
                    <span>Confirmar Cita</span>
                  )}
                </motion.button>
                {bookingMessage && (
                  <div className="mt-3 p-3 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-300 text-center font-mono">
                    {bookingMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
