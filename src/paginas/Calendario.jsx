import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioPago from '../FormularioPago.jsx';
import { movDeOcurrencia } from '../FormularioFijo.jsx';
import { Boton, Etiqueta, Hoja, Indicador, Panel, Rejilla } from '../ui.jsx';
import { diasDelMes, dinero0, etiquetaDia, etiquetaMesLarga, hoyISO, suma } from '../utils.js';
import { compromisos, estadoFijos, proximosPagos } from '../finanzas.js';

const TONO_CLASE = { 'Gasto fijo': 'neutro', Tarjeta: 'aviso', Deuda: 'gasto', Ingreso: 'ingreso' };
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Botón para saldar un compromiso desde el calendario o las quincenas. */
export function AccionCompromiso({ c }) {
  const { guardarMov } = useDatos();
  const [pagando, setPagando] = useState(false);
  if (c.pagado) return null;
  if (c.clase === 'Gasto fijo' || c.clase === 'Ingreso') {
    return <Boton tam="sm" variante="secundario" onClick={() => guardarMov(movDeOcurrencia(c.ref), undefined, `${c.nombre}: ${c.clase === 'Ingreso' ? 'recibido' : 'pagado'}`)}>{c.clase === 'Ingreso' ? 'Marcar recibido' : 'Marcar pagado'}</Boton>;
  }
  const clase = c.clase === 'Tarjeta' ? 'tarjeta' : 'deuda';
  return (
    <>
      <Boton tam="sm" variante="secundario" onClick={() => setPagando(true)}>Registrar pago</Boton>
      {pagando && <Hoja titulo={`${clase === 'tarjeta' ? 'Pago a' : 'Abono a'} ${c.nombre}`} onCerrar={() => setPagando(false)}><FormularioPago clase={clase} item={c.ref} onListo={() => setPagando(false)} /></Hoja>}
    </>
  );
}

