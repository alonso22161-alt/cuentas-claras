import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { etiquetaMes, mesActual, moverMes } from './utils.js';

export function Panel({ titulo, accion, children, className = '' }) {
  return (
    <section className={`bg-panel border border-linea rounded-2xl p-4 sm:p-5 ${className}`}>
      {(titulo || accion) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {titulo && <h2 className="font-semibold text-[15px]">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Boton({ variante = 'primario', className = '', ...p }) {
  const estilos = {
    primario: 'bg-marca text-sobremarca hover:opacity-90',
    suave: 'bg-hundido text-tinta hover:opacity-80',
    peligro: 'text-gasto border border-linea hover:bg-hundido',
  }[variante];
  return <button type="button" {...p} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 font-semibold text-sm disabled:opacity-50 transition-opacity ${estilos} ${className}`} />;
}

export function Campo({ etiqueta, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm text-suave mb-1">{etiqueta}</span>
      {children}
    </label>
  );
}
export const claseEntrada = 'w-full h-11 rounded-xl border border-linea bg-panel px-3 text-[15px] placeholder:text-suave/70';

export function SelectorMes({ mes, onCambio }) {
  const tope = mes >= mesActual();
  return (
    <div className="inline-flex items-center bg-panel border border-linea rounded-xl">
      <button type="button" aria-label="Mes anterior" className="h-10 w-10 grid place-items-center text-suave" onClick={() => onCambio(moverMes(mes, -1))}><ChevronLeft size={18} /></button>
      <span className="min-w-[5.5rem] text-center font-semibold text-sm">{etiquetaMes(mes)}</span>
      <button type="button" aria-label="Mes siguiente" disabled={tope} className="h-10 w-10 grid place-items-center text-suave disabled:opacity-30" onClick={() => onCambio(moverMes(mes, 1))}><ChevronRight size={18} /></button>
    </div>
  );
}

export function Barra({ valor, tope, color }) {
  const p = tope > 0 ? Math.min(1, valor / tope) : 0;
  const tono = color || (valor > tope ? 'var(--gasto)' : p >= 0.8 ? 'var(--aviso)' : 'var(--marca)');
  return (
    <div className="h-2 rounded-full bg-hundido overflow-hidden" role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: tono }} />
    </div>
  );
}

export function Vacio({ titulo, children }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-semibold">{titulo}</p>
      <p className="text-suave text-sm mt-1 max-w-sm mx-auto">{children}</p>
    </div>
  );
}

export function Encabezado({ titulo, children }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 className="cifra text-2xl font-bold">{titulo}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

export function Hoja({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-fondo rounded-t-3xl sm:rounded-3xl p-5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="cifra text-xl font-bold">{titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="h-10 w-10 grid place-items-center rounded-full bg-hundido"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chips({ opciones, valor, onCambio, sugerida }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activa = o === valor;
        return (
          <button key={o} type="button" aria-pressed={activa} onClick={() => onCambio(o)}
            className={`px-3 h-9 rounded-full text-sm border transition-colors ${activa ? 'bg-marca text-sobremarca border-marca font-semibold' : 'bg-panel border-linea text-tinta'} ${!activa && o === sugerida ? 'border-marca border-dashed' : ''}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
