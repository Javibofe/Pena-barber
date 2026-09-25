export default function Footer() {
  return (
    <footer className="w-full bg-surface-base text-neutral-400 py-16 px-6 border-t border-border-subtle">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full border border-white flex items-center justify-center text-white text-[10px] font-serif font-bold">P</div>
            <span className="font-serif text-white tracking-[0.2em] uppercase font-bold text-sm">Peña Barber</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest font-mono text-white mb-3">Ubicación</h4>
          <p className="text-xs text-neutral-400 leading-relaxed font-light">
            Av. de las Tinajas, 59<br />
            41520 El Viso del Alcor, Sevilla<br />
            <a
              href="https://wa.me/34604407525"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-mono mt-2 block hover:text-neutral-300 transition-colors"
            >
              +34 604 40 75 25
            </a>
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest font-mono text-white mb-3">Horario</h4>
          <ul className="text-xs text-neutral-400 space-y-1 font-light">
            <li className="flex justify-between"><span>Martes a Viernes:</span> <span className="text-white font-mono">10:00 – 20:30</span></li>
            <li className="flex justify-between"><span>Sábados:</span> <span className="text-white font-mono">09:30 – 19:00</span></li>
            <li className="flex justify-between text-neutral-500"><span>Domingos y Lunes:</span> <span>Cerrado</span></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest font-mono text-white mb-3">Contacto</h4>
          <div className="flex flex-col space-y-2 text-xs">
            <a
              className="hover:text-white transition-colors flex items-center gap-1.5"
              href="https://instagram.com/__germanpj__"
              rel="noopener noreferrer"
              target="_blank"
            >
              Instagram: @__germanpj__
            </a>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block">Sillón privado bajo cita previa</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-500">
        <p>© 2026 Peña Barber — Germán Peña. Todos los derechos reservados.</p>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <a className="hover:text-white transition-colors" href="/admin">¿Eres peluquero?</a>
          <a className="hover:text-white transition-colors" href="#">Aviso Legal</a>
          <a className="hover:text-white transition-colors" href="#">Privacidad</a>
          <a className="hover:text-white transition-colors" href="#">Términos de Cita</a>
        </div>
      </div>
    </footer>
  );
}
