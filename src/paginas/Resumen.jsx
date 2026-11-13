import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatos } from '../store.jsx';
import { Barra, Encabezado, Panel, SelectorMes, Vacio } from '../ui.jsx';
import { MESES, colorDe, diasDelMes, dinero, dinero0, etiquetaMes, hoyISO, mesActual, moverMes, pct, resumenMes } from '../utils.js';

const ejes = { tick: { fill: 'var(--suave)', fontSize: 12 }, axisLine: false, tickLine: false };
const corto = (n) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function Globo({ active, payload, label, titulo }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-linea rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold mb-1">{titulo ? titulo(label, payload) : label}</p>
      {payload.map((p) => <p key={p.dataKey || p.name} className="flex justify-between gap-4"><span className="text-suave">{p.name}</span><span className="cifra font-bold">{dinero(p.value)}</span></p>)}
    </div>
  );
}

function Dato({ etiqueta, valor, color, nota }) {
  return (
    <div className="bg-panel border border-linea rounded-2xl p-4">
      <p className="text-sm text-suave">{etiqueta}</p>
      <p className="cifra text-2xl font-bold mt-0.5" style={color ? { color } : undefined}>{valor}</p>
      {nota && <p className="text-xs text-suave mt-1">{nota}</p>}
    </div>
  );
}

