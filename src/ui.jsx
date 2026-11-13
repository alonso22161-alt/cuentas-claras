import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { etiquetaMes, mesActual, moverMes } from './utils.js';

/** Tarjeta base: borde sutil, esquinas redondeadas y sombra ligera. */
export function Panel({ titulo, subtitulo, accion, children, className = '' }) {
  return (
    <section className={`bg-panel border border-linea rounded-[14px] shadow-tarjeta p-4 sm:p-[19px] min-w-0 ${className}`}>
      {(titulo || accion) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {titulo && <h2 className="text-sm font-bold">{titulo}</h2>}
            {subtitulo && <p className="text-[11px] text-suave mt-0.5">{subtitulo}</p>}
          </div>
          {accion && <div className="shrink-0 flex items-center gap-2">{accion}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const TONOS = {
  ingreso: { color: 'var(--ingreso)', fondo: 'var(--ingreso-suave)' },
  gasto: { color: 'var(--gasto)', fondo: 'var(--marca-suave)' },
  aviso: { color: 'var(--aviso)', fondo: 'var(--aviso-suave)' },
  neutro: { color: 'var(--suave)', fondo: 'var(--hundido)' },
};

/** Indicador del dashboard: etiqueta, ícono, cifra grande y nota al pie. */
export function Indicador({ etiqueta, valor, tono, Icono, nota, notaTono }) {
  const t = TONOS[tono] || TONOS.neutro;
  return (
    <div className="bg-panel border border-linea rounded-[14px] shadow-tarjeta p-4 sm:p-[19px] min-w-0">
      <div className="flex justify-between items-start gap-2 text-xs text-suave">
        <span>{etiqueta}</span>
        {Icono && <span className="w-[31px] h-[31px] rounded-[10px] grid place-items-center shrink-0" style={{ background: t.fondo, color: tono ? t.color : 'var(--tinta)' }}><Icono size={15} /></span>}
      </div>
      <p className="cifra text-xl sm:text-[25px] font-bold tracking-tight mt-2 mb-1 truncate" style={tono && tono !== 'neutro' ? { color: t.color } : undefined}>{valor}</p>
      {nota && <p className="text-[11px]" style={{ color: notaTono ? TONOS[notaTono].color : 'var(--suave)' }}>{nota}</p>}
    </div>
  );
}

export function Boton({ variante = 'primario', tam = 'md', className = '', ...p }) {
  const estilos = {
    primario: 'bg-marca text-sobremarca hover:bg-marca-fuerte shadow-[0_4px_10px_#c94f5b22]',
    secundario: 'bg-panel border border-linea text-tinta hover:bg-hundido',
    suave: 'bg-hundido text-tinta hover:opacity-80',
    peligro: 'bg-panel border border-linea text-gasto hover:bg-marca-suave',
    texto: 'text-marca hover:underline !px-1',
  }[variante];
  const tamano = tam === 'sm' ? 'h-8 px-3 text-xs rounded-lg' : 'h-10 px-4 text-sm rounded-[9px]';
  return <button type="button" {...p} className={`inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap disabled:opacity-50 transition-colors ${tamano} ${estilos} ${className}`} />;
}

/** Botón que pide confirmación en el mismo lugar antes de ejecutar. */
export function BotonConfirmar({ children, pregunta = '¿Seguro?', onConfirmar, tam = 'sm', variante = 'peligro', className = '' }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) return <Boton tam={tam} variante={variante} className={className} onClick={() => setAbierto(true)}>{children}</Boton>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="text-suave">{pregunta}</span>
      <Boton tam="sm" variante="peligro" onClick={() => { setAbierto(false); onConfirmar(); }}>Sí</Boton>
      <Boton tam="sm" variante="suave" onClick={() => setAbierto(false)}>No</Boton>
    </span>
  );
}

export function Campo({ etiqueta, ayuda, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-[11px] font-semibold text-suave mb-1.5">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-[11px] text-suave mt-1">{ayuda}</span>}
    </label>
  );
}
export const claseEntrada = 'w-full h-10 rounded-lg border border-linea bg-panel px-3 text-sm placeholder:text-suave/70 disabled:opacity-60';

/** Limpia lo que se escribe en un campo de importe: solo dígitos y un punto decimal. */
export const soloImporte = (v) => {
  const limpio = String(v).replace(',', '.').replace(/[^0-9.]/g, '');
  const [entero, ...resto] = limpio.split('.');
  return resto.length ? `${entero}.${resto.join('').slice(0, 2)}` : entero;
};

export function SelectorMes({ mes, onCambio, futuro = false }) {
  const tope = !futuro && mes >= mesActual();
  return (
    <div className="inline-flex items-center bg-panel border border-linea rounded-[9px] h-10">
      <button type="button" aria-label="Mes anterior" className="h-10 w-9 grid place-items-center text-suave hover:text-tinta" onClick={() => onCambio(moverMes(mes, -1))}><ChevronLeft size={17} /></button>
      <button type="button" title="Ir al mes actual" onClick={() => onCambio(mesActual())} className="min-w-[5.5rem] text-center font-semibold text-sm">{etiquetaMes(mes)}</button>
      <button type="button" aria-label="Mes siguiente" disabled={tope} className="h-10 w-9 grid place-items-center text-suave hover:text-tinta disabled:opacity-30" onClick={() => onCambio(moverMes(mes, 1))}><ChevronRight size={17} /></button>
    </div>
  );
}

export function Barra({ valor, tope, color, alto = 'h-2' }) {
  const p = tope > 0 ? Math.min(1, Math.max(0, valor / tope)) : 0;
  const tono = color || (valor > tope ? 'var(--gasto)' : p >= 0.8 ? 'var(--aviso)' : 'var(--ingreso)');
  return (
    <div className={`${alto} rounded-full bg-hundido overflow-hidden`} role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: tono }} />
    </div>
  );
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="text-center py-8 px-4">
      <p className="font-semibold">{titulo}</p>
      {children && <p className="text-suave text-sm mt-1 max-w-sm mx-auto">{children}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Etiqueta({ tono = 'neutro', children }) {
  const t = TONOS[tono] || TONOS.neutro;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: t.fondo, color: t.color }}>{children}</span>;
}

