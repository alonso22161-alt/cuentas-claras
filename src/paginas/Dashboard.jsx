import { useMemo } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, Lightbulb, PiggyBank, Repeat, Scale, Target } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatos } from '../store.jsx';
import { generarConsejos } from '../consejos.js';
import { estadoFijos, estadoMeta, proximosPagos } from '../finanzas.js';
import { Barra, Boton, Indicador, Panel, Rejilla, Vacio } from '../ui.jsx';
import { ListaMovs } from './Movimientos.jsx';
import { colorDe, diasDelMes, dinero, dinero0, etiquetaDia, etiquetaMes, hoyISO, mesActual, mesDe, moverMes, pct, resumenMes, suma } from '../utils.js';

export const ejes = { tick: { fill: 'var(--suave)', fontSize: 11 }, axisLine: false, tickLine: false };
export const corto = (n) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

export function Globo({ active, payload, label, titulo }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-linea rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{titulo ? titulo(label, payload) : label}</p>
      {payload.filter((p) => p.value != null).map((p) => <p key={p.dataKey || p.name} className="flex justify-between gap-4"><span style={{ color: p.color || p.stroke }}>{p.name}</span><span className="cifra font-bold">{dinero(p.value)}</span></p>)}
    </div>
  );
}

/** Variación contra el mes anterior. En el mes en curso compara contra los mismos días del mes anterior. */
function comparar(datos, mes) {
  const anterior = moverMes(mes, -1);
  const hasta = mes === mesActual() ? Number(hoyISO().slice(8)) : 31;
  const previo = resumenMes({ ...datos, movimientos: datos.movimientos.filter((m) => mesDe(m.fecha) !== anterior || Number(m.fecha.slice(8)) <= hasta) }, anterior);
  return { previo, parcial: hasta < 31 };
}
const variacion = (a, b) => (b > 0 ? a / b - 1 : null);

