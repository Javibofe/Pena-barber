"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type Appointment = {
  id: string;
  appointment_date: string;
  status: string;
  clients: { id: string; full_name: string; phone: string } | null;
};

type AvailableSlot = {
  id: string;
  slot_date: string;
  slot_time: string;
};

// Entrada unificada para la vista de agenda (slot libre O cita)
type AgendaEntry =
  | { kind: "slot"; slot: AvailableSlot; time: string }
  | { kind: "appt"; appt: Appointment; time: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function generateSlotTimes(startTime: string, endTime: string, intervalMin: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let totalStart = sh * 60 + sm;
  const totalEnd = eh * 60 + em;
  while (totalStart <= totalEnd) {
    const h = String(Math.floor(totalStart / 60)).padStart(2, "0");
    const m = String(totalStart % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    totalStart += intervalMin;
  }
  return slots;
}

function getDatesInRange(startDate: string, endDate: string, weekdays: number[]): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  while (current <= end) {
    const dow = current.getDay();
    if (weekdays.includes(dow)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<"agenda" | "horarios" | "resenas">("agenda");
  const [selectedDate, setSelectedDate] = useState(getLocalToday());

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reviews state
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Schedule generator
  const [genMode, setGenMode] = useState<"day" | "range">("day");
  const [genStartDate, setGenStartDate] = useState(getLocalToday());
  const [genEndDate, setGenEndDate] = useState(getLocalToday());
  const [genStartTime, setGenStartTime] = useState("09:00");
  const [genEndTime, setGenEndTime] = useState("14:00");
  const [genInterval, setGenInterval] = useState(40);
  const [genWeekdays, setGenWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [genStatus, setGenStatus] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  // Slot editing
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");

  // Bulk shift
  const [showBulkShift, setShowBulkShift] = useState(false);
  const [bulkNewStart, setBulkNewStart] = useState("09:00");

  // Recurring appointments
  const [showRecurring, setShowRecurring] = useState(false);
  const [recName, setRecName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recWeekday, setRecWeekday] = useState<number>(4); // Jueves = 4
  const [recTime, setRecTime] = useState("17:00");
  const [recDuration, setRecDuration] = useState<number>(4); // Semanas
  const [recLoading, setRecLoading] = useState(false);

  // Bulk selection (appointments)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedApptIds, setSelectedApptIds] = useState<string[]>([]);

  // Bulk selection (slots)
  const [isSlotSelectMode, setIsSlotSelectMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async (dateStr: string) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const start = new Date(`${dateStr}T00:00:00`).toISOString();
      const end = new Date(`${dateStr}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select(`id, appointment_date, status, clients(id, full_name, phone)`)
        .gte("appointment_date", start)
        .lte("appointment_date", end)
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      setAppointments((data as any[]) || []);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSlots = useCallback(async (dateStr: string) => {
    setSlotsLoading(true);
    try {
      const { data, error } = await supabase
        .from("available_slots")
        .select("id, slot_date, slot_time")
        .eq("slot_date", dateStr)
        .order("slot_time", { ascending: true });
      if (error) throw error;
      setSlots((data as AvailableSlot[]) || []);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAdminReviews(data || []);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchAppointments(selectedDate);
    fetchSlots(selectedDate);
  }, [selectedDate, fetchAppointments, fetchSlots, session]);

  useEffect(() => {
    if (!session) return;
    if (activeTab === "resenas") {
      fetchReviews();
    }
  }, [activeTab, fetchReviews, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError("Credenciales incorrectas");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ─── Handlers: Appointments ────────────────────────────────────────────────
  const handleMarkNoShow = async (id: string) => {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "no-show" } : a));
    const { error } = await supabase.from("appointments").update({ status: "no-show" }).eq("id", id);
    if (error) { alert("Error: " + error.message); fetchAppointments(selectedDate); }
  };

  const handleUndoNoShow = async (id: string) => {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "confirmed" } : a));
    const { error } = await supabase.from("appointments").update({ status: "confirmed" }).eq("id", id);
    if (error) { alert("Error: " + error.message); fetchAppointments(selectedDate); }
  };

  const handleDeleteAppointment = (appt: Appointment) => {
    const label = appt.status === "blocked"
      ? "este bloqueo"
      : `la cita de "${appt.clients?.full_name || "este cliente"}"`;
    
    openConfirm(
      "Eliminar Cita",
      `¿Seguro que quieres eliminar ${label}? Esta acción no se puede deshacer.`,
      async () => {
        closeConfirm();
        const { error } = await supabase.from("appointments").delete().eq("id", appt.id);
        if (error) { alert("Error: " + error.message); return; }
        setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
        setSelectedApptIds((prev) => prev.filter(id => id !== appt.id));
      }
    );
  };

  const handleBulkDeleteAppts = () => {
    if (selectedApptIds.length === 0) return;
    openConfirm(
      "Eliminar Múltiples Citas",
      `¿Seguro que quieres eliminar las ${selectedApptIds.length} citas seleccionadas? Esta acción no se puede deshacer.`,
      async () => {
        closeConfirm();
        const { error } = await supabase.from("appointments").delete().in("id", selectedApptIds);
        if (error) { alert("Error: " + error.message); return; }
        setAppointments((prev) => prev.filter((a) => !selectedApptIds.includes(a.id)));
        setSelectedApptIds([]);
        setIsSelectMode(false);
      }
    );
  };

  const toggleApptSelection = (id: string) => {
    setSelectedApptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAllAppts = () => {
    if (selectedApptIds.length === appointments.length) {
      setSelectedApptIds([]);
    } else {
      setSelectedApptIds(appointments.map(a => a.id));
    }
  };

  const handleBlockSlot = async (slotTime: string) => {
    // Buscar si ya hay un cliente bloqueador (o creamos uno dummy o lo ponemos sin client_id si lo quitamos)
    // Para simplificar, podemos hacer que 'blocked' no necesite client_id si actualizamos la BD
    // Pero si client_id es obligatorio en appointments, debemos buscar un client 'Bloqueo'.
    
    // Mejor: asumo que la tabla appointments permite client_id nulo para bloqueos, 
    // pero si da error, buscaremos o crearemos un client de bloqueo.
    const appointmentDate = new Date(`${selectedDate}T${slotTime}:00`).toISOString();
    
    // Para curarnos en salud, vamos a crear/buscar un cliente "Bloqueo"
    const { data: blockClient } = await supabase
      .from("clients")
      .upsert({ phone: "BLOQUEO", full_name: "Bloqueo Manual" }, { onConflict: "phone" })
      .select()
      .single();

    if (!blockClient) {
      alert("Error: No se pudo crear el cliente de bloqueo");
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      client_id: blockClient.id,
      appointment_date: appointmentDate,
      status: "blocked"
    });

    if (error) {
      alert("Error al bloquear: " + error.message);
    } else {
      fetchAppointments(selectedDate);
    }
  };

  // ─── Handlers: Slots ───────────────────────────────────────────────────────
  const handleDeleteSlot = (slot: AvailableSlot) => {
    const slotTime = slot.slot_time.slice(0, 5);
    const apptOnSlot = appointments.find((a) => {
      return formatTime(a.appointment_date) === slotTime && a.status !== "blocked";
    });

    const execDelete = async () => {
      closeConfirm();
      const { error } = await supabase.from("available_slots").delete().eq("id", slot.id);
      if (error) { alert("Error: " + error.message); return; }
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    };

    if (apptOnSlot) {
      openConfirm(
        "Turno Ocupado",
        `Este turno tiene una cita de "${apptOnSlot.clients?.full_name || "un cliente"}". ¿Eliminar igualmente?`,
        execDelete
      );
    } else {
      openConfirm(
        "Eliminar Turno",
        `¿Seguro que quieres eliminar el turno libre de las ${slotTime}?`,
        execDelete
      );
    }
  };

  const handleBulkDeleteSlots = () => {
    if (selectedSlotIds.length === 0) return;

    // Check if any selected slots have appointments
    const slotsWithAppts = slots.filter(s => selectedSlotIds.includes(s.id)).filter(s => {
      const slotTime = s.slot_time.slice(0, 5);
      return appointments.some(a => formatTime(a.appointment_date) === slotTime && a.status !== "blocked");
    });

    const msg = slotsWithAppts.length > 0
      ? `Hay ${slotsWithAppts.length} turnos ocupados seleccionados. ¿Seguro que quieres eliminar los ${selectedSlotIds.length} turnos seleccionados y sus citas?`
      : `¿Seguro que quieres eliminar los ${selectedSlotIds.length} turnos seleccionados?`;

    openConfirm(
      "Eliminar Múltiples Turnos",
      msg,
      async () => {
        closeConfirm();
        const { error } = await supabase.from("available_slots").delete().in("id", selectedSlotIds);
        if (error) { alert("Error: " + error.message); return; }
        setSlots((prev) => prev.filter((s) => !selectedSlotIds.includes(s.id)));
        setSelectedSlotIds([]);
        setIsSlotSelectMode(false);
      }
    );
  };

  const toggleSlotSelection = (id: string) => {
    setSelectedSlotIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAllSlots = () => {
    if (selectedSlotIds.length === slots.length) {
      setSelectedSlotIds([]);
    } else {
      setSelectedSlotIds(slots.map(s => s.id));
    }
  };

  const handleEditSlot = async (slot: AvailableSlot) => {
    if (!editTime) return;
    const { error } = await supabase
      .from("available_slots")
      .update({ slot_time: editTime + ":00" })
      .eq("id", slot.id);
    if (error) { alert("Error: " + error.message); return; }
    setSlots((prev) =>
      prev.map((s) => s.id === slot.id ? { ...s, slot_time: editTime + ":00" } : s)
        .sort((a, b) => a.slot_time.localeCompare(b.slot_time))
    );
    setEditingSlot(null);
    setEditTime("");
  };

  const handleBulkShift = async () => {
    if (!slots.length) return;
    const [newH, newM] = bulkNewStart.split(":").map(Number);
    const [oldH, oldM] = slots[0].slot_time.split(":").map(Number);
    const diffMin = (newH * 60 + newM) - (oldH * 60 + oldM);
    for (const s of slots) {
      const [h, m] = s.slot_time.split(":").map(Number);
      const newTotal = h * 60 + m + diffMin;
      const nh = String(Math.floor(newTotal / 60)).padStart(2, "0");
      const nm = String(newTotal % 60).padStart(2, "0");
      await supabase.from("available_slots").update({ slot_time: `${nh}:${nm}:00` }).eq("id", s.id);
    }
    setShowBulkShift(false);
    fetchSlots(selectedDate);
  };

  const handleGenerateSlots = async () => {
    setGenLoading(true);
    setGenStatus("");
    try {
      const times = generateSlotTimes(genStartTime, genEndTime, genInterval);
      const dates = genMode === "day" ? [genStartDate] : getDatesInRange(genStartDate, genEndDate, genWeekdays);
      const rows = dates.flatMap((date) => times.map((time) => ({ slot_date: date, slot_time: time + ":00" })));
      if (rows.length === 0) { setGenStatus("No se generaron turnos. Revisa los parámetros."); setGenLoading(false); return; }
      const { error } = await supabase.from("available_slots").upsert(rows, { onConflict: "slot_date,slot_time" });
      if (error) throw error;
      setGenStatus(`✓ ${rows.length} turnos generados correctamente.`);
      fetchSlots(selectedDate);
    } catch (e: any) {
      setGenStatus("Error: " + e.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDeleteReview = (id: string) => {
    openConfirm(
      "Eliminar Comentario",
      "¿Seguro que quieres eliminar este comentario? Desaparecerá de la web pública.",
      async () => {
        closeConfirm();
        const { error } = await supabase.from("reviews").delete().eq("id", id);
        if (error) { alert("Error al borrar: " + error.message); return; }
        setAdminReviews((prev) => prev.filter((r) => r.id !== id));
      }
    );
  };

  // ─── Handlers: Recurring ───────────────────────────────────────────────────
  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecLoading(true);

    const phoneRegex = /^[67]\d{8}$/;
    if (!phoneRegex.test(recPhone.trim())) {
      openConfirm(
        "Teléfono Inválido", 
        "Por favor, introduce un número de móvil válido en España (9 dígitos, empezando por 6 o 7).",
        () => closeConfirm()
      );
      setRecLoading(false);
      return;
    }

    try {
      // 1. Crear o buscar cliente
      const { data: clientData, error: clientErr } = await supabase
        .from("clients")
        .upsert({ phone: recPhone.trim(), full_name: recName.trim() }, { onConflict: "phone" })
        .select()
        .single();
      
      if (clientErr || !clientData) throw new Error("Error registrando cliente");

      // 2. Calcular las fechas futuras
      // recWeekday: 1=Lunes ... 7=Domingo (Date.getDay() da 0=Domingo, 1=Lunes...)
      const now = new Date();
      const appointmentsToInsert = [];
      let addedCount = 0;
      let checkDate = new Date(now);

      while (addedCount < recDuration) {
        let jsDay = checkDate.getDay();
        let targetJsDay = recWeekday === 7 ? 0 : recWeekday; // JS: 0 es Domingo

        if (jsDay === targetJsDay) {
          const year = checkDate.getFullYear();
          const month = String(checkDate.getMonth() + 1).padStart(2, '0');
          const day = String(checkDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const appointmentDate = new Date(`${dateStr}T00:00:00`);
          const [hourStr, minStr] = recTime.split(":");
          appointmentDate.setHours(parseInt(hourStr, 10), parseInt(minStr, 10), 0, 0);

          appointmentsToInsert.push({
            client_id: clientData.id,
            appointment_date: appointmentDate.toISOString(),
            status: "confirmed"
          });
          addedCount++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      // 3. Insertar ignorando conflictos (upsert con onConflict que ignore)
      const { error: insertErr } = await supabase
        .from("appointments")
        .upsert(appointmentsToInsert, { onConflict: "appointment_date", ignoreDuplicates: true });

      if (insertErr) throw new Error("Error insertando las citas: " + insertErr.message);

      openConfirm("¡Hecho!", `Se han planificado ${recDuration} semanas para ${recName}. Si había alguna hora ya ocupada, se ha respetado.`, () => closeConfirm());
      setShowRecurring(false);
      fetchAppointments(selectedDate);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecLoading(false);
    }
  };

  // ─── Derived: Agenda unificada ─────────────────────────────────────────────
  // Combina slots + citas en una sola lista cronológica
  const agendaEntries: AgendaEntry[] = (() => {
    const entries: AgendaEntry[] = [];
    const apptTimes = new Set(appointments.map((a) => formatTime(a.appointment_date)));

    // Añadir slots libres (no tienen cita encima)
    for (const slot of slots) {
      const t = slot.slot_time.slice(0, 5);
      if (!apptTimes.has(t)) {
        entries.push({ kind: "slot", slot, time: t });
      }
    }

    // Añadir todas las citas
    for (const appt of appointments) {
      entries.push({ kind: "appt", appt, time: formatTime(appt.appointment_date) });
    }

    // Ordenar cronológicamente
    return entries.sort((a, b) => a.time.localeCompare(b.time));
  })();

  // Métricas (solo citas de clientes reales)
  const citasCliente = appointments.filter((a) => a.status !== "blocked");
  const totalCitas = citasCliente.length;
  const citasConfirmadas = citasCliente.filter((a) => a.status !== "no-show").length;
  const faltas = citasCliente.filter((a) => a.status === "no-show").length;

  const WEEKDAY_LABELS = [
    { label: "D", value: 0 }, { label: "L", value: 1 }, { label: "M", value: 2 },
    { label: "X", value: 3 }, { label: "J", value: 4 }, { label: "V", value: 5 }, { label: "S", value: 6 },
  ];

  if (authLoading && !session) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white font-serif font-bold mb-6">
          P
        </div>
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h1 className="text-center font-serif text-xl text-white mb-6">Acceso a Panel</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-xs font-mono text-center">{loginError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 mt-4 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {authLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" title="Volver a la web pública" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:border-white transition-colors group">
              <span className="font-serif text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">P</span>
            </a>
            <div>
              <h1 className="font-serif text-base tracking-wide leading-none">Panel de Control</h1>
              <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono mt-0.5">Peña Barber</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/5 border border-white/10 text-neutral-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
            <a href="/" className="text-[10px] font-mono text-neutral-400 hover:text-white uppercase border border-white/10 hover:border-white/30 px-2 py-1.5 rounded transition-colors mr-1">
              Ver Web
            </a>
            <button onClick={handleLogout} className="text-[10px] font-mono text-red-500 hover:text-red-400 uppercase ml-2">
              Salir
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-3 overflow-x-auto no-scrollbar">
          {(["agenda", "horarios", "resenas"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-widest transition-all ${
                activeTab === tab ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {activeTab === tab && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 bg-white/10 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
              )}
              <span className="relative z-10">
                {tab === "agenda" ? "📋 Agenda" : tab === "horarios" ? "🗓 Horarios" : "⭐ Reseñas"}
              </span>
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto mt-2 space-y-6">
        <AnimatePresence mode="wait">

          {/* ═══════════════════ TAB: AGENDA ═══════════════════════════════════ */}
          {activeTab === "agenda" && (
            <motion.div key="agenda" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }} className="space-y-6">

              {/* MÉTRICAS */}
              <motion.section variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total", value: totalCitas, color: "text-white", border: "border-white/10" },
                  { label: "Activas", value: citasConfirmadas, color: "text-emerald-400", border: "border-emerald-900/40" },
                  { label: "Faltas", value: faltas, color: "text-red-400", border: "border-red-900/40" },
                ].map((m) => (
                  <motion.div key={m.label} variants={fadeUp} className={`bg-white/[0.03] border ${m.border} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono mb-1">{m.label}</span>
                    <span className={`text-3xl font-serif ${m.color}`}>{m.value}</span>
                  </motion.div>
                ))}
              </motion.section>

              {/* AGENDA UNIFICADA */}
              <motion.section variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400">Jornada Completa</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRecurring(true)}
                      className="text-[10px] uppercase tracking-widest font-mono text-neutral-400 bg-white/5 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded transition-all border border-white/5 flex items-center gap-1.5"
                    >
                      <span>🔄</span> <span className="hidden sm:inline">Cita Recurrente</span>
                    </button>
                    {(isLoading || slotsLoading) && <div className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />}
                  </div>
                </div>

                {/* BOTONERA SELECCIÓN MÚLTIPLE */}
                {agendaEntries.some(e => e.kind === "appt") && (
                  <div className="flex items-center justify-between mb-4 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsSelectMode(!isSelectMode);
                          if (isSelectMode) setSelectedApptIds([]); // clear selection if exiting
                        }}
                        className={`text-[9px] uppercase font-mono tracking-widest transition-colors ${isSelectMode ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
                      >
                        {isSelectMode ? "Cancelar Selección" : "✓ Seleccionar Citas"}
                      </button>
                      {isSelectMode && (
                        <button
                          onClick={handleSelectAllAppts}
                          className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 hover:text-white transition-colors"
                        >
                          {selectedApptIds.length === appointments.length ? "Deseleccionar todo" : "Seleccionar Todo"}
                        </button>
                      )}
                    </div>
                    {isSelectMode && selectedApptIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteAppts}
                        className="text-[9px] uppercase font-mono tracking-widest bg-red-950/40 text-red-400 hover:text-red-300 hover:bg-red-900/40 border border-red-900/40 px-2 py-1 rounded transition-colors"
                      >
                        🗑 Borrar ({selectedApptIds.length})
                      </button>
                    )}
                  </div>
                )}

                {errorMsg ? (
                  <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/30 text-xs text-red-300 text-center font-mono">{errorMsg}</div>
                ) : agendaEntries.length === 0 && !isLoading && !slotsLoading ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-neutral-600 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <span className="text-4xl mb-3">📭</span>
                    <span className="text-sm font-light">Sin actividad para este día</span>
                    <span className="text-xs text-neutral-700 mt-1 font-mono">Crea turnos en la pestaña Horarios</span>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {agendaEntries.map((entry, i) => {
                        // ── Slot libre ──────────────────────────────────────
                        if (entry.kind === "slot") {
                          return (
                            <motion.div
                              key={`slot-${entry.slot.id}`}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ delay: i * 0.03 }}
                              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/5 border-dashed bg-white/[0.02] opacity-75 hover:opacity-100 transition-opacity"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-neutral-600 w-12 shrink-0">{entry.time}</span>
                                <span className="flex-1 text-[10px] text-neutral-700 uppercase tracking-widest font-mono">Libre</span>
                              </div>
                              <button
                                onClick={() => handleBlockSlot(entry.time)}
                                className="text-[9px] font-mono uppercase text-neutral-500 hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded-lg transition-colors"
                              >
                                🔒 Bloquear
                              </button>
                            </motion.div>
                          );
                        }

                        // ── Cita ────────────────────────────────────────────
                        const appt = entry.appt;
                        const isNoShow = appt.status === "no-show";
                        const isBlocked = appt.status === "blocked";

                        return (
                          <motion.article
                            key={`appt-${appt.id}`}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: isNoShow ? 0.5 : 1, y: 0, scale: isNoShow ? 0.99 : 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.03 }}
                            className={`p-4 rounded-2xl border relative ${
                              isBlocked
                                ? "bg-white/[0.02] border-white/5 border-dashed"
                                : isNoShow
                                ? "bg-red-950/10 border-red-900/20"
                                : "bg-white/[0.04] border-white/10 shadow-xl shadow-black/30"
                            } ${isSelectMode ? "cursor-pointer hover:border-white/20" : ""}`}
                            onClick={() => isSelectMode && toggleApptSelection(appt.id)}
                          >
                            {isSelectMode && (
                              <div className="absolute top-4 right-4 z-10">
                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                  selectedApptIds.includes(appt.id) ? "bg-white border-white text-black" : "bg-transparent border-white/20 text-transparent"
                                }`}>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            
                            {isBlocked ? (
                              /* ── BLOQUEADO ── */
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-lg font-bold text-neutral-600 w-12 shrink-0">{entry.time}</span>
                                <span className="flex-1 text-[9px] font-mono uppercase tracking-widest text-neutral-600 border border-neutral-800 px-2 py-1 rounded-lg w-fit">
                                  🔒 Bloqueado
                                </span>
                                {!isSelectMode && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt); }}
                                    className="text-[9px] font-mono uppercase text-red-500/50 border border-red-900/20 px-2 py-1.5 rounded-lg hover:text-red-400 hover:border-red-900/40 transition-colors shrink-0"
                                  >
                                    🗑 Eliminar
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* ── CITA REAL ── */
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-8">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-mono text-xl font-bold tracking-tight">{entry.time}</span>
                                    {isNoShow && (
                                      <span className="px-2 py-0.5 rounded-full bg-red-900/30 text-[9px] text-red-400 uppercase tracking-widest font-mono border border-red-900/40">
                                        Falta
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm font-medium truncate ${isNoShow ? "text-neutral-500" : "text-white"}`}>
                                    {appt.clients?.full_name || "Cliente desconocido"}
                                  </p>
                                  <p className={`text-xs font-mono mt-0.5 ${isNoShow ? "text-neutral-700" : "text-neutral-400"}`}>
                                    📱 {appt.clients?.phone || "Sin teléfono"}
                                  </p>
                                </div>

                                {/* ACCIONES */}
                                {!isSelectMode && (
                                  <div className="flex items-center gap-2 ml-3 shrink-0">
                                    {isNoShow ? (
                                      /* Deshacer falta */
                                      <>
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); handleUndoNoShow(appt.id); }}
                                          className="flex flex-col items-center px-2.5 py-2 rounded-xl bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-900/30 transition-all text-center"
                                          title="Deshacer falta"
                                        >
                                          <span className="text-base">↩️</span>
                                          <span className="text-[8px] uppercase tracking-wider font-mono mt-0.5">Deshacer</span>
                                        </motion.button>
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt); }}
                                          className="flex flex-col items-center px-2.5 py-2 rounded-xl bg-red-950/20 text-red-500/60 hover:text-red-400 border border-red-900/20 hover:border-red-900/40 transition-all"
                                          title="Eliminar cita"
                                        >
                                          <span className="text-base">🗑</span>
                                          <span className="text-[8px] uppercase tracking-wider font-mono mt-0.5">Borrar</span>
                                        </motion.button>
                                      </>
                                    ) : (
                                      /* Marcar falta */
                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); handleMarkNoShow(appt.id); }}
                                        className="flex flex-col items-center justify-center px-3 py-2.5 rounded-xl bg-red-950/30 text-red-400 hover:bg-red-900/40 border border-red-900/30 transition-all"
                                        title="Marcar como falta"
                                      >
                                        <span className="text-lg">👤</span>
                                        <span className="text-[8px] uppercase tracking-wider font-mono mt-1">Falta</span>
                                      </motion.button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}

          {/* ═══════════════════ TAB: HORARIOS ═════════════════════════════════ */}
          {activeTab === "horarios" && (
            <motion.div key="horarios" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }} className="space-y-6">

              {/* GENERADOR */}
              <motion.section variants={fadeUp} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400 mb-4">Generar Turnos</h2>

                <div className="flex gap-2 mb-4">
                  {(["day", "range"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGenMode(mode)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono uppercase tracking-widest transition-all border ${
                        genMode === mode ? "bg-white text-black border-white" : "bg-white/5 text-neutral-400 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {mode === "day" ? "📅 Día suelto" : "📆 Rango de días"}
                    </button>
                  ))}
                </div>

                <div className={`grid gap-3 mb-4 ${genMode === "range" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">{genMode === "range" ? "Desde" : "Fecha"}</label>
                    <input type="date" value={genStartDate} onChange={(e) => setGenStartDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-white/30"
                      style={{ colorScheme: "dark" }} />
                  </div>
                  {genMode === "range" && (
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Hasta</label>
                      <input type="date" value={genEndDate} onChange={(e) => setGenEndDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-white/30"
                        style={{ colorScheme: "dark" }} />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {genMode === "range" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                      <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-2">Días de la semana</label>
                      <div className="flex gap-1.5">
                        {[
                          { label: "D", value: 0 }, { label: "L", value: 1 }, { label: "M", value: 2 },
                          { label: "X", value: 3 }, { label: "J", value: 4 }, { label: "V", value: 5 }, { label: "S", value: 6 },
                        ].map(({ label, value }) => (
                          <button key={value}
                            onClick={() => setGenWeekdays((prev) => prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value])}
                            className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                              genWeekdays.includes(value) ? "bg-white text-black border-white" : "bg-white/5 text-neutral-600 border-white/10"
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Inicio</label>
                    <input type="time" value={genStartTime} onChange={(e) => setGenStartTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-white/30"
                      style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Fin</label>
                    <input type="time" value={genEndTime} onChange={(e) => setGenEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-white/30"
                      style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Cada (min)</label>
                    <input type="number" value={genInterval}
                      onChange={(e) => setGenInterval(e.target.value === "" ? "" as any : Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-white/30" />
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerateSlots} disabled={genLoading}
                  className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-50">
                  {genLoading ? "Generando..." : "⚡ Generar Turnos"}
                </motion.button>

                <AnimatePresence>
                  {genStatus && (
                    <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mt-3 text-center text-xs font-mono ${genStatus.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                      {genStatus}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.section>

              {/* TURNOS DEL DÍA */}
              <motion.section variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400">
                    Turnos · {selectedDate}
                  </h2>
                  <div className="flex items-center gap-2">
                    {slotsLoading && <div className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />}
                    {slots.length > 0 && (
                      <button onClick={() => setShowBulkShift(!showBulkShift)}
                        className="text-[9px] font-mono uppercase text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded-lg transition-colors">
                        ⏱ Ajuste masivo
                      </button>
                    )}
                  </div>
                </div>

                {/* BOTONERA SELECCIÓN MÚLTIPLE DE TURNOS */}
                {slots.length > 0 && (
                  <div className="flex items-center justify-between mb-4 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsSlotSelectMode(!isSlotSelectMode);
                          if (isSlotSelectMode) setSelectedSlotIds([]);
                        }}
                        className={`text-[9px] uppercase font-mono tracking-widest transition-colors ${isSlotSelectMode ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"}`}
                      >
                        {isSlotSelectMode ? "Cancelar Selección" : "✓ Seleccionar Turnos"}
                      </button>
                      {isSlotSelectMode && (
                        <button
                          onClick={handleSelectAllSlots}
                          className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 hover:text-white transition-colors"
                        >
                          {selectedSlotIds.length === slots.length ? "Deseleccionar todo" : "Seleccionar Todo"}
                        </button>
                      )}
                    </div>
                    {isSlotSelectMode && selectedSlotIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteSlots}
                        className="text-[9px] uppercase font-mono tracking-widest bg-red-950/40 text-red-400 hover:text-red-300 hover:bg-red-900/40 border border-red-900/40 px-2 py-1 rounded transition-colors"
                      >
                        🗑 Borrar ({selectedSlotIds.length})
                      </button>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {showBulkShift && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                      <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-[9px] text-amber-400/70 font-mono uppercase tracking-widest mb-1">Nueva hora de inicio del día</p>
                          <input type="time" value={bulkNewStart} onChange={(e) => setBulkNewStart(e.target.value)}
                            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none w-full"
                            style={{ colorScheme: "dark" }} />
                        </div>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleBulkShift}
                          className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl shrink-0">
                          Aplicar
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {slots.length === 0 && !slotsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-600 bg-white/[0.02] border border-white/5 rounded-2xl border-dashed">
                    <span className="text-3xl mb-2">⏰</span>
                    <span className="text-sm font-light">Sin turnos para este día</span>
                    <span className="text-xs text-neutral-700 mt-1 font-mono">Usa el generador de arriba</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {slots.map((slot, i) => {
                        const slotTime = slot.slot_time.slice(0, 5);
                        const apptOnSlot = appointments.find((a) => formatTime(a.appointment_date) === slotTime && a.status !== "blocked");
                        const isEditing = editingSlot === slot.id;
                        return (
                          <motion.div key={slot.id} layout
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, scale: 0.95 }}
                            transition={{ delay: i * 0.04 }}
                            className={`flex items-center gap-3 p-3 border rounded-xl relative ${isSlotSelectMode ? "cursor-pointer hover:border-white/20 bg-white/[0.04] border-white/10" : "bg-white/[0.03] border-white/[0.08]"}`}
                            onClick={() => isSlotSelectMode && toggleSlotSelection(slot.id)}
                          >
                            {isSlotSelectMode && (
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                selectedSlotIds.includes(slot.id) ? "bg-white border-white text-black" : "bg-transparent border-white/20 text-transparent"
                              }`}>
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}

                            <span className="font-mono text-sm font-bold w-12 shrink-0">{slotTime}</span>

                            {!isEditing && (
                              apptOnSlot
                                ? <span className="flex-1 text-xs text-emerald-400 font-mono truncate">✓ {apptOnSlot.clients?.full_name || "Ocupado"}</span>
                                : <span className="flex-1 text-[10px] text-neutral-600 font-mono uppercase tracking-widest">Libre</span>
                            )}
                            {isEditing && (
                              <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                                className="flex-1 bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                                style={{ colorScheme: "dark" }} autoFocus />
                            )}

                            {!isSlotSelectMode && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isEditing ? (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleEditSlot(slot); }} className="text-[9px] font-mono uppercase bg-emerald-900/40 text-emerald-400 border border-emerald-900/40 px-2 py-1 rounded-lg hover:bg-emerald-900/60">✓</button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSlot(null); setEditTime(""); }} className="text-[9px] font-mono uppercase bg-white/5 text-neutral-400 border border-white/10 px-2 py-1 rounded-lg">✕</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSlot(slot.id); setEditTime(slotTime); }}
                                      className="text-[9px] font-mono text-neutral-500 border border-white/10 px-2 py-1 rounded-lg hover:text-white hover:border-white/20 transition-colors">✏️</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot); }}
                                      className="text-[9px] font-mono text-red-500/60 border border-red-900/20 px-2 py-1 rounded-lg hover:text-red-400 hover:border-red-900/40 transition-colors">🗑</button>
                                  </>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}

          {/* ═══════════════════ TAB: RESEÑAS ═════════════════════════════════ */}
          {activeTab === "resenas" && (
            <motion.div key="resenas" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <motion.section variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400">
                    Comentarios de clientes
                  </h2>
                  {reviewsLoading && <div className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />}
                </div>

                {adminReviews.length === 0 && !reviewsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-600 bg-white/[0.02] border border-white/5 rounded-2xl border-dashed">
                    <span className="text-3xl mb-2">⭐</span>
                    <span className="text-sm font-light">Sin comentarios</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {adminReviews.map((rev, i) => (
                        <motion.div
                          key={rev.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.04 }}
                          className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl relative"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-medium text-white">{rev.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={`text-xs ${i < rev.rating ? "text-yellow-500" : "text-neutral-700"}`}>★</span>
                                ))}
                                <span className="text-[9px] font-mono text-neutral-500 ml-2">{new Date(rev.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="text-[9px] font-mono uppercase text-red-500/60 border border-red-900/20 px-2 py-1 rounded-lg hover:text-red-400 hover:border-red-900/40 transition-colors"
                            >
                              🗑 Eliminar
                            </button>
                          </div>
                          <p className="text-xs text-neutral-300 font-light italic">&quot;{rev.comment}&quot;</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── MODAL DE CONFIRMACIÓN CUSTOM ── */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeConfirm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xs bg-[#111] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col"
            >
              <h3 className="font-serif text-lg text-white mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-neutral-400 font-light mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <button
                  onClick={closeConfirm}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-white text-[10px] uppercase font-mono tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] uppercase font-mono tracking-widest transition-colors font-bold"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL CITAS RECURRENTES ── */}
      <AnimatePresence>
        {showRecurring && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !recLoading && setShowRecurring(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col"
            >
              <h3 className="font-serif text-lg text-white mb-1">Cita Recurrente</h3>
              <p className="text-xs text-neutral-400 font-light mb-6">Reserva la misma hora, el mismo día, todas las semanas.</p>
              
              <form onSubmit={handleRecurringSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Nombre</label>
                    <input type="text" required value={recName} onChange={e => setRecName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white" placeholder="Ej. Juan Pérez"/>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Teléfono</label>
                    <input type="tel" required value={recPhone} onChange={e => setRecPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white" placeholder="Ej. 600123456"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Día de la semana</label>
                    <select value={recWeekday} onChange={e => setRecWeekday(Number(e.target.value))} className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-xs text-white">
                      <option value={1}>Lunes</option>
                      <option value={2}>Martes</option>
                      <option value={3}>Miércoles</option>
                      <option value={4}>Jueves</option>
                      <option value={5}>Viernes</option>
                      <option value={6}>Sábado</option>
                      <option value={7}>Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">Hora</label>
                    <input type="time" required value={recTime} onChange={e => setRecTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white [color-scheme:dark]"/>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-neutral-500 mb-1">¿Durante cuánto tiempo?</label>
                  <select value={recDuration} onChange={e => setRecDuration(Number(e.target.value))} className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-xs text-white">
                    <option value={4}>1 Mes (4 semanas)</option>
                    <option value={8}>2 Meses (8 semanas)</option>
                    <option value={12}>3 Meses (12 semanas)</option>
                    <option value={24}>Medio año (24 semanas)</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-2">
                  <button type="button" onClick={() => setShowRecurring(false)} disabled={recLoading} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white text-[10px] uppercase font-mono tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={recLoading} className="flex-1 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-[10px] uppercase font-mono tracking-widest transition-colors font-bold disabled:opacity-50 flex justify-center">
                    {recLoading ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin"/> : "Generar Citas"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