/** Ventana emergente: hoja inferior en celular, centrada en computadora. */
export function Hoja({ titulo, onCerrar, children, ancho = 'sm:max-w-[480px]' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-[#11182766]" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} max-h-[92dvh] overflow-y-auto bg-panel rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-[0_25px_70px_#0003]`} style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="h-9 w-9 grid place-items-center rounded-full bg-hundido text-suave hover:text-tinta"><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chips({ opciones, valor, onCambio, sugerida }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => {
        const activa = o === valor;
        return (
          <button key={o} type="button" aria-pressed={activa} onClick={() => onCambio(o)}
            className={`px-3 h-8 rounded-full text-xs border transition-colors ${activa ? 'bg-marca text-sobremarca border-marca font-semibold' : 'bg-panel border-linea text-tinta hover:border-marca/50'} ${!activa && o === sugerida ? 'border-marca border-dashed' : ''}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Control segmentado (por ejemplo Mensual / Anual). */
export function Alternador({ opciones, valor, onCambio, etiqueta }) {
  return (
    <div className="inline-grid grid-flow-col gap-1 p-1 bg-hundido rounded-[10px]" role="group" aria-label={etiqueta}>
      {opciones.map(([v, texto]) => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onCambio(v)}
          className={`h-8 px-3 rounded-lg text-xs font-semibold ${valor === v ? 'bg-panel shadow-sm text-tinta' : 'text-suave'}`}>{texto}</button>
      ))}
    </div>
  );
}

/** Estilos de tabla como en la referencia. */
export const claseTabla = 'w-full border-collapse whitespace-nowrap text-xs';
export const claseTh = 'text-left text-[10px] uppercase tracking-[0.7px] text-suave font-semibold px-2 py-2.5 border-b border-linea';
export const claseTd = 'px-2 py-3 border-b border-linea/70';

export function Rejilla({ children, className = '' }) {
  return <div className={`grid gap-3 sm:gap-4 ${className}`}>{children}</div>;
}
