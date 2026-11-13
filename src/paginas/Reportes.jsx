import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatos } from '../store.jsx';
import { Alternador, Barra, Boton, Indicador, Panel, Rejilla, Vacio, claseTabla, claseTd, claseTh } from '../ui.jsx';
import { Globo, corto, ejes } from './Dashboard.jsx';
import { MESES, colorDe, diasDelMes, dinero0, etiquetaMes, hoyISO, mesActual, mesDe, moverMes, pct, resumenMes, suma } from '../utils.js';
import { descargarCSVFilas, descargarExcel } from '../excel.js';

const filasMovs = (movs) => [['Fecha', 'Tipo', 'Categoría', 'Subcategoría', 'Concepto', 'Monto', 'Cuenta o medio de pago', 'Notas'],
  ...[...movs].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((m) => [m.fecha, m.tipo, m.categoria, m.subcategoria || '', m.descripcion, m.monto, m.formaPago, m.notas])];

function porCategoria(movs) {
  const o = {};
  movs.filter((m) => m.tipo === 'Gasto').forEach((m) => { (o[m.categoria] ||= { nombre: m.categoria, n: 0, total: 0 }); o[m.categoria].n++; o[m.categoria].total += m.monto; });
  return Object.values(o).sort((a, b) => b.total - a.total);
}

