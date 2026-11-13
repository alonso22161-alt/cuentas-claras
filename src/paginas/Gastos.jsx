import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, CalendarDays, Plus, ShoppingBag } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { Barra, Boton, Indicador, Panel, Rejilla, claseEntrada, claseTabla, claseTd, claseTh } from '../ui.jsx';
import { ListaMovs } from './Movimientos.jsx';
import { colorDe, diasDelMes, dinero0, etiquetaMes, hoyISO, mesActual, moverMes, pct, promedioPrevio, resumenMes, suma } from '../utils.js';
import { extraordinarios } from '../finanzas.js';

export default function Gastos({ mes, abrirMov }) {
  const { datos } = useDatos();
  const [categoria, setCategoria] = useState('');
  const [soloRaros, setSoloRaros] = useState(false);
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const anterior = useMemo(() => resumenMes(datos, moverMes(mes, -1)), [datos, mes]);
  const previo = useMemo(() => promedioPrevio(datos, mes, 3), [datos, mes]);
  const raros = useMemo(() => extraordinarios(datos, mes), [datos, mes]);
  const dias = mes === mesActual() ? Number(hoyISO().slice(8)) : diasDelMes(mes);

  const gastos = r.movs.filter((m) => m.tipo === 'Gasto')
    .filter((m) => !categoria || m.categoria === categoria)
    .filter((m) => !soloRaros || raros.has(m.id))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const antCat = Object.fromEntries(anterior.porCategoria.map((c) => [c.nombre, c.total]));
  const nombres = [...new Set([...r.porCategoria.map((c) => c.nombre), ...Object.keys(previo.porCat)])];
  const comparativo = nombres.map((nombre) => {
    const actual = r.porCategoria.find((c) => c.nombre === nombre)?.total || 0;
    const promedio = previo.porCat[nombre] || 0;
    return { nombre, actual, anterior: antCat[nombre] || 0, promedio, cambio: promedio > 0 ? actual / promedio - 1 : null };
  }).sort((a, b) => b.actual - a.actual || b.promedio - a.promedio);
  const maximo = Math.max(1, ...comparativo.map((c) => Math.max(c.actual, c.promedio)));

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Gastos del mes" valor={dinero0(r.gastos)} tono="gasto" Icono={ArrowDownRight} nota={r.apartado > 0 ? `Incluye ${dinero0(r.apartado)} de ahorro` : `${r.movs.filter((m) => m.tipo === 'Gasto').length} gastos`} />
        <Indicador etiqueta="Consumo" valor={dinero0(r.consumo)} Icono={ShoppingBag} nota={previo.meses ? `Tu promedio es ${dinero0(previo.consumo)}` : 'Gasto sin contar el ahorro'} />
        <Indicador etiqueta="Gasto diario promedio" valor={dinero0(r.consumo / Math.max(1, dias))} Icono={CalendarDays} nota={`En ${dias} días de ${etiquetaMes(mes)}`} />
        <Indicador etiqueta="Extraordinarios" valor={String(raros.size)} Icono={AlertTriangle} tono={raros.size ? 'aviso' : undefined} nota="Muy por arriba de lo normal en su categoría" />
      </Rejilla>

      <Panel titulo="Comparativo por categoría" subtitulo={`Este mes contra el anterior y tu promedio de ${previo.meses || 0} meses`}>
        {comparativo.length === 0 ? <p className="text-sm text-suave py-4 text-center">Sin gastos para comparar.</p> : (
          <div className="overflow-x-auto">
            <table className={claseTabla}>
              <thead><tr>{['Categoría', 'Este mes', 'Mes anterior', 'Promedio', 'Cambio', ''].map((h) => <th key={h} className={claseTh}>{h}</th>)}</tr></thead>
              <tbody>
                {comparativo.map((c) => (
                  <tr key={c.nombre}>
                    <td className={claseTd}><button type="button" className="inline-flex items-center gap-1.5 hover:text-marca" onClick={() => setCategoria(categoria === c.nombre ? '' : c.nombre)}><span className="h-2 w-2 rounded-full" style={{ background: colorDe(c.nombre, datos.categorias) }} />{c.nombre}</button></td>
                    <td className={`${claseTd} cifra font-bold`}>{dinero0(c.actual)}</td>
                    <td className={`${claseTd} cifra text-suave`}>{dinero0(c.anterior)}</td>
                    <td className={`${claseTd} cifra text-suave`}>{dinero0(c.promedio)}</td>
                    <td className={`${claseTd} cifra font-semibold`} style={{ color: c.cambio == null ? 'var(--suave)' : c.cambio > 0.15 ? 'var(--gasto)' : c.cambio < -0.15 ? 'var(--ingreso)' : 'var(--suave)' }}>{c.cambio == null ? '—' : `${c.cambio >= 0 ? '+' : '−'}${pct(Math.abs(c.cambio))}`}</td>
                    <td className={`${claseTd} w-40 min-w-[120px]`}><Barra valor={c.actual} tope={maximo} color={colorDe(c.nombre, datos.categorias)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel titulo="Historial de gastos" subtitulo="Tus compras, pagos y salidas de dinero" accion={<Boton onClick={() => abrirMov('Gasto')}><Plus size={15} />Agregar gasto</Boton>}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría" className={`${claseEntrada} !w-auto`}>
            <option value="">Todas las categorías</option>{datos.categorias.filter((c) => c.tipo === 'Gasto').map((c) => <option key={c.nombre}>{c.nombre}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={soloRaros} onChange={(e) => setSoloRaros(e.target.checked)} className="h-4 w-4 accent-[var(--marca)]" />Solo extraordinarios</label>
          <span className="text-xs text-suave ml-auto">{gastos.length} gastos · {dinero0(suma(gastos, (m) => m.monto))}</span>
        </div>
        <ListaMovs movs={gastos} marcados={raros} vacio="No hay gastos con estos filtros." />
      </Panel>
    </div>
  );
}