export function FilaCompromiso({ c, conFecha = true, colorear = false }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {c.pagado ? <CheckCircle2 size={18} className="text-ingreso shrink-0" /> : <Circle size={18} className="text-suave shrink-0" />}
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold truncate ${c.pagado ? 'line-through decoration-suave/60 text-suave' : ''}`}>{c.nombre}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-suave">{conFecha && <span className="first-letter:uppercase">{etiquetaDia(c.fecha)}</span>}<Etiqueta tono={TONO_CLASE[c.clase]}>{c.clase}</Etiqueta>{c.pagado ? <Etiqueta tono='ingreso'>{c.clase === 'Ingreso' ? 'Recibido' : 'Pagado'}</Etiqueta> : c.fecha < hoyISO() ? <Etiqueta tono='gasto'>Vencido</Etiqueta> : <Etiqueta tono='aviso'>Pendiente</Etiqueta>}</span>
      </span>
      <span className="cifra font-bold text-sm shrink-0" style={c.clase === 'Ingreso' ? { color: 'var(--ingreso)' } : colorear ? { color: 'var(--gasto)' } : undefined}>{dinero0(c.monto)}</span>
      <AccionCompromiso c={c} />
    </li>
  );
}

/** Compromisos del mes más los ingresos esperados. */
export function eventosDelMes(datos, mes) {
  const ingresos = estadoFijos(datos, mes, 'Ingreso').map((o) => ({ clave: o.id, fecha: o.fecha, nombre: o.fijo.descripcion, monto: o.fijo.monto, clase: 'Ingreso', pagado: o.pagado, ref: o }));
  return [...compromisos(datos, mes), ...ingresos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

export default function Calendario({ mes }) {
  const { datos } = useDatos();
  const [dia, setDia] = useState(null);
  const eventos = eventosDelMes(datos, mes);
  const pagos = eventos.filter((e) => e.clase !== 'Ingreso');
  const hoy = hoyISO();
  const dias = diasDelMes(mes);
  const primero = (new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1, 1).getDay() + 6) % 7; // lunes = 0
  const celdas = [...Array(primero).fill(null), ...Array.from({ length: dias }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)];
  const delDia = dia ? eventos.filter((e) => e.fecha === dia) : eventos;
  const proximos = proximosPagos(datos, 30);

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Pagos del mes" valor={dinero0(suma(pagos, (e) => e.monto))} nota={`${pagos.length} compromisos`} />
        <Indicador etiqueta="Pagado" valor={dinero0(suma(pagos.filter((e) => e.pagado), (e) => e.monto))} tono="ingreso" nota={`${pagos.filter((e) => e.pagado).length} realizados`} />
        <Indicador etiqueta="Pendiente" valor={dinero0(suma(pagos.filter((e) => !e.pagado), (e) => e.monto))} tono="gasto" nota={`${pagos.filter((e) => !e.pagado).length} por pagar`} />
        <Indicador etiqueta="Vencidos sin pagar" valor={String(pagos.filter((e) => !e.pagado && e.fecha < hoy).length)} tono={pagos.some((e) => !e.pagado && e.fecha < hoy) ? 'gasto' : undefined} nota="Fecha pasada y sin registro de pago" />
      </Rejilla>

      <Rejilla className="lg:grid-cols-[1.5fr_1fr]">
        <Panel titulo={<span className="first-letter:uppercase inline-block">{etiquetaMesLarga(mes)}</span>} subtitulo="Gastos fijos, tarjetas, deudas e ingresos esperados. Toca un día para ver su detalle.">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-suave mb-1">{DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((f, i) => {
              if (!f) return <span key={`v${i}`} />;
              const ev = eventos.filter((e) => e.fecha === f);
              const vencido = ev.some((e) => !e.pagado && e.clase !== 'Ingreso' && f < hoy);
              return (
                <button key={f} type="button" onClick={() => setDia(dia === f ? null : f)} aria-pressed={dia === f} aria-label={`${etiquetaDia(f)}: ${ev.length} eventos`}
                  className={`min-h-[52px] sm:min-h-[76px] rounded-lg border p-1 sm:p-1.5 text-left align-top flex flex-col gap-0.5 transition-colors ${dia === f ? 'border-marca bg-marca-suave/60' : 'border-linea hover:bg-hundido'} ${f === hoy ? 'ring-1 ring-marca' : ''}`}>
                  <span className={`text-[11px] font-semibold ${f === hoy ? 'text-marca' : vencido ? 'text-gasto' : ''}`}>{Number(f.slice(8))}</span>
                  <span className="hidden sm:flex flex-col gap-0.5 w-full">
                    {ev.slice(0, 2).map((e) => (
                      <span key={e.clave} className={`truncate text-[10px] px-1 rounded ${e.pagado ? 'opacity-50 line-through' : ''}`} style={{ background: e.clase === 'Ingreso' ? 'var(--ingreso-suave)' : e.clase === 'Deuda' || e.clase === 'Tarjeta' ? 'var(--marca-suave)' : 'var(--hundido)', color: e.clase === 'Ingreso' ? 'var(--ingreso)' : 'var(--tinta)' }}>{e.nombre}</span>
                    ))}
                    {ev.length > 2 && <span className="text-[10px] text-suave">+{ev.length - 2} más</span>}
                  </span>
                  <span className="sm:hidden flex gap-0.5 flex-wrap">{ev.map((e) => <i key={e.clave} className="h-1.5 w-1.5 rounded-full" style={{ background: e.pagado ? 'var(--linea)' : e.clase === 'Ingreso' ? 'var(--ingreso)' : 'var(--gasto)' }} />)}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4 min-w-0">
          <Panel titulo={dia ? <span className="first-letter:uppercase inline-block">{etiquetaDia(dia)}</span> : 'Todo el mes'} accion={dia && <Boton tam="sm" variante="texto" onClick={() => setDia(null)}>Ver todo</Boton>}>
            {delDia.length === 0 ? <p className="text-sm text-suave py-3">{dia ? 'Nada programado este día.' : 'Agrega gastos fijos, tarjetas o deudas para ver tus vencimientos.'}</p>
              : <ul className="divide-y divide-linea -my-1">{delDia.map((c) => <FilaCompromiso key={c.clave} c={c} conFecha={!dia} />)}</ul>}
          </Panel>
          <Panel titulo="Próximos compromisos" subtitulo="Pendientes en los próximos 30 días">
            {proximos.length === 0 ? <p className="text-sm text-suave py-3">Nada pendiente en los próximos 30 días.</p>
              : <ul className="divide-y divide-linea -my-1">{proximos.slice(0, 8).map((c) => <FilaCompromiso key={c.clave} c={c} />)}</ul>}
          </Panel>
        </div>
      </Rejilla>
    </div>
  );
}