export default function Resumen() {
  const { datos } = useDatos();
  const [mes, setMes] = useState(mesActual());
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const anterior = useMemo(() => resumenMes(datos, moverMes(mes, -1)), [datos, mes]);

  const historial = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const ym = moverMes(mes, i - 5);
    const x = resumenMes(datos, ym);
    return { mes: MESES[+ym.slice(5) - 1], Ingresos: x.ingresos, Gastos: x.gastos };
  }), [datos, mes]);

  const acumulado = useMemo(() => {
    const dias = diasDelMes(mes);
    const hasta = mes === mesActual() ? Number(hoyISO().slice(8)) : dias;
    const porDia = (res) => { const o = {}; res.movs.filter((m) => m.tipo === 'Gasto').forEach((m) => { const d = +m.fecha.slice(8); o[d] = (o[d] || 0) + m.monto; }); return o; };
    const a = porDia(r), b = porDia(anterior);
    let sa = 0, sb = 0;
    return Array.from({ length: dias }, (_, i) => {
      const d = i + 1; sa += a[d] || 0; sb += b[d] || 0;
      return { dia: d, 'Este mes': d <= hasta ? sa : null, 'Mes anterior': anterior.movs.length ? sb : null };
    });
  }, [r, anterior, mes]);

  const variacion = anterior.gastos > 0 && mes !== mesActual() ? r.gastos / anterior.gastos - 1 : null;
  const grupos = ['Necesidad', 'Gusto', 'Ahorro'].map((g, i) => ({
    nombre: ['Necesidades', 'Gustos', 'Ahorro'][i], ideal: [0.5, 0.3, 0.2][i],
    total: g === 'Ahorro' ? Math.max(0, r.ingresos - r.consumo) : r.porGrupo.find((x) => x.nombre === g)?.total || 0,
  }));
  const mayores = r.movs.filter((m) => m.tipo === 'Gasto').sort((a, b) => b.monto - a.monto).slice(0, 5);

  return (
    <>
      <Encabezado titulo="Resumen"><SelectorMes mes={mes} onCambio={setMes} /></Encabezado>

      {r.movs.length === 0 ? (
        <Panel><Vacio titulo={`Sin datos en ${etiquetaMes(mes)}`}>Registra gastos e ingresos y aquí verás en qué se va tu dinero.</Vacio></Panel>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Dato etiqueta="Ingresos" valor={dinero0(r.ingresos)} color="var(--ingreso)" />
            <Dato etiqueta="Gastos" valor={dinero0(r.gastos)} color="var(--gasto)" nota={variacion != null ? `${variacion >= 0 ? '+' : ''}${pct(variacion)} contra el mes anterior` : r.apartado > 0 ? `Incluye ${dinero0(r.apartado)} de ahorro` : null} />
            <Dato etiqueta="Te queda" valor={dinero0(r.balance)} color={r.balance < 0 ? 'var(--gasto)' : undefined} />
            <Dato etiqueta="Ahorro del mes" valor={r.ingresos > 0 ? pct(r.tasaAhorro) : 'Sin ingresos'} nota={r.ingresos > 0 ? `${dinero0(r.ingresos - r.consumo)} no gastados` : 'Registra tu ingreso para calcularlo'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel titulo="En qué se fue">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-44 h-44 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={r.porCategoria} dataKey="total" nameKey="nombre" innerRadius="62%" outerRadius="100%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
                        {r.porCategoria.map((c) => <Cell key={c.nombre} fill={colorDe(c.nombre, datos.categorias)} />)}
                      </Pie>
                      <Tooltip content={<Globo titulo={(_, p) => p[0].name} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full min-w-0 space-y-1.5 text-sm">
                  {r.porCategoria.slice(0, 7).map((c) => (
                    <li key={c.nombre} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorDe(c.nombre, datos.categorias) }} />
                      <span className="truncate flex-1">{c.nombre}</span>
                      <span className="text-suave">{pct(c.total / r.gastos)}</span>
                      <span className="cifra font-bold w-20 text-right">{dinero0(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel titulo="Gasto acumulado día a día">
              <div className="h-52">
                <ResponsiveContainer>
                  <AreaChart data={acumulado} margin={{ left: -18, right: 6, top: 6 }}>
                    <CartesianGrid stroke="var(--linea)" vertical={false} />
                    <XAxis dataKey="dia" {...ejes} interval={4} />
                    <YAxis {...ejes} tickFormatter={corto} />
                    <Tooltip content={<Globo titulo={(l) => `Día ${l}`} />} />
                    <Area dataKey="Mes anterior" stroke="var(--suave)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Area dataKey="Este mes" stroke="var(--gasto)" fill="var(--gasto)" fillOpacity={0.12} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-suave mt-2">Línea sólida: {etiquetaMes(mes)}. Punteada: mes anterior.</p>
            </Panel>

            <Panel titulo="Últimos 6 meses">
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={historial} margin={{ left: -18, right: 6, top: 6 }} barGap={3}>
                    <CartesianGrid stroke="var(--linea)" vertical={false} />
                    <XAxis dataKey="mes" {...ejes} />
                    <YAxis {...ejes} tickFormatter={corto} />
                    <Tooltip cursor={{ fill: 'var(--hundido)' }} content={<Globo />} />
                    <Bar dataKey="Ingresos" fill="var(--ingreso)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Gastos" fill="var(--gasto)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-suave mt-2">Verde: ingresos. Rojo: gastos.</p>
            </Panel>

            <Panel titulo="Regla 50/30/20">
              {r.ingresos > 0 ? (
                <ul className="space-y-3">
                  {grupos.map((g) => {
                    const real = g.total / r.ingresos;
                    const mal = g.nombre === 'Ahorro' ? real < g.ideal : real > g.ideal;
                    return (
                      <li key={g.nombre}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{g.nombre} <span className="text-suave">(ideal {g.nombre === 'Ahorro' ? 'mínimo' : 'máximo'} {pct(g.ideal)})</span></span>
                          <span className="cifra font-bold" style={{ color: mal ? 'var(--gasto)' : 'var(--ingreso)' }}>{pct(real)}</span>
                        </div>
                        <Barra valor={real} tope={Math.max(g.ideal, real, 0.0001)} color={mal ? 'var(--gasto)' : 'var(--ingreso)'} />
                      </li>
                    );
                  })}
                  <li className="text-xs text-suave">Qué categoría es necesidad o gusto lo decides tú en Ajustes.</li>
                </ul>
              ) : <p className="text-sm text-suave">Registra tus ingresos del mes para comparar contra la regla.</p>}
            </Panel>

            <Panel titulo="Con qué pagaste">
              <ul className="space-y-3">
                {r.porForma.map((f) => (
                  <li key={f.nombre}>
                    <div className="flex justify-between text-sm mb-1"><span>{f.nombre}</span><span className="cifra font-bold">{dinero0(f.total)}</span></div>
                    <Barra valor={f.total} tope={r.gastos} color="var(--marca)" />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel titulo="Tus 5 gastos más grandes">
              <ol className="space-y-2 text-sm">
                {mayores.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span className="cifra font-bold text-suave w-4">{i + 1}</span>
                    <span className="flex-1 min-w-0"><span className="block truncate font-medium">{m.descripcion || m.categoria}</span><span className="block text-suave text-xs truncate">{m.categoria}</span></span>
                    <span className="cifra font-bold">{dinero0(m.monto)}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
