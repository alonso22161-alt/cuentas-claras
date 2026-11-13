import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { EditorMov } from '../FormularioMov.jsx';
import { Boton, Etiqueta, Hoja, Panel, Vacio, claseEntrada, claseTabla, claseTd, claseTh } from '../ui.jsx';
import { colorDe, descargarCSV, dinero, diasDelMes, etiquetaDia, suma } from '../utils.js';

const SIGNO = { Gasto: '−', Ingreso: '+', Transferencia: '' };
const COLOR = { Gasto: 'var(--gasto)', Ingreso: 'var(--ingreso)', Transferencia: 'var(--suave)' };
const TONO = { Gasto: 'gasto', Ingreso: 'ingreso', Transferencia: 'neutro' };
const fechaCorta = (f) => `${f.slice(8)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

/** Lista de movimientos: tabla en pantallas anchas y lista compacta en celular. */
export function ListaMovs({ movs, completa = false, marcados, vacio = 'No hay movimientos en este periodo.' }) {
  const { datos } = useDatos();
  const [editando, setEditando] = useState(null);
  if (!movs.length) return <p className="text-center text-suave py-8 text-sm">{vacio}</p>;
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className={claseTabla}>
          <thead><tr>
            <th className={claseTh}>Fecha</th><th className={claseTh}>Concepto</th>{completa && <th className={claseTh}>Tipo</th>}
            <th className={claseTh}>Categoría</th>{completa && <th className={claseTh}>Cuenta</th>}<th className={`${claseTh} text-right`}>Monto</th><th className={claseTh} aria-label="Acciones" />
          </tr></thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id} className="hover:bg-hundido/60">
                <td className={`${claseTd} text-suave`}>{fechaCorta(m.fecha)}</td>
                <td className={`${claseTd} max-w-[280px] truncate`}><b className="font-semibold">{m.descripcion || m.categoria}</b>{marcados?.has(m.id) && <span className="ml-2"><Etiqueta tono="aviso">Extraordinario</Etiqueta></span>}</td>
                {completa && <td className={claseTd}><Etiqueta tono={TONO[m.tipo]}>{m.tipo}</Etiqueta></td>}
                <td className={claseTd}><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colorDe(m.categoria, datos.categorias) }} />{m.categoria}{m.subcategoria && <span className="text-suave">· {m.subcategoria}</span>}</span></td>
                {completa && <td className={`${claseTd} text-suave`}>{m.formaPago || '—'}</td>}
                <td className={`${claseTd} text-right cifra font-bold`} style={{ color: COLOR[m.tipo] }}>{SIGNO[m.tipo]}{dinero(m.monto)}</td>
                <td className={`${claseTd} text-right`}><button type="button" onClick={() => setEditando(m)} aria-label={`Editar ${m.descripcion || m.categoria}`} className="h-7 w-7 inline-grid place-items-center rounded-md text-suave hover:text-marca hover:bg-marca-suave"><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-linea -my-1">
        {movs.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => setEditando(m)} className="w-full flex items-center gap-3 py-2.5 text-left">
              <span className="h-9 w-1.5 rounded-full shrink-0" style={{ background: colorDe(m.categoria, datos.categorias) }} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm truncate">{m.descripcion || m.categoria}{marcados?.has(m.id) && ' ⚠'}</span>
                <span className="block text-xs text-suave truncate">{[etiquetaDia(m.fecha), m.categoria, m.formaPago].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="cifra font-bold text-sm shrink-0" style={{ color: COLOR[m.tipo] }}>{SIGNO[m.tipo]}{dinero(m.monto)}</span>
            </button>
          </li>
        ))}
      </ul>
      {editando && <Hoja titulo="Editar movimiento" onCerrar={() => setEditando(null)}><EditorMov mov={editando} onListo={() => setEditando(null)} /></Hoja>}
    </>
  );
}

export default function Movimientos({ mes, abrirMov }) {
  const { datos } = useDatos();
  const inicio = `${mes}-01`, fin = `${mes}-${diasDelMes(mes)}`;
  const [desde, setDesde] = useState(inicio);
  const [hasta, setHasta] = useState(fin);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  useEffect(() => { setDesde(inicio); setHasta(fin); }, [inicio, fin]);

  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return datos.movimientos
      .filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta))
      .filter((m) => !tipo || m.tipo === tipo)
      .filter((m) => !categoria || m.categoria === categoria)
      .filter((m) => !t || `${m.descripcion} ${m.categoria} ${m.subcategoria} ${m.formaPago} ${m.notas}`.toLowerCase().includes(t))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }, [datos.movimientos, desde, hasta, busqueda, tipo, categoria]);

  const ingresos = suma(lista.filter((m) => m.tipo === 'Ingreso'), (m) => m.monto);
  const gastos = suma(lista.filter((m) => m.tipo === 'Gasto'), (m) => m.monto);
  const categorias = [...new Set([...datos.categorias.map((c) => c.nombre), ...datos.movimientos.map((m) => m.categoria)])].filter(Boolean).sort();
  const filtrado = busqueda || tipo || categoria || desde !== inicio || hasta !== fin;

  return (
    <Panel titulo="Todos los movimientos" subtitulo="Administra tus ingresos y gastos diarios. Toca uno para editarlo o eliminarlo."
      accion={<>
        <button type="button" title="Descargar en CSV lo que ves" aria-label="Descargar en CSV" onClick={() => descargarCSV(lista)} className="h-10 w-10 grid place-items-center rounded-[9px] border border-linea text-suave hover:text-tinta"><Download size={16} /></button>
        <Boton onClick={() => abrirMov()}><Plus size={15} />Registrar</Boton>
      </>}>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar concepto, nota…" aria-label="Buscar movimientos" className={`${claseEntrada} pl-9`} />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo" className={`${claseEntrada} !w-auto`}>
          <option value="">Todos los tipos</option><option value="Ingreso">Ingresos</option><option value="Gasto">Gastos</option><option value="Transferencia">Pagos y transferencias</option>
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría" className={`${claseEntrada} !w-auto max-w-[200px]`}>
          <option value="">Todas las categorías</option>{categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" className={`${claseEntrada} !w-auto`} />
          <span className="text-suave text-xs">a</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" className={`${claseEntrada} !w-auto`} />
        </div>
        {filtrado && <Boton variante="texto" tam="sm" onClick={() => { setBusqueda(''); setTipo(''); setCategoria(''); setDesde(inicio); setHasta(fin); }}>Limpiar filtros</Boton>}
      </div>
      <p className="text-xs text-suave mb-2">{lista.length} movimientos · Ingresos <b className="text-ingreso">{dinero(ingresos)}</b> · Gastos <b className="text-gasto">{dinero(gastos)}</b></p>
      {lista.length === 0
        ? <Vacio titulo="Sin movimientos">{filtrado ? 'Nada coincide con tus filtros.' : 'En este mes aún no registras nada.'}</Vacio>
        : <ListaMovs movs={lista} completa />}
    </Panel>
  );
}