function TablaCategorias({ cats, total }) {
  const { datos } = useDatos();
  if (!cats.length) return <p className="text-sm text-suave py-4 text-center">Sin gastos en este periodo.</p>;
  return (
    <div className="overflow-x-auto">
      <table className={claseTabla}>
        <thead><tr>{['Categoría', 'Movimientos', 'Total gastado', '% del gasto', ''].map((h) => <th key={h} className={claseTh}>{h}</th>)}</tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.nombre}>
              <td className={claseTd}><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: colorDe(c.nombre, datos.categorias) }} />{c.nombre}</span></td>
              <td className={claseTd}>{c.n}</td>
              <td className={`${claseTd} cifra font-bold`}>{dinero0(c.total)}</td>
              <td className={claseTd}>{pct(total ? c.total / total : 0)}</td>
              <td className={`${claseTd} w-32 min-w-[100px]`}><Barra valor={c.total} tope={cats[0].total} color={colorDe(c.nombre, datos.categorias)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Mensual({ mes }) {
  const { datos } = useDatos();
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const anterior = useMemo(() => resumenMes(datos, moverMes(mes, -1)), [datos, mes]);
  const cats = porCategoria(r.movs);
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
  const grupos = ['Necesidad', 'Gusto', 'Ahorro'].map((g, i) => ({
    nombre: ['Necesidades', 'Gustos', 'Ahorro'][i], ideal: [0.5, 0.3, 0.2][i],
    total: g === 'Ahorro' ? Math.max(0, r.ingresos - r.consumo) : r.porGrupo.find((x) => x.nombre === g)?.total || 0,
  }));
  const mayores = r.movs.filter((m) => m.tipo === 'Gasto').sort((a, b) => b.monto - a.monto).slice(0, 5);

  const exportarExcel = () => descargarExcel(`micontrol-${mes}.xlsx`, [
    { nombre: 'Movimientos', filas: filasMovs(r.movs) },
    { nombre: 'Por categoría', filas: [['Categoría', 'Movimientos', 'Total', '% del gasto'], ...cats.map((c) => [c.nombre, c.n, c.total, r.gastos ? Math.round((c.total / r.gastos) * 1000) / 10 : 0])] },
    { nombre: 'Resumen', filas: [['Concepto', 'Importe'], ['Ingresos', r.ingresos], ['Gastos', r.gastos], ['Ahorro apartado', r.apartado], ['Balance', r.balance]] },
  ]);

  if (!r.movs.length) return <Panel><Vacio titulo={`Sin datos en ${etiquetaMes(mes)}`}>Registra gastos e ingresos y aquí verás tu reporte del mes.</Vacio></Panel>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <Boton variante="secundario" onClick={() => descargarCSVFilas(`micontrol-${mes}.csv`, filasMovs(r.movs))}><Download size={15} />CSV</Boton>
        <Boton variante="secundario" onClick={exportarExcel}><FileSpreadsheet size={15} />Excel</Boton>
      </div>
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Ingresos" valor={dinero0(r.ingresos)} tono="ingreso" />
        <Indicador etiqueta="Gastos" valor={dinero0(r.gastos)} tono="gasto" nota={r.apartado > 0 ? `Incluye ${dinero0(r.apartado)} de ahorro` : null} />
        <Indicador etiqueta="Balance" valor={dinero0(r.balance)} tono={r.balance < 0 ? 'gasto' : undefined} />
        <Indicador etiqueta="Movimientos" valor={String(r.movs.length)} nota={r.ingresos > 0 ? `Tasa de ahorro ${pct(r.tasaAhorro)}` : null} />
      </Rejilla>
      <Rejilla className="lg:grid-cols-2">
        <Panel titulo="En qué se fue">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={r.porCategoria} dataKey="total" nameKey="nombre" innerRadius="62%" outerRadius="100%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
                    {r.porCategoria.map((c) => <Cell key={c.nombre} fill={colorDe(c.nombre, datos.categorias)} />)}
                  </Pie>
                  <Tooltip content={<Globo titulo={(_, p) => p[0].name} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full min-w-0 space-y-1.5 text-xs">
              {r.porCategoria.slice(0, 7).map((c) => (
                <li key={c.nombre} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorDe(c.nombre, datos.categorias) }} />
                  <span className="truncate flex-1">{c.nombre}</span><span className="text-suave">{pct(c.total / r.gastos)}</span><span className="cifra font-bold w-20 text-right">{dinero0(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel titulo="Gasto acumulado día a día" subtitulo={`Línea sólida: ${etiquetaMes(mes)}. Punteada: mes anterior.`}>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={acumulado} margin={{ left: -14, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="dia" {...ejes} interval={4} />
                <YAxis {...ejes} tickFormatter={corto} width={44} />
                <Tooltip content={<Globo titulo={(l) => `Día ${l}`} />} />
                <Area dataKey="Mes anterior" stroke="var(--suave)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Area dataKey="Este mes" stroke="var(--gasto)" fill="var(--gasto)" fillOpacity={0.1} strokeWidth={2.3} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Rejilla>
      <Panel titulo="Resumen por categoría" subtitulo="Gastos del periodo seleccionado"><TablaCategorias cats={cats} total={r.gastos} /></Panel>
      <Rejilla className="lg:grid-cols-3">
        <Panel titulo="Regla 50/30/20">
          {r.ingresos > 0 ? (
            <ul className="space-y-3">
              {grupos.map((g) => {
                const real = g.total / r.ingresos;
                const mal = g.nombre === 'Ahorro' ? real < g.ideal : real > g.ideal;
                return (
                  <li key={g.nombre}>
                    <div className="flex justify-between text-xs mb-1"><span>{g.nombre} <span className="text-suave">(ideal {g.nombre === 'Ahorro' ? 'mínimo' : 'máximo'} {pct(g.ideal)})</span></span><span className="cifra font-bold" style={{ color: mal ? 'var(--gasto)' : 'var(--ingreso)' }}>{pct(real)}</span></div>
                    <Barra valor={real} tope={Math.max(g.ideal, real, 0.0001)} color={mal ? 'var(--gasto)' : 'var(--ingreso)'} />
                  </li>
                );
              })}
              <li className="text-[11px] text-suave">Qué categoría es necesidad o gusto lo decides en Configuración.</li>
            </ul>
          ) : <p className="text-sm text-suave">Registra tus ingresos del mes para comparar contra la regla.</p>}
        </Panel>
        <Panel titulo="Con qué pagaste">
          <ul className="space-y-3">
            {r.porForma.map((f) => <li key={f.nombre}><div className="flex justify-between text-xs mb-1"><span>{f.nombre}</span><span className="cifra font-bold">{dinero0(f.total)}</span></div><Barra valor={f.total} tope={r.gastos} color="var(--marca)" /></li>)}
          </ul>
        </Panel>
        <Panel titulo="Tus 5 gastos más grandes">
          <ol className="space-y-2 text-xs">
            {mayores.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3"><span className="cifra font-bold text-suave w-4">{i + 1}</span><span className="flex-1 min-w-0"><span className="block truncate font-semibold">{m.descripcion || m.categoria}</span><span className="block text-suave truncate">{m.categoria}</span></span><span className="cifra font-bold">{dinero0(m.monto)}</span></li>
            ))}
          </ol>
        </Panel>
      </Rejilla>
    </div>
  );
}

function Anual({ anio, setAnio }) {
  const { datos } = useDatos();
  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const ym = `${anio}-${String(i + 1).padStart(2, '0')}`;
    const r = resumenMes(datos, ym);
    return { ym, mes: MESES[i], Ingresos: r.ingresos, Gastos: r.gastos, Ahorro: r.ingresos - r.consumo, tasa: r.ingresos > 0 ? r.tasaAhorro : null, n: r.movs.length };
  }), [datos, anio]);
  const movs = datos.movimientos.filter((m) => m.fecha.startsWith(`${anio}-`));
  const ingresos = suma(meses, (m) => m.Ingresos), gastos = suma(meses, (m) => m.Gastos), ahorro = suma(meses, (m) => m.Ahorro);
  const cats = porCategoria(movs);
  let acum = 0;
  const ahorroSerie = meses.filter((m) => m.n || m.ym <= mesActual()).map((m) => ({ mes: m.mes, 'Ahorro del mes': m.Ahorro, Acumulado: (acum += m.Ahorro) }));
  const patrimonio = datos.historialPatrimonio.filter((h) => h.mes.startsWith(`${anio}-`)).map((h) => ({ mes: MESES[Number(h.mes.slice(5)) - 1], 'Patrimonio neto': h.neto }));
  const anios = [...new Set([String(new Date().getFullYear()), ...datos.movimientos.map((m) => m.fecha.slice(0, 4))])].sort().reverse();

  const exportarExcel = () => descargarExcel(`micontrol-${anio}.xlsx`, [
    { nombre: 'Por mes', filas: [['Mes', 'Ingresos', 'Gastos', 'Ahorro', 'Tasa de ahorro %'], ...meses.map((m) => [`${m.mes} ${anio}`, m.Ingresos, m.Gastos, m.Ahorro, m.tasa == null ? '' : Math.round(m.tasa * 1000) / 10])] },
    { nombre: 'Por categoría', filas: [['Categoría', 'Movimientos', 'Total', '% del gasto'], ...cats.map((c) => [c.nombre, c.n, c.total, gastos ? Math.round((c.total / gastos) * 1000) / 10 : 0])] },
    { nombre: 'Movimientos', filas: filasMovs(movs) },
    { nombre: 'Patrimonio', filas: [['Mes', 'Activos', 'Pasivos', 'Patrimonio neto'], ...datos.historialPatrimonio.filter((h) => h.mes.startsWith(`${anio}-`)).map((h) => [h.mes, h.activos, h.pasivos, h.neto])] },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between">
        <select value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Año" className="h-10 rounded-[9px] border border-linea bg-panel px-3 text-sm font-semibold">{anios.map((a) => <option key={a}>{a}</option>)}</select>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => descargarCSVFilas(`micontrol-${anio}.csv`, filasMovs(movs))}><Download size={15} />CSV</Boton>
          <Boton variante="secundario" onClick={exportarExcel}><FileSpreadsheet size={15} />Excel</Boton>
        </div>
      </div>
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta={`Ingresos ${anio}`} valor={dinero0(ingresos)} tono="ingreso" />
        <Indicador etiqueta={`Gastos ${anio}`} valor={dinero0(gastos)} tono="gasto" />
        <Indicador etiqueta="Ahorro del año" valor={dinero0(ahorro)} tono={ahorro < 0 ? 'gasto' : undefined} nota={ingresos > 0 ? `Tasa de ahorro ${pct(ahorro / ingresos)}` : null} />
        <Indicador etiqueta="Movimientos" valor={String(movs.length)} nota={`Promedio de gasto mensual ${dinero0(gastos / Math.max(1, meses.filter((m) => m.n).length))}`} />
      </Rejilla>
      <Rejilla className="lg:grid-cols-2">
        <Panel titulo="Ingresos contra gastos" subtitulo="Por mes">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={meses} margin={{ left: -6, right: 6, top: 6 }} barGap={2}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="mes" {...ejes} />
                <YAxis {...ejes} tickFormatter={corto} width={48} />
                <Tooltip cursor={{ fill: 'var(--hundido)' }} content={<Globo />} />
                <Bar dataKey="Ingresos" fill="var(--ingreso)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Gastos" fill="var(--gasto)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Evolución del ahorro" subtitulo="Ahorro de cada mes y acumulado del año">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={ahorroSerie} margin={{ left: -6, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="mes" {...ejes} />
                <YAxis {...ejes} tickFormatter={corto} width={48} />
                <Tooltip content={<Globo />} />
                <Line dataKey="Ahorro del mes" stroke="var(--ingreso)" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                <Line dataKey="Acumulado" stroke="var(--tinta)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Rejilla>
      <Rejilla className="lg:grid-cols-[1.4fr_1fr]">
        <Panel titulo="Resumen por mes">
          <div className="overflow-x-auto">
            <table className={claseTabla}>
              <thead><tr>{['Mes', 'Ingresos', 'Gastos', 'Ahorro', 'Tasa'].map((h) => <th key={h} className={claseTh}>{h}</th>)}</tr></thead>
              <tbody>
                {meses.filter((m) => m.n).map((m) => (
                  <tr key={m.ym}>
                    <td className={`${claseTd} font-semibold`}>{m.mes}</td>
                    <td className={`${claseTd} cifra text-ingreso`}>{dinero0(m.Ingresos)}</td>
                    <td className={`${claseTd} cifra text-gasto`}>{dinero0(m.Gastos)}</td>
                    <td className={`${claseTd} cifra font-bold`} style={m.Ahorro < 0 ? { color: 'var(--gasto)' } : undefined}>{dinero0(m.Ahorro)}</td>
                    <td className={claseTd}>{m.tasa == null ? '—' : pct(m.tasa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!meses.some((m) => m.n) && <p className="text-sm text-suave py-4 text-center">Sin movimientos en {anio}.</p>}
          </div>
        </Panel>
        <Panel titulo="Evolución del patrimonio">
          {patrimonio.length < 2 ? <p className="text-sm text-suave py-6 text-center">Se mostrará cuando haya al menos dos meses con foto de patrimonio en {anio}.</p> : (
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={patrimonio} margin={{ left: -6, right: 6, top: 6 }}>
                  <CartesianGrid stroke="var(--linea)" vertical={false} />
                  <XAxis dataKey="mes" {...ejes} />
                  <YAxis {...ejes} tickFormatter={corto} width={48} />
                  <Tooltip content={<Globo />} />
                  <Line dataKey="Patrimonio neto" stroke="var(--marca)" strokeWidth={2.3} dot={{ r: 2.5 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </Rejilla>
      <Panel titulo="Gastos por categoría en el año"><TablaCategorias cats={cats} total={gastos} /></Panel>
    </div>
  );
}

export default function Reportes({ mes }) {
  const [vista, setVista] = useState('mensual');
  const [anio, setAnio] = useState(mesDe(mes).slice(0, 4));
  return (
    <div className="space-y-4">
      <Alternador etiqueta="Tipo de reporte" opciones={[['mensual', 'Mensual'], ['anual', 'Anual']]} valor={vista} onCambio={setVista} />
      {vista === 'mensual' ? <Mensual mes={mes} /> : <Anual anio={anio} setAnio={setAnio} />}
    </div>
  );
}
