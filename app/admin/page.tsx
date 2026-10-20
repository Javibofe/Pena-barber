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

  const [activeTab, setActiveTab] = useState<"reservadas" | "disponibles" | "clientes" | "generar" | "resenas">("reservadas");
  const [selectedDate, setSelectedDate] = useState(getLocalToday());

  // Client Record & Autocomplete Directory
  interface ClientDirectoryItem {
    id: string;
    full_name: string;
    phone: string;
  }
  const [allClients, setAllClients] = useState<ClientDirectoryItem[]>([]);

  const fetchAllClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, phone")
        .order("full_name", { ascending: true });
      if (!error && data) {
        setAllClients(data);
      }
    } catch (e) {
      console.error("Error cargando directorio de clientes:", e);
    }
  }, []);

  // Client Management Tab state
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClientForMgmt, setSelectedClientForMgmt] = useState<ClientDirectoryItem | null>(null);
  const [clientApptsList, setClientApptsList] = useState<any[]>([]);
  const [clientApptsLoading, setClientApptsLoading] = useState(false);
  const [selectedBatchApptIds, setSelectedBatchApptIds] = useState<string[]>([]);
  const [clientApptsFilter, setClientApptsFilter] = useState<"todas" | "futuras" | "pasadas">("todas");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isClientSelectMode, setIsClientSelectMode] = useState(false);

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formatClientPhone = (phone?: string | null) => {
    if (!phone || phone.startsWith("ext_") || phone.startsWith("insta_") || phone.startsWith("sin_tel_")) {
      return "👤 Cliente Externo";
    }
    return phone;
  };

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
  const [recFirstName, setRecFirstName] = useState("");
  const [recLastName, setRecLastName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [showRecSuggestions, setShowRecSuggestions] = useState(false);
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

  // Assign slot state
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    slotTime: string;
    clientFirstName: string;
    clientLastName: string;
    clientPhone: string;
    loading: boolean;
    error: string;
  }>({
    isOpen: false,
    slotTime: "",
    clientFirstName: "",
    clientLastName: "",
    clientPhone: "",
    loading: false,
    error: "",
  });
  const [showAssignSuggestions, setShowAssignSuggestions] = useState(false);

  const handleAssignSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignModal(prev => ({ ...prev, loading: true, error: "" }));

    if (!assignModal.clientFirstName.trim()) {
      setAssignModal(prev => ({ ...prev, loading: false, error: "Introduce al menos el nombre del cliente." }));
      return;
    }

    const rawPhone = assignModal.clientPhone.trim();
    if (rawPhone) {
      const phoneRegex = /^[67]\d{8}$/;
      if (!phoneRegex.test(rawPhone)) {
        setAssignModal(prev => ({ ...prev, loading: false, error: "Teléfono inválido (9 dígitos, empezando por 6 o 7), o déjalo vacío si es de Instagram." }));
        return;
      }
    }

    const appointmentDate = new Date(`${selectedDate}T${assignModal.slotTime}:00`).toISOString();
    const lastName = assignModal.clientLastName.trim();
    const fullName = lastName ? `${assignModal.clientFirstName.trim()} ${lastName}` : assignModal.clientFirstName.trim();

    try {
      let targetClientId = "";

      if (rawPhone) {
        // Si ya existía como cliente externo con este nombre, actualizar su teléfono a su número real
        const existingExternal = allClients.find(
          c => c.full_name.trim().toLowerCase() === fullName.toLowerCase() &&
               (c.phone.startsWith("ext_") || c.phone.startsWith("insta_") || c.phone.startsWith("sin_tel_"))
        );
        if (existingExternal) {
          const { data: updatedClient } = await supabase
            .from("clients")
            .update({ phone: rawPhone, full_name: fullName })
            .eq("id", existingExternal.id)
            .select()
            .single();
          if (updatedClient) targetClientId = updatedClient.id;
        }

        if (!targetClientId) {
          // Guardar o actualizar con teléfono real normalmente
          const { data: client, error: clientError } = await supabase
            .from("clients")
            .upsert(
              { phone: rawPhone, full_name: fullName },
              { onConflict: "phone" }
            )
            .select()
            .single();

          if (clientError || !client) throw new Error("Error al guardar cliente: " + (clientError?.message || ""));
          targetClientId = client.id;
        }
      } else {
        // Cliente sin teléfono (cliente externo)
        const existingClient = allClients.find(c => c.full_name.trim().toLowerCase() === fullName.toLowerCase());
        if (existingClient) {
          targetClientId = existingClient.id;
        } else {
          const autoExtPhone = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const { data: client, error: clientError } = await supabase
            .from("clients")
            .insert({
              phone: autoExtPhone,
              full_name: fullName
            })
            .select()
            .single();

          if (clientError || !client) throw new Error("Error al guardar cliente: " + (clientError?.message || ""));
          targetClientId = client.id;
        }
      }

      // Check if slot is already booked
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", appointmentDate)
        .neq("status", "cancelled");

      if (existingAppts && existingAppts.length > 0) {
        throw new Error("Este turno ya está ocupado");
      }

      // Create appointment
      const { error: apptError } = await supabase
        .from("appointments")
        .insert({
          client_id: targetClientId,
          appointment_date: appointmentDate,
          status: "confirmed"
        });

      if (apptError) throw apptError;

      // Success
      setAssignModal(prev => ({
        ...prev,
        isOpen: false,
        clientFirstName: "",
        clientLastName: "",
        clientPhone: "",
        loading: false
      }));
      setShowAssignSuggestions(false);
      fetchAppointments(selectedDate);
      fetchAllClients();
    } catch (error: any) {
      setAssignModal(prev => ({ ...prev, loading: false, error: error.message }));
    }
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
    fetchAllClients();
  }, [selectedDate, fetchAppointments, fetchSlots, fetchAllClients, session]);

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

    if (!recFirstName.trim()) {
      openConfirm(
        "Nombre Obligatorio", 
        "Por favor, introduce al menos el nombre del cliente.",
        () => closeConfirm()
      );
      setRecLoading(false);
      return;
    }

    const rawRecPhone = recPhone.trim();
    if (rawRecPhone) {
      const phoneRegex = /^[67]\d{8}$/;
      if (!phoneRegex.test(rawRecPhone)) {
        openConfirm(
          "Teléfono Inválido", 
          "Por favor, introduce un número de móvil válido en España (9 dígitos, empezando por 6 o 7), o déjalo vacío si es de Instagram.",
          () => closeConfirm()
        );
        setRecLoading(false);
        return;
      }
    }

    const recFullName = recLastName.trim() 
      ? `${recFirstName.trim()} ${recLastName.trim()}` 
      : recFirstName.trim();

    try {
      // 1. Crear o buscar cliente
      let finalClientId = "";

      if (rawRecPhone) {
        // Si ya existía como cliente externo con este nombre, actualizar su teléfono
        const existingExternal = allClients.find(
          c => c.full_name.trim().toLowerCase() === recFullName.toLowerCase() &&
               (c.phone.startsWith("ext_") || c.phone.startsWith("insta_") || c.phone.startsWith("sin_tel_"))
        );
        if (existingExternal) {
          const { data: updatedClient } = await supabase
            .from("clients")
            .update({ phone: rawRecPhone, full_name: recFullName })
            .eq("id", existingExternal.id)
            .select()
            .single();
          if (updatedClient) finalClientId = updatedClient.id;
        }

        if (!finalClientId) {
          const { data: clientData, error: clientErr } = await supabase
            .from("clients")
            .upsert({ phone: rawRecPhone, full_name: recFullName }, { onConflict: "phone" })
            .select()
            .single();
          
          if (clientErr || !clientData) throw new Error("Error registrando cliente: " + (clientErr?.message || ""));
          finalClientId = clientData.id;
        }
      } else {
        // Sin teléfono (cliente externo)
        const existing = allClients.find(c => c.full_name.trim().toLowerCase() === recFullName.toLowerCase());
        if (existing) {
          finalClientId = existing.id;
        } else {
          const autoExtPhone = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const { data: clientData, error: clientErr } = await supabase
            .from("clients")
            .insert({ phone: autoExtPhone, full_name: recFullName })
            .select()
            .single();

          if (clientErr || !clientData) throw new Error("Error registrando cliente: " + (clientErr?.message || ""));
          finalClientId = clientData.id;
        }
      }

      // 2. Calcular las fechas futuras
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
            client_id: finalClientId,
            appointment_date: appointmentDate.toISOString(),
            status: "confirmed"
          });
          addedCount++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      // 3. Insertar ignorando conflictos
      const { error: insertErr } = await supabase
        .from("appointments")
        .upsert(appointmentsToInsert, { onConflict: "appointment_date", ignoreDuplicates: true });

      if (insertErr) throw new Error("Error insertando las citas: " + insertErr.message);

      openConfirm("¡Hecho!", `Se han planificado ${recDuration} semanas para ${recFullName}. Si había alguna hora ya ocupada, se ha respetado.`, () => closeConfirm());
      setShowRecurring(false);
      setRecFirstName("");
      setRecLastName("");
      setRecPhone("");
      setShowRecSuggestions(false);
      fetchAppointments(selectedDate);
      fetchAllClients();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecLoading(false);
    }
  };

  // ─── Handlers: Client Management (Batch & Single) ──────────────────────────
  const fetchClientAppointments = useCallback(async (client: ClientDirectoryItem) => {
    setSelectedClientForMgmt(client);
    setClientApptsLoading(true);
    setSelectedBatchApptIds([]);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, status, created_at")
        .eq("client_id", client.id)
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      setClientApptsList((data || []).filter((a: any) => a.status !== "cancelled"));
    } catch (e: any) {
      alert("Error al cargar citas del cliente: " + e.message);
    } finally {
      setClientApptsLoading(false);
    }
  }, []);

  const handleBatchCancelClientAppts = () => {
    if (selectedBatchApptIds.length === 0) return;
    openConfirm(
      "Anular Citas Seleccionadas",
      `¿Seguro que quieres anular ${selectedBatchApptIds.length} cita(s)? Los turnos quedarán libres de inmediato en la web para que otros clientes puedan reservarlos.`,
      async () => {
        closeConfirm();
        const { error } = await supabase
          .from("appointments")
          .delete()
          .in("id", selectedBatchApptIds);
        if (error) { alert("Error: " + error.message); return; }
        if (selectedClientForMgmt) fetchClientAppointments(selectedClientForMgmt);
        fetchAppointments(selectedDate);
      }
    );
  };

  const handleBatchDeleteClientAppts = () => {
    if (selectedBatchApptIds.length === 0) return;
    openConfirm(
      "Eliminar Citas Definitivamente",
      `¿Seguro que quieres eliminar definitivamente ${selectedBatchApptIds.length} cita(s) de la base de datos?`,
      async () => {
        closeConfirm();
        const { error } = await supabase
          .from("appointments")
          .delete()
          .in("id", selectedBatchApptIds);
        if (error) { alert("Error: " + error.message); return; }
        if (selectedClientForMgmt) fetchClientAppointments(selectedClientForMgmt);
        fetchAppointments(selectedDate);
      }
    );
  };

  const handleSingleCancelClientAppt = (apptId: string) => {
    openConfirm(
      "Anular Cita",
      "¿Seguro que quieres anular esta cita? El turno se liberará de inmediato para que otros clientes puedan reservarlo.",
      async () => {
        closeConfirm();
        const { error } = await supabase
          .from("appointments")
          .delete()
          .eq("id", apptId);
        if (error) { alert("Error: " + error.message); return; }
        if (selectedClientForMgmt) fetchClientAppointments(selectedClientForMgmt);
        fetchAppointments(selectedDate);
      }
    );
  };

  const handleSingleDeleteClientAppt = (apptId: string) => {
    openConfirm(
      "Eliminar Cita",
      "¿Seguro que quieres eliminar esta cita permanentemente de la base de datos?",
      async () => {
        closeConfirm();
        const { error } = await supabase
          .from("appointments")
          .delete()
          .eq("id", apptId);
        if (error) { alert("Error: " + error.message); return; }
        if (selectedClientForMgmt) fetchClientAppointments(selectedClientForMgmt);
        fetchAppointments(selectedDate);
      }
    );
  };

  const handleDeleteClient = (client: ClientDirectoryItem) => {
    openConfirm(
      "Eliminar Cliente",
      `¿Seguro que quieres eliminar a "${client.full_name}"? Se borrarán también todas sus citas registradas en la base de datos.`,
      async () => {
        closeConfirm();
        try {
          // Eliminar citas asociadas primero
          await supabase.from("appointments").delete().eq("client_id", client.id);
          const { error } = await supabase.from("clients").delete().eq("id", client.id);
          if (error) {
            alert("Error al eliminar cliente: " + error.message);
            return;
          }
          setAllClients((prev) => prev.filter((c) => c.id !== client.id));
          setSelectedClientIds((prev) => prev.filter((id) => id !== client.id));
          if (selectedClientForMgmt?.id === client.id) {
            setSelectedClientForMgmt(null);
            setClientApptsList([]);
          }
          fetchAppointments(selectedDate);
        } catch (err: any) {
          alert("Error: " + err.message);
        }
      }
    );
  };

  const handleBatchDeleteClients = () => {
    if (selectedClientIds.length === 0) return;
    openConfirm(
      "Eliminar Clientes Seleccionados",
      `¿Seguro que deseas eliminar los ${selectedClientIds.length} clientes seleccionados? Esta acción eliminará permanentemente sus fichas y todas sus citas registradas.`,
      async () => {
        closeConfirm();
        try {
          // Eliminar citas de los clientes seleccionados
          await supabase.from("appointments").delete().in("client_id", selectedClientIds);
          const { error } = await supabase.from("clients").delete().in("id", selectedClientIds);
          if (error) {
            alert("Error al eliminar clientes: " + error.message);
            return;
          }
          const idsToDelete = new Set(selectedClientIds);
          setAllClients((prev) => prev.filter((c) => !idsToDelete.has(c.id)));
          if (selectedClientForMgmt && idsToDelete.has(selectedClientForMgmt.id)) {
            setSelectedClientForMgmt(null);
            setClientApptsList([]);
          }
          setSelectedClientIds([]);
          setIsClientSelectMode(false);
          fetchAppointments(selectedDate);
        } catch (err: any) {
          alert("Error: " + err.message);
        }
      }
    );
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
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <a href="/" title="Volver a la web pública" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:border-white transition-colors group shrink-0">
                <span className="font-serif text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">P</span>
              </a>
              <div>
                <h1 className="font-serif text-base tracking-wide leading-none">Panel de Control</h1>
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono mt-0.5">Peña Barber</p>
              </div>
            </div>
            
            <button onClick={handleLogout} className="sm:hidden text-[10px] font-mono text-red-500/80 hover:text-red-400 border border-red-900/30 px-2 py-1 rounded">
              Salir
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none bg-white/5 border border-white/10 text-neutral-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
            <a href="/" className="hidden sm:block text-[10px] font-mono text-neutral-400 hover:text-white uppercase border border-white/10 hover:border-white/30 px-2 py-1.5 rounded transition-colors shrink-0">
              Ver Web
            </a>
            <button onClick={handleLogout} className="hidden sm:block text-[10px] font-mono text-red-500 hover:text-red-400 uppercase ml-1 shrink-0">
              Salir
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-3 overflow-x-auto no-scrollbar">
          {(["reservadas", "disponibles", "clientes", "generar", "resenas"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                activeTab === tab ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {activeTab === tab && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 bg-white/10 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
              )}
              <span className="relative z-10">
                {tab === "reservadas" ? "📋 Reservadas" : tab === "disponibles" ? "✅ Libres" : tab === "clientes" ? "👥 Clientes" : tab === "generar" ? "⚙️ Generar" : "⭐ Reseñas"}
              </span>
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto mt-2 space-y-6">
        <AnimatePresence mode="wait">

          {/* ═══════════════════ TAB: RESERVADAS ═══════════════════════════════════ */}
          {activeTab === "reservadas" && (() => {
            const reservadasEntries = agendaEntries.filter(e => e.kind === "appt");
            return (
              <motion.div key="reservadas" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }} className="space-y-6">

                {/* MÉTRICAS */}
                <motion.section variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: totalCitas, color: "text-white", border: "border-white/10" },
                    { label: "Activas", value: citasConfirmadas, color: "text-white", border: "border-white/10" },
                    { label: "Faltas", value: faltas, color: "text-red-400", border: "border-red-900/40" },
                  ].map((m) => (
                    <motion.div key={m.label} variants={fadeUp} className={`bg-white/[0.03] border ${m.border} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono mb-1">{m.label}</span>
                      <span className={`text-3xl font-serif ${m.color}`}>{m.value}</span>
                    </motion.div>
                  ))}
                </motion.section>

                <motion.section variants={fadeUp}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400">Citas Reservadas</h2>
                    <div className="flex items-center gap-3">
                      {(isLoading || slotsLoading) && <div className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />}
                    </div>
                  </div>

                  {/* BOTONERA SELECCIÓN MÚLTIPLE */}
                  {reservadasEntries.length > 0 && (
                    <div className="flex items-center justify-between mb-4 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            if (isSelectMode) setSelectedApptIds([]);
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
                  ) : reservadasEntries.length === 0 && !isLoading ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-neutral-600 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <span className="text-4xl mb-3">📭</span>
                      <span className="text-sm font-light">No hay citas reservadas hoy</span>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {reservadasEntries.map((entry, i) => {
                          if (entry.kind !== "appt") return null;

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
                                    📱 {formatClientPhone(appt.clients?.phone)}
                                  </p>
                                </div>

                                {/* ACCIONES */}
                                {!isSelectMode && (
                                  <div className="flex flex-col sm:flex-row items-center gap-2 ml-2 shrink-0">
                                    {isNoShow ? (
                                      /* Deshacer falta */
                                      <div className="flex flex-row sm:flex-row gap-2">
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); handleUndoNoShow(appt.id); }}
                                          className="flex flex-col items-center px-2 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all text-center min-w-[50px]"
                                          title="Deshacer falta"
                                        >
                                          <span className="text-base">↩️</span>
                                          <span className="text-[7px] uppercase tracking-wider font-mono mt-0.5">Deshacer</span>
                                        </motion.button>
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt); }}
                                          className="flex flex-col items-center px-2 py-2 rounded-xl bg-red-950/20 text-red-500/60 hover:text-red-400 border border-red-900/20 hover:border-red-900/40 transition-all min-w-[50px]"
                                          title="Eliminar cita"
                                        >
                                          <span className="text-base">🗑</span>
                                          <span className="text-[7px] uppercase tracking-wider font-mono mt-0.5">Borrar</span>
                                        </motion.button>
                                      </div>
                                    ) : (
                                      /* Acciones para cita normal */
                                      <div className="flex flex-row sm:flex-row gap-2">
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt); }}
                                          className="flex flex-col items-center justify-center px-2 py-2 rounded-xl bg-red-950/20 text-red-500/60 hover:text-red-400 border border-red-900/20 hover:border-red-900/40 transition-all min-w-[50px]"
                                          title="Cancelar cita (quedará libre)"
                                        >
                                          <span className="text-base">🗑</span>
                                          <span className="text-[7px] uppercase tracking-wider font-mono mt-0.5">Anular</span>
                                        </motion.button>
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); handleMarkNoShow(appt.id); }}
                                          className="flex flex-col items-center justify-center px-2 py-2 rounded-xl bg-red-950/30 text-red-400 hover:bg-red-900/40 border border-red-900/30 transition-all min-w-[50px]"
                                          title="Marcar como falta"
                                        >
                                          <span className="text-lg">👤</span>
                                          <span className="text-[7px] uppercase tracking-wider font-mono mt-0.5">Falta</span>
                                        </motion.button>
                                      </div>
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
            );
          })()}

          {/* ═══════════════════ TAB: DISPONIBLES ═══════════════════════════════════ */}
          {activeTab === "disponibles" && (() => {
            const disponiblesEntries = agendaEntries.filter(e => e.kind === "slot");
            return (
              <motion.div key="disponibles" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }} className="space-y-6">
                <motion.section variants={fadeUp}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400">Huecos Libres</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowRecurring(true)}
                        className="text-[10px] uppercase tracking-widest font-mono text-neutral-400 bg-white/5 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded transition-all border border-white/5 flex items-center gap-1.5"
                      >
                        <span>🔄</span> <span className="hidden sm:inline">Cita Recurrente</span>
                      </button>
                      {(slotsLoading) && <div className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />}
                    </div>
                  </div>

                  {disponiblesEntries.length === 0 && !slotsLoading ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-neutral-600 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <span className="text-4xl mb-3">🕰</span>
                      <span className="text-sm font-light">No hay huecos libres para hoy</span>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {disponiblesEntries.map((entry, i) => {
                          if (entry.kind !== "slot") return null;
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
                                <span className="flex-1 text-[10px] text-neutral-400 uppercase tracking-widest font-mono">Libre</span>
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                                <button
                                  onClick={() => {
                                    setAssignModal({
                                      isOpen: true,
                                      slotTime: entry.time,
                                      error: "",
                                      clientFirstName: "",
                                      clientLastName: "",
                                      clientPhone: "",
                                      loading: false
                                    });
                                    setShowAssignSuggestions(false);
                                  }}
                                  className="text-[9px] font-mono uppercase bg-white/10 text-white hover:bg-white/20 border border-white/20 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-center"
                                >
                                  + Asignar
                                </button>
                                <button
                                  onClick={() => handleBlockSlot(entry.time)}
                                  className="text-[9px] font-mono uppercase text-neutral-500 hover:text-white border border-white/10 hover:border-white/30 px-2 py-1.5 rounded-lg transition-colors text-center"
                                >
                                  🔒 Bloquear
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.section>
              </motion.div>
            );
          })()}

          {/* ═══════════════════ TAB: CLIENTES Y GESTIÓN MASIVA ═════════════════ */}
          {activeTab === "clientes" && (() => {
            const nowFilter = new Date();
            const filteredClientAppts = clientApptsList
              .filter((appt) => appt.status !== "cancelled")
              .filter((appt) => {
                if (clientApptsFilter === "todas") return true;
                const isPast = new Date(appt.appointment_date) < nowFilter;
                if (clientApptsFilter === "futuras") return !isPast;
                if (clientApptsFilter === "pasadas") return isPast;
                return true;
              });

            return (
              <motion.div key="clientes" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }} className="space-y-6">
                <motion.section variants={fadeUp} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h2 className="text-[10px] uppercase tracking-[0.25em] font-mono text-neutral-400">
                        Gestión y Citas por Cliente
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Busca a cualquier cliente para ver todas sus citas, anularlas o eliminarlas por lotes.
                      </p>
                    </div>
                    {selectedClientForMgmt && (
                      <button
                        onClick={() => {
                          setSelectedClientForMgmt(null);
                          setClientSearchQuery("");
                          setClientApptsList([]);
                        }}
                        className="text-[10px] font-mono uppercase px-3 py-1.5 rounded-lg border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 transition-colors w-fit"
                      >
                        🔍 Buscar otro cliente
                      </button>
                    )}
                  </div>

                  {/* Buscador de Cliente y Directorio */}
                  {!selectedClientForMgmt ? (() => {
                    const filteredClients = allClients.filter((c) => {
                      if (!clientSearchQuery.trim()) return true;
                      const q = clientSearchQuery.toLowerCase();
                      return (
                        c.full_name.toLowerCase().includes(q) ||
                        c.phone.includes(q)
                      );
                    });

                    return (
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, apellidos o teléfono..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 font-mono"
                            autoFocus
                          />
                          {clientSearchQuery && (
                            <button
                              onClick={() => setClientSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs font-mono"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Barra de herramientas / Selección múltiple */}
                        <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                            {filteredClients.length} {filteredClients.length === 1 ? "cliente" : "clientes"}
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setIsClientSelectMode(!isClientSelectMode);
                                setSelectedClientIds([]);
                              }}
                              className={`text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-lg border transition-colors ${
                                isClientSelectMode
                                  ? "bg-white text-black font-bold border-white"
                                  : "border-white/15 text-neutral-300 hover:text-white hover:border-white/30"
                              }`}
                            >
                              {isClientSelectMode ? "Cancelar" : "✓ Seleccionar"}
                            </button>

                            {isClientSelectMode && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedClientIds.length === filteredClients.length) {
                                      setSelectedClientIds([]);
                                    } else {
                                      setSelectedClientIds(filteredClients.map((c) => c.id));
                                    }
                                  }}
                                  className="text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-lg border border-white/15 text-neutral-300 hover:text-white hover:border-white/30 transition-colors"
                                >
                                  {selectedClientIds.length === filteredClients.length
                                    ? "Deseleccionar"
                                    : `Todo (${filteredClients.length})`}
                                </button>

                                {selectedClientIds.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={handleBatchDeleteClients}
                                    className="text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-900/40 transition-colors font-bold flex items-center gap-1.5"
                                  >
                                    <span>🗑</span>
                                    <span>Eliminar ({selectedClientIds.length})</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Lista de clientes encontrados */}
                        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                          {filteredClients.map((c) => {
                            const isSelected = selectedClientIds.includes(c.id);

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  if (isClientSelectMode) {
                                    setSelectedClientIds((prev) =>
                                      prev.includes(c.id)
                                        ? prev.filter((id) => id !== c.id)
                                        : [...prev, c.id]
                                    );
                                  } else {
                                    fetchClientAppointments(c);
                                  }
                                }}
                                className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all group ${
                                  isSelected
                                    ? "bg-white/[0.08] border-white/30"
                                    : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/20"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {isClientSelectMode ? (
                                    <div
                                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                        isSelected
                                          ? "bg-white border-white text-black"
                                          : "border-white/20 bg-transparent text-transparent"
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-serif font-bold text-neutral-300 group-hover:text-white group-hover:bg-white/20 transition-colors">
                                      {c.full_name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                                      {c.full_name}
                                    </h4>
                                    <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                                      📱 {formatClientPhone(c.phone)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {!isClientSelectMode && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => fetchClientAppointments(c)}
                                        className="text-[10px] font-mono uppercase px-3 py-1.5 rounded-lg bg-white/5 group-hover:bg-white/15 text-neutral-300 group-hover:text-white border border-white/10 transition-colors"
                                      >
                                        Ver citas ➔
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteClient(c)}
                                        className="text-[11px] px-2.5 py-1.5 rounded-lg border border-red-900/30 text-red-400/80 hover:text-red-300 hover:border-red-900/50 bg-red-950/20 hover:bg-red-950/40 transition-colors"
                                        title="Eliminar cliente"
                                      >
                                        🗑
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {filteredClients.length === 0 && (
                            <div className="py-8 text-center text-neutral-500 font-mono text-xs">
                              {allClients.length === 0
                                ? "No hay clientes registrados en la base de datos."
                                : "No se encontraron clientes con esa búsqueda."}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    /* Ficha del Cliente y Lista de Citas */
                    <div className="space-y-4">
                      {/* Tarjeta Cliente */}
                      <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-serif font-bold text-sm">
                            {selectedClientForMgmt.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-serif text-sm sm:text-base text-white font-bold">
                              {selectedClientForMgmt.full_name}
                            </h3>
                            <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                              📱 Teléfono: <strong className="text-neutral-200">{formatClientPhone(selectedClientForMgmt.phone)}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-full bg-white/10 text-neutral-300 border border-white/10 w-fit">
                            {clientApptsList.length} {clientApptsList.length === 1 ? "cita total" : "citas totales"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(selectedClientForMgmt)}
                            className="text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-lg bg-red-950/30 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-900/50 transition-colors flex items-center gap-1.5"
                            title="Eliminar este cliente y todas sus citas"
                          >
                            <span>🗑</span>
                            <span>Eliminar Cliente</span>
                          </button>
                        </div>
                      </div>

                      {/* Toolbar: Filtros y Acciones por Lotes */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 w-fit">
                          {(["todas", "futuras", "pasadas"] as const).map((fil) => (
                            <button
                              key={fil}
                              onClick={() => setClientApptsFilter(fil)}
                              className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded transition-colors capitalize ${
                                clientApptsFilter === fil
                                  ? "bg-white text-black font-bold"
                                  : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              {fil}
                            </button>
                          ))}
                        </div>

                        {/* Botones de acción masiva */}
                        {filteredClientAppts.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                if (selectedBatchApptIds.length === filteredClientAppts.length) {
                                  setSelectedBatchApptIds([]);
                                } else {
                                  setSelectedBatchApptIds(filteredClientAppts.map((a) => a.id));
                                }
                              }}
                              className="text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-lg border border-white/15 text-neutral-300 hover:text-white hover:border-white/30 transition-colors"
                            >
                              {selectedBatchApptIds.length === filteredClientAppts.length
                                ? "Deseleccionar"
                                : `Seleccionar todas (${filteredClientAppts.length})`}
                            </button>

                            {selectedBatchApptIds.length > 0 && (
                              <button
                                onClick={handleBatchCancelClientAppts}
                                className="text-[10px] font-mono uppercase px-2.5 py-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-900/40 transition-colors font-bold flex items-center gap-1.5"
                                title="Anular citas seleccionadas y liberar los huecos en la web"
                              >
                                <span>🗑</span>
                                <span>Anular ({selectedBatchApptIds.length})</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Lista de Citas del Cliente */}
                      {clientApptsLoading ? (
                        <div className="py-12 text-center">
                          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-2" />
                          <p className="text-xs font-mono text-neutral-400">Cargando citas...</p>
                        </div>
                      ) : filteredClientAppts.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                          <p className="text-xs font-mono text-neutral-400">No hay citas en este filtro.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredClientAppts.map((appt) => {
                            const dateObj = new Date(appt.appointment_date);
                            const isPast = dateObj < nowFilter;
                            const isSelected = selectedBatchApptIds.includes(appt.id);
                            const dayStr = dateObj.toLocaleDateString("es-ES", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });
                            const hours = String(dateObj.getHours()).padStart(2, "0");
                            const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                            const timeStr = `${hours}:${minutes} hs`;

                            return (
                              <div
                                key={appt.id}
                                onClick={() => {
                                  setSelectedBatchApptIds((prev) =>
                                    prev.includes(appt.id)
                                      ? prev.filter((id) => id !== appt.id)
                                      : [...prev, appt.id]
                                  );
                                }}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-white/[0.08] border-white/30"
                                    : "bg-white/[0.02] border-white/5 hover:border-white/15"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                      isSelected
                                        ? "bg-white border-white text-black"
                                        : "border-white/20 bg-transparent text-transparent"
                                    }`}
                                  >
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-bold text-white">{timeStr}</span>
                                      <span className="text-neutral-500 text-xs">—</span>
                                      <span className="text-xs text-neutral-300 font-mono capitalize">{dayStr}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {isPast ? (
                                        <span className="text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-neutral-500 border border-white/5">
                                          Pasada
                                        </span>
                                      ) : (
                                        <span className="text-[9px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-medium">
                                          Confirmada
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleSingleCancelClientAppt(appt.id)}
                                    className="text-[9px] font-mono uppercase px-2.5 py-1 rounded-lg bg-red-950/20 text-red-400/80 hover:text-red-300 border border-red-900/20 hover:border-red-900/40 transition-colors flex items-center gap-1"
                                    title={isPast ? "Borrar registro de cita pasada" : "Anular cita y liberar turno en la web"}
                                  >
                                    <span>🗑</span>
                                    <span>{isPast ? "Borrar" : "Anular"}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </motion.section>
              </motion.div>
            );
          })()}

          {/* ═══════════════════ TAB: GENERAR ═════════════════════════════════ */}
          {activeTab === "generar" && (
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
                      className={`mt-3 text-center text-xs font-mono ${genStatus.startsWith("✓") ? "text-white" : "text-red-400"}`}>
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
                                ? <span className="flex-1 text-[10px] text-neutral-300 font-mono uppercase tracking-widest">Reservado</span>
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
                                    <button onClick={(e) => { e.stopPropagation(); handleEditSlot(slot); }} className="text-[9px] font-mono uppercase bg-white/10 text-white border border-white/20 px-2 py-1 rounded-lg hover:bg-white/20">✓</button>
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
                {/* Nombre y Apellidos con Autocompletado */}
                <div className="relative">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={recFirstName}
                        onChange={e => {
                          setRecFirstName(e.target.value);
                          setShowRecSuggestions(true);
                        }}
                        onFocus={() => setShowRecSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowRecSuggestions(false), 200)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                        placeholder="Ej. Juan"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Apellidos <span className="text-neutral-500 lowercase">(opcional)</span></label>
                      <input
                        type="text"
                        value={recLastName}
                        onChange={e => {
                          setRecLastName(e.target.value);
                          setShowRecSuggestions(true);
                        }}
                        onFocus={() => setShowRecSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowRecSuggestions(false), 200)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                        placeholder="Ej. Pérez"
                      />
                    </div>
                  </div>

                  {/* Sugerencias Autocompletado Recurrentes (sólo si hay coincidencias para no tapar el label) */}
                  {(() => {
                    const q = `${recFirstName} ${recLastName}`.trim().toLowerCase();
                    if (!showRecSuggestions || !q) return null;
                    const filtered = allClients.filter(c => {
                      const matchName = c.full_name.toLowerCase().includes(q);
                      const matchPhone = c.phone && !c.phone.startsWith("ext_") && !c.phone.startsWith("insta_") && c.phone.includes(q);
                      return matchName || matchPhone;
                    });
                    if (filtered.length === 0) return null;
                    return (
                      <div className="absolute top-[64px] left-0 right-0 z-50 bg-[#161616] border border-white/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-1">
                        <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 text-[9px] font-mono text-neutral-400">
                          <span>Sugerencias ({filtered.length})</span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowRecSuggestions(false);
                            }}
                            className="text-neutral-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                          >
                            ✕ Cerrar
                          </button>
                        </div>
                        {filtered.map(c => {
                          const parts = c.full_name.trim().split(" ");
                          const fName = parts[0] || "";
                          const lName = parts.slice(1).join(" ");
                          const isExternal = c.phone.startsWith("ext_") || c.phone.startsWith("insta_") || c.phone.startsWith("sin_tel_");
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setRecFirstName(fName);
                                setRecLastName(lName);
                                setRecPhone(isExternal ? "" : c.phone);
                                setShowRecSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs group"
                            >
                              <span className="text-white group-hover:text-white/80 transition-colors">{c.full_name}</span>
                              <span className="font-mono text-[11px] text-neutral-400">
                                {isExternal ? "👤 Cliente Externo" : c.phone}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">
                      Teléfono Móvil <span className="text-neutral-500 lowercase">(opcional - cliente externo)</span>
                    </label>
                    <input
                      type="tel"
                      value={recPhone}
                      onChange={e => setRecPhone(e.target.value)}
                      onFocus={() => setShowRecSuggestions(false)}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                      placeholder="Ej. 600123456 (o vacío si es externo)"
                    />
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
      {/* ── MODAL ASIGNAR CITA ── */}
      <AnimatePresence>
        {assignModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !assignModal.loading && setAssignModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col"
            >
              <h3 className="font-serif text-lg text-white mb-1">Asignar Turno - {assignModal.slotTime}</h3>
              <p className="text-xs text-neutral-400 font-light mb-4">Asigna este hueco a un cliente manualmente.</p>
              
              <form onSubmit={handleAssignSlot} className="space-y-4">
                {/* Nombre y Apellidos con Autocompletado */}
                <div className="relative">
                  <div className="grid grid-cols-2 gap-2.5 mb-2">
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={assignModal.clientFirstName}
                        onChange={e => {
                          setAssignModal(prev => ({ ...prev, clientFirstName: e.target.value }));
                          setShowAssignSuggestions(true);
                        }}
                        onFocus={() => setShowAssignSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAssignSuggestions(false), 200)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                        placeholder="Ej. Javier"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Apellidos <span className="text-neutral-500 lowercase">(opcional)</span></label>
                      <input
                        type="text"
                        value={assignModal.clientLastName}
                        onChange={e => {
                          setAssignModal(prev => ({ ...prev, clientLastName: e.target.value }));
                          setShowAssignSuggestions(true);
                        }}
                        onFocus={() => setShowAssignSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAssignSuggestions(false), 200)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                        placeholder="Ej. Bofill"
                      />
                    </div>
                  </div>

                  {/* Desplegable Autocompletado (sólo si hay coincidencias para no tapar el label) */}
                  {(() => {
                    const q = `${assignModal.clientFirstName} ${assignModal.clientLastName}`.trim().toLowerCase();
                    if (!showAssignSuggestions || !q) return null;
                    const filtered = allClients.filter(c => {
                      const matchName = c.full_name.toLowerCase().includes(q);
                      const matchPhone = c.phone && !c.phone.startsWith("ext_") && !c.phone.startsWith("insta_") && c.phone.includes(q);
                      return matchName || matchPhone;
                    });
                    if (filtered.length === 0) return null;
                    return (
                      <div className="absolute top-[64px] left-0 right-0 z-50 bg-[#161616] border border-white/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-1">
                        <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 text-[9px] font-mono text-neutral-400">
                          <span>Sugerencias ({filtered.length})</span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowAssignSuggestions(false);
                            }}
                            className="text-neutral-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                          >
                            ✕ Cerrar
                          </button>
                        </div>
                        {filtered.map(c => {
                          const parts = c.full_name.trim().split(" ");
                          const fName = parts[0] || "";
                          const lName = parts.slice(1).join(" ");
                          const isExternal = c.phone.startsWith("ext_") || c.phone.startsWith("insta_") || c.phone.startsWith("sin_tel_");
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setAssignModal(prev => ({
                                  ...prev,
                                  clientFirstName: fName,
                                  clientLastName: lName,
                                  clientPhone: isExternal ? "" : c.phone
                                }));
                                setShowAssignSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs group"
                            >
                              <span className="text-white group-hover:text-white/80 transition-colors">{c.full_name}</span>
                              <span className="font-mono text-[11px] text-neutral-400">
                                {isExternal ? "👤 Cliente Externo" : c.phone}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">
                      Teléfono Móvil <span className="text-neutral-500 lowercase">(opcional - cliente externo)</span>
                    </label>
                    <input
                      type="tel"
                      value={assignModal.clientPhone}
                      onChange={e => setAssignModal(prev => ({ ...prev, clientPhone: e.target.value }))}
                      onFocus={() => setShowAssignSuggestions(false)}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                      placeholder="Ej. 600123456 (o vacío si es externo)"
                    />
                  </div>
                </div>

                {assignModal.error && (
                  <p className="text-xs text-red-400 font-mono mt-2">{assignModal.error}</p>
                )}

                <div className="flex items-center gap-3 mt-6 pt-2">
                  <button type="button" onClick={() => setAssignModal(prev => ({ ...prev, isOpen: false }))} disabled={assignModal.loading} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white text-[10px] uppercase font-mono tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={assignModal.loading} className="flex-1 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-[10px] uppercase font-mono tracking-widest transition-colors font-bold disabled:opacity-50 flex justify-center">
                    {assignModal.loading ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin"/> : "Asignar"}
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
