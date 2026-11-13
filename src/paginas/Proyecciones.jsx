import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatos } from '../store.jsx';
import { Boton, Campo, Etiqueta, Indicador, Panel, Rejilla, claseEntrada, claseTabla, claseTd, claseTh } from '../ui.jsx';
import { Globo, corto, ejes } from './Dashboard.jsx';
import { dinero0, etiquetaMes, suma } from '../utils.js';
import { basesProyeccion, equivalenteMensual, proyectar } from '../finanzas.js';

function Deslizador({ etiqueta, valor, onCambio, min, max, paso, formato }) {
  return (
    <Campo etiqueta={`${etiqueta}: ${formato(valor)}`}>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambio(Number(e.target.value))} className="w-full accent-[var(--marca)]" />
    </Campo>
  );
}

export default function Proyecciones() {
  const { datos } = useDatos();
  const [sim, setSim] = useState({ ingresos: 0, gastos: 0, extra: 0 });
  const base = useMemo(() => basesProyeccion(datos), [datos]);
  const filas = useMemo(() => proyectar(datos, 12, sim), [datos, sim]);
  const sinCambios = useMemo(() => proyectar(datos, 12), [datos]);
  const simulando = sim.ingresos || sim.gastos || sim.extra;
  const deficit = filas.filter((f) => f.neto < 0);
  const fijosIng = suma(datos.recurrentes.filter((f) => f.activo && f.tipo === 'Ingreso'), equivalenteMensual);
  const fijosGas = suma(datos.recurrentes.filter((f) => f.activo && f.tipo === 'Gasto'), equivalenteMensual);
  const grafica = filas.map((f) => ({ mes: etiquetaMes(f.ym), 'Ahorro del mes': Math.round(f.neto), Acumulado: Math.round(f.acumulado) }));
  const sinDatos = !datos.recurrentes.length && !base.meses;

  return (
    <div className="space-y-4">
      {sinDatos && <div className="rounded-[10px] border border-linea bg-aviso-suave p-4 text-sm" style={{ color: 'var(--aviso)' }}>Para proyectar necesito tus ingresos esperados y gastos fijos, o al menos un mes completo de movimientos.</div>}
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        {[3, 6, 12].map((n) => {
          const f = filas[n - 1];
          return <Indicador key={n} etiqueta={`Ahorro acumulado a ${n} meses`} valor={dinero0(f.acumulado)} tono={f.acumulado < 0 ? 'gasto' : 'ingreso'} nota={simulando ? `Sin cambios: ${dinero0(sinCambios[n - 1].acumulado)}` : `Hasta ${etiquetaMes(f.ym)}`} />;
        })}
        <Indicador etiqueta="Meses con déficit" valor={`${deficit.length} de 12`} tono={deficit.length ? 'gasto' : undefined} nota={deficit.length ? `Primero en ${etiquetaMes(deficit[0].ym)}` : 'Ningún mes en negativo'} />
      </Rejilla>

      <Rejilla className="lg:grid-cols-[1.5fr_1fr]">
        <Panel titulo="Proyección a 12 meses" subtitulo="Ahorro de cada mes (barras) y acumulado (línea)">
          <div className="h-[260px]">
            <ResponsiveContainer>
              <ComposedChart data={grafica} margin={{ left: -6, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="mes" {...ejes} interval={1} />
                <YAxis {...ejes} tickFormatter={corto} width={48} />
                <Tooltip cursor={{ fill: 'var(--hundido)' }} content={<Globo />} />
                <ReferenceLine y={0} stroke="var(--suave)" />
                <Bar dataKey="Ahorro del mes" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {grafica.map((g) => <Cell key={g.mes} fill={g['Ahorro del mes'] < 0 ? 'var(--gasto)' : 'var(--ingreso)'} />)}
                </Bar>
                <Line dataKey="Acumulado" stroke="var(--tinta)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Simulador" subtitulo="Prueba qué pasa si cambian tus ingresos o gastos" accion={simulando ? <Boton tam="sm" variante="texto" onClick={() => setSim({ ingresos: 0, gastos: 0, extra: 0 })}>Restablecer</Boton> : null}>
          <div className="space-y-4">
            <Deslizador etiqueta="Cambio en ingresos" valor={sim.ingresos} onCambio={(v) => setSim({ ...sim, ingresos: v })} min={-50} max={50} paso={5} formato={(v) => `${v > 0 ? '+' : ''}${v}%`} />
            <Deslizador etiqueta="Cambio en gastos (fijos y variables)" valor={sim.gastos} onCambio={(v) => setSim({ ...sim, gastos: v })} min={-50} max={50} paso={5} formato={(v) => `${v > 0 ? '+' : ''}${v}%`} />
            <Campo etiqueta="Ajuste mensual en pesos" ayuda="Positivo: un ingreso extra. Negativo: un gasto nuevo (por ejemplo, una mensualidad).">
              <input inputMode="numeric" value={sim.extra || ''} onChange={(e) => setSim({ ...sim, extra: Number(e.target.value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '')) || 0 })} placeholder="0" className={claseEntrada} />
            </Campo>
          </div>
          <div className="mt-5 border-t border-linea pt-4 text-xs space-y-1.5">
            <p className="font-semibold text-sm mb-2">Con qué se calcula (por mes)</p>
            <p className="flex justify-between"><span className="text-suave">Ingresos esperados</span><b className="cifra">{dinero0(fijosIng)}</b></p>
            <p className="flex justify-between"><span className="text-suave">Ingresos extra promedio</span><b className="cifra">{dinero0(base.ingresosExtra)}</b></p>
            <p className="flex justify-between"><span className="text-suave">Gastos fijos</span><b className="cifra">{dinero0(fijosGas)}</b></p>
            <p className="flex justify-between"><span className="text-suave">Gastos variables promedio</span><b className="cifra">{dinero0(base.variables)}</b></p>
            <p className="flex justify-between"><span className="text-suave">Pagos de deudas</span><b className="cifra">{dinero0(suma(datos.deudas, (d) => Number(d.pagoMensual) || 0))}</b></p>
            <p className="text-suave pt-1">Promedios de los últimos {base.meses || 0} meses completos. Si una deuda también la tienes como gasto fijo, quítala de uno de los dos para no contarla doble.</p>
          </div>
        </Panel>
      </Rejilla>

      <Panel titulo="Detalle mes a mes">
        <div className="overflow-x-auto">
          <table className={claseTabla}>
            <thead><tr>{['Mes', 'Ingresos', 'Gastos fijos', 'Variables', 'Deudas', 'Ahorro del mes', 'Acumulado', ''].map((h) => <th key={h} className={claseTh}>{h}</th>)}</tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.ym}>
                  <td className={`${claseTd} font-semibold`}>{etiquetaMes(f.ym)}</td>
                  <td className={`${claseTd} cifra text-ingreso`}>{dinero0(f.ingresos)}</td>
                  <td className={`${claseTd} cifra`}>{dinero0(f.fijos)}</td>
                  <td className={`${claseTd} cifra`}>{dinero0(f.variables)}</td>
                  <td className={`${claseTd} cifra`}>{dinero0(f.deudas)}</td>
                  <td className={`${claseTd} cifra font-bold`} style={{ color: f.neto < 0 ? 'var(--gasto)' : 'var(--ingreso)' }}>{dinero0(f.neto)}</td>
                  <td className={`${claseTd} cifra font-bold`}>{dinero0(f.acumulado)}</td>
                  <td className={claseTd}>{f.neto < 0 && <Etiqueta tono="gasto">Déficit</Etiqueta>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-suave mt-3">Es una estimación orientativa: supone que tus ingresos y gastos siguen el patrón actual. Los gastos anuales aparecen en el mes que les toca y los abonos de deudas terminan cuando se liquidan.</p>
      </Panel>
    </div>
  );
}
