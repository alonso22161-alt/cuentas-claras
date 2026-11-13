import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioMov from '../FormularioMov.jsx';
import { Encabezado, Hoja, Panel, SelectorMes, Vacio, claseEntrada } from '../ui.jsx';
import { colorDe, descargarCSV, dinero, etiquetaDia, mesActual, mesDe, suma } from '../utils.js';

export function FilaMov({ mov, onClick, conFecha }) {
  const { datos } = useDatos();
  const esGasto = mov.tipo === 'Gasto';
  const Etiqueta = onClick ? 'button' : 'div';
  return (
    <li>
      <Etiqueta {...(onClick ? { type: 'button', onClick } : {})} className="w-full flex items-center gap-3 py-2.5 text-left">
        <span className="h-9 w-1.5 rounded-full shrink-0" style={{ background: colorDe(mov.categoria, datos.categorias) }} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium truncate">{mov.descripcion || mov.categoria}</span>
          <span className="block text-sm text-suave truncate">{[conFecha && etiquetaDia(mov.fecha), mov.categoria, mov.formaPago].filter(Boolean).join(', ')}</span>
        </span>
        <span className="cifra font-bold shrink-0" style={{ color: esGasto ? 'var(--tinta)' : 'var(--ingreso)' }}>{esGasto ? '-' : '+'}{dinero(mov.monto)}</span>
      </Etiqueta>
    </li>
  );
}

export default function Movimientos() {
  const { datos } = useDatos();
  const [mes, setMes] = useState(mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [editando, setEditando] = useState(null);

  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return datos.movimientos
      .filter((m) => mesDe(m.fecha) === mes)
      .filter((m) => filtro === 'Todos' || m.tipo === filtro)
      .filter((m) => !t || `${m.descripcion} ${m.categoria} ${m.formaPago} ${m.notas}`.toLowerCase().includes(t))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }, [datos.movimientos, mes, busqueda, filtro]);

  const porDia = useMemo(() => {
    const g = [];
    lista.forEach((m) => { const u = g[g.length - 1]; if (u && u.fecha === m.fecha) u.movs.push(m); else g.push({ fecha: m.fecha, movs: [m] }); });
    return g;
  }, [lista]);

  return (
    <>
      <Encabezado titulo="Movimientos">
        <button type="button" aria-label="Descargar todo en CSV" title="Descargar todo en CSV" onClick={() => descargarCSV(datos.movimientos)} className="h-10 w-10 grid place-items-center rounded-xl bg-panel border border-linea text-suave"><Download size={17} /></button>
        <SelectorMes mes={mes} onCambio={setMes} />
      </Encabezado>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar" aria-label="Buscar movimientos" className={`${claseEntrada} pl-9`} />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por tipo" className={`${claseEntrada} !w-auto`}>
          <option>Todos</option><option value="Gasto">Gastos</option><option value="Ingreso">Ingresos</option>
        </select>
      </div>

      {porDia.length === 0 ? (
        <Panel><Vacio titulo="Sin movimientos">{busqueda || filtro !== 'Todos' ? 'Nada coincide con tu búsqueda en este mes.' : 'Este mes aún no registras nada. Ve a Capturar para agregar el primero.'}</Vacio></Panel>
      ) : (
        <div className="space-y-4">
          {porDia.map((d) => (
            <Panel key={d.fecha} titulo={<span className="first-letter:uppercase inline-block">{etiquetaDia(d.fecha)}</span>}
              accion={<span className="text-sm text-suave cifra">{dinero(suma(d.movs.filter((m) => m.tipo === 'Gasto'), (m) => m.monto))}</span>}>
              <ul className="divide-y divide-linea -my-2">{d.movs.map((m) => <FilaMov key={m.id} mov={m} onClick={() => setEditando(m)} />)}</ul>
            </Panel>
          ))}
        </div>
      )}

      {editando && <Hoja titulo="Editar movimiento" onCerrar={() => setEditando(null)}><FormularioMov mov={editando} onListo={() => setEditando(null)} /></Hoja>}
    </>
  );
}