export default function Dashboard({ mes, irA, abrirMov }) {
  const { datos } = useDatos();
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const { previo, parcial } = useMemo(() => comparar(datos, mes), [datos, mes]);
  const flujo = useMemo(() => {
    const dias = diasDelMes(mes);
    const filas = Array.from({ length: dias }, (_, i) => ({ dia: i + 1, Ingresos: 0, Gastos: 0 }));
    r.movs.forEach((m) => { const f = filas[Number(m.fecha.slice(8)) - 1]; if (f && m.tipo === 'Ingreso') f.Ingresos += m.monto; else if (f && m.tipo === 'Gasto') f.Gastos += m.monto; });
    return filas;
  }, [r, mes]);
  const fijos = estadoFijos(datos, mes);
  const proximos = proximosPagos(datos, 10);
  const alertas = useMemo(() => generarConsejos(datos, mes).slice(0, 4), [datos, mes]);
  const recientes = [...r.movs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 6);
  const ahorro = r.ingresos - r.consumo;

  const nota = (v, invertir) => {
    if (v == null) return { texto: 'Sin datos del mes anterior' };
    const sube = v >= 0;
    return { texto: `${sube ? '▲' : '▼'} ${pct(Math.abs(v))} vs ${parcial ? 'mismos días del ' : ''}mes anterior`, tono: (invertir ? !sube : sube) ? 'ingreso' : 'gasto' };
  };
  const nIng = nota(variacion(r.ingresos, previo.ingresos));
  const nGas = nota(variacion(r.gastos, previo.gastos), true);

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Ingresos del mes" valor={dinero0(r.ingresos)} tono="ingreso" Icono={ArrowUpRight} nota={nIng.texto} notaTono={nIng.tono} />
        <Indicador etiqueta="Gastos del mes" valor={dinero0(r.gastos)} tono="gasto" Icono={ArrowDownRight} nota={nGas.texto} notaTono={nGas.tono} />
        <Indicador etiqueta="Balance disponible" valor={dinero0(r.balance)} tono={r.balance < 0 ? 'gasto' : undefined} Icono={Scale} nota="Ingresos menos gastos del mes" />
        <Indicador etiqueta="Ahorro mensual" valor={dinero0(ahorro)} Icono={PiggyBank} tono={ahorro < 0 ? 'gasto' : undefined}
          nota={r.ingresos > 0 ? `Tasa de ahorro: ${pct(r.tasaAhorro)}${previo.ingresos > 0 ? ` (antes ${pct(previo.tasaAhorro)})` : ''}` : 'Registra tus ingresos para calcularlo'} />
      </Rejilla>

      <Rejilla className="lg:grid-cols-[1.5fr_1fr]">
        <Panel titulo="Flujo de dinero" subtitulo={`Ingresos y gastos por día · ${etiquetaMes(mes)}`}
          accion={<div className="hidden sm:flex gap-4 text-[11px] text-suave"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ingreso" />Ingresos</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gasto" />Gastos</span></div>}>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={flujo} margin={{ left: -14, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="dia" {...ejes} interval={4} />
                <YAxis {...ejes} tickFormatter={corto} width={44} />
                <Tooltip content={<Globo titulo={(l) => `Día ${l}`} />} />
                <Line dataKey="Ingresos" stroke="var(--ingreso)" strokeWidth={2.3} dot={false} isAnimationActive={false} />
                <Line dataKey="Gastos" stroke="var(--gasto)" strokeWidth={2.3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Gastos por categoría" subtitulo="Distribución del mes seleccionado">
          {r.porCategoria.length === 0 ? <Vacio titulo="Aún no hay gastos registrados" /> : (
            <ul className="grid gap-3.5">
              {r.porCategoria.slice(0, 6).map((c) => (
                <li key={c.nombre} className="grid grid-cols-[1fr_auto] gap-1.5 text-xs">
                  <span className="text-suave truncate">{c.nombre}</span><span className="cifra font-semibold">{dinero0(c.total)} <span className="text-suave font-normal">· {pct(c.total / r.gastos)}</span></span>
                  <div className="col-span-2"><Barra valor={c.total} tope={r.porCategoria[0].total} color={colorDe(c.nombre, datos.categorias)} alto="h-[7px]" /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Rejilla>

      <Rejilla className="md:grid-cols-2 xl:grid-cols-3">
        <Panel titulo="Próximos pagos" subtitulo="Pendientes en los próximos 10 días" accion={<Boton variante="secundario" tam="sm" onClick={() => irA('calendario')}>Calendario</Boton>}>
          {proximos.length === 0 ? <p className="text-sm text-suave py-4 text-center">No tienes pagos pendientes en los próximos días.</p> : (
            <ul className="divide-y divide-linea -my-1">
              {proximos.slice(0, 5).map((c) => (
                <li key={c.clave} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="h-9 w-9 rounded-[10px] grid place-items-center bg-hundido shrink-0"><CalendarClock size={16} className="text-suave" /></span>
                  <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.nombre}</span><span className="block text-xs text-suave first-letter:uppercase">{etiquetaDia(c.fecha)} · {c.clase}</span></span>
                  <span className="cifra font-bold">{dinero0(c.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Gastos fijos del mes" subtitulo={`${fijos.length} pagos programados`} accion={<Boton variante="secundario" tam="sm" onClick={() => irA('fijos')}>Ver</Boton>}>
          {fijos.length === 0 ? <p className="text-sm text-suave py-4 text-center">Registra tu renta, servicios y suscripciones para verlos aquí.</p> : (() => {
            const total = suma(fijos, (o) => o.fijo.monto), pagado = suma(fijos.filter((o) => o.pagado), (o) => o.fijo.monto);
            return (
              <>
                <div className="flex items-end justify-between mb-2"><p className="cifra text-2xl font-bold">{dinero0(total)}</p><p className="text-xs text-suave">{pct(total ? pagado / total : 0)} pagado</p></div>
                <Barra valor={pagado} tope={total} color="var(--ingreso)" />
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="rounded-[10px] bg-ingreso-suave p-3"><p className="text-suave">Pagado</p><p className="cifra font-bold text-sm text-ingreso">{dinero0(pagado)}</p></div>
                  <div className="rounded-[10px] bg-marca-suave p-3"><p className="text-suave">Pendiente</p><p className="cifra font-bold text-sm text-gasto">{dinero0(total - pagado)}</p></div>
                </div>
              </>
            );
          })()}
        </Panel>

        <Panel titulo="Metas de ahorro" subtitulo="Avance de tus objetivos" accion={<Boton variante="secundario" tam="sm" onClick={() => irA('metas')}>Ver</Boton>} className="md:col-span-2 xl:col-span-1">
          {datos.metas.length === 0 ? <p className="text-sm text-suave py-4 text-center">Crea una meta para darle propósito a tu dinero.</p> : (
            <ul className="space-y-4">
              {datos.metas.slice(0, 3).map((m) => {
                const e = estadoMeta(datos, m);
                return (
                  <li key={m.id}>
                    <div className="flex justify-between gap-2 text-xs mb-1.5"><span className="font-semibold truncate flex items-center gap-1.5"><Target size={13} className="text-marca shrink-0" />{m.nombre}</span><span className="cifra text-suave shrink-0">{dinero0(e.ahorrado)} / {dinero0(e.meta)}</span></div>
                    <Barra valor={e.ahorrado} tope={e.meta} color="var(--ingreso)" />
                    <p className="text-[11px] text-suave mt-1">{pct(e.avance)} completado</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </Rejilla>

      <Rejilla className="lg:grid-cols-[1.3fr_0.7fr]">
        <Panel titulo="Movimientos recientes" subtitulo="Últimos registros de tu actividad" accion={<Boton variante="secundario" tam="sm" onClick={() => irA('movimientos')}>Ver todos</Boton>}>
          <ListaMovs movs={recientes} />
        </Panel>
        <div className="space-y-4 min-w-0">
          <Panel titulo="Accesos rápidos">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                [ArrowUpRight, 'Agregar ingreso', 'Registra dinero recibido', () => abrirMov('Ingreso'), 'var(--ingreso)'],
                [ArrowDownRight, 'Agregar gasto', 'Registra una compra o pago', () => abrirMov('Gasto'), 'var(--gasto)'],
                [Repeat, 'Gastos fijos', 'Administra compromisos', () => irA('fijos')],
                [Target, 'Mis metas', 'Visualiza tus ahorros', () => irA('metas')],
              ].map(([Icono, t, s, accion, color]) => (
                <button key={t} type="button" onClick={accion} className="border border-linea bg-panel rounded-[11px] p-3 text-left hover:border-marca/40 hover:bg-marca-suave/40 transition-colors">
                  <Icono size={17} style={{ color: color || 'var(--tinta)' }} />
                  <b className="block text-xs mt-2">{t}</b><small className="text-[10px] text-suave">{s}</small>
                </button>
              ))}
            </div>
          </Panel>
          <Panel titulo="Alertas financieras" accion={<Boton variante="secundario" tam="sm" onClick={() => irA('analisis')}>Análisis</Boton>}>
            {alertas.length === 0 ? <p className="text-sm text-suave">Sin alertas por ahora. Sigue registrando para recibir recomendaciones.</p> : (
              <ul className="space-y-3">
                {alertas.map((a, i) => {
                  const Icono = a.nivel === 'alerta' ? AlertTriangle : a.nivel === 'bien' ? CheckCircle2 : Lightbulb;
                  const color = a.nivel === 'alerta' ? 'var(--gasto)' : a.nivel === 'bien' ? 'var(--ingreso)' : 'var(--aviso)';
                  return <li key={i} className="flex gap-2.5 text-xs"><Icono size={15} className="shrink-0 mt-0.5" style={{ color }} /><span className="font-semibold leading-snug">{a.titulo}</span></li>;
                })}
              </ul>
            )}
          </Panel>
        </div>
      </Rejilla>
    </div>
  );
}
