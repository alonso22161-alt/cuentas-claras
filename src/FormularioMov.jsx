import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useDatos } from './store.jsx';
import { Boton, Campo, Chips, claseEntrada } from './ui.jsx';
import { hoyISO, nuevoId, sugerirCategoria } from './utils.js';

/** Formulario para capturar o editar un movimiento. Si recibe `mov`, edita; si no, crea uno nuevo. */
export default function FormularioMov({ mov, onListo }) {
  const { datos, guardarMov, borrarMov, avisar } = useDatos();
  const editando = Boolean(mov);
  const [tipo, setTipo] = useState(mov?.tipo || 'Gasto');
  const [monto, setMonto] = useState(mov ? String(mov.monto) : '');
  const [descripcion, setDescripcion] = useState(mov?.descripcion || '');
  const [categoria, setCategoria] = useState(mov?.categoria || '');
  const [elegidaAMano, setElegidaAMano] = useState(editando);
  const [formaPago, setFormaPago] = useState(mov?.formaPago || localStorage.getItem('cc_ultima_forma') || datos.formasPago[0]?.nombre || '');
  const [fecha, setFecha] = useState(mov?.fecha || hoyISO());
  const [notas, setNotas] = useState(mov?.notas || '');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const categorias = datos.categorias.filter((c) => c.tipo === tipo).map((c) => c.nombre);
  const sugerida = useMemo(() => sugerirCategoria(descripcion, tipo, datos), [descripcion, tipo, datos]);
  const categoriaFinal = elegidaAMano && categorias.includes(categoria) ? categoria : sugerida || '';
  const frecuentes = useMemo(() => {
    const vistos = new Set();
    return [...datos.movimientos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .map((m) => m.descripcion).filter((d) => d && !vistos.has(d.toLowerCase()) && vistos.add(d.toLowerCase())).slice(0, 40);
  }, [datos.movimientos]);

  const valor = parseFloat(String(monto).replace(',', '.'));
  const esGasto = tipo === 'Gasto';

  async function guardar() {
    if (!(valor > 0)) return avisar('Escribe un monto mayor a cero.');
    if (!categoriaFinal) return avisar('Elige una categoría.');
    localStorage.setItem('cc_ultima_forma', formaPago);
    const nuevo = {
      id: mov?.id || nuevoId(), fecha, tipo, categoria: categoriaFinal, descripcion: descripcion.trim(),
      monto: Math.round(valor * 100) / 100, formaPago, notas: notas.trim(),
    };
    guardarMov(nuevo, mov?.fecha);
    if (editando) onListo?.();
    else { setMonto(''); setDescripcion(''); setCategoria(''); setElegidaAMano(false); setNotas(''); onListo?.(); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 bg-hundido rounded-xl" role="group" aria-label="Tipo de movimiento">
        {['Gasto', 'Ingreso'].map((t) => (
          <button key={t} type="button" aria-pressed={tipo === t} onClick={() => { setTipo(t); setCategoria(''); setElegidaAMano(false); }}
            className={`h-10 rounded-lg text-sm font-semibold ${tipo === t ? 'bg-panel shadow-sm' : 'text-suave'}`}
            style={tipo === t ? { color: t === 'Gasto' ? 'var(--gasto)' : 'var(--ingreso)' } : undefined}>
            {t}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Monto</span>
        <div className="flex items-baseline justify-center gap-1 py-2" style={{ color: esGasto ? 'var(--gasto)' : 'var(--ingreso)' }}>
          <span className="cifra text-3xl font-bold opacity-70">$</span>
          <input inputMode="decimal" autoFocus={!editando} placeholder="0" value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
            style={{ width: `${Math.max(1, String(monto).length) + 0.5}ch` }}
            className="cifra text-6xl font-bold bg-transparent outline-none text-center min-w-[2ch] max-w-full placeholder:opacity-40 placeholder:text-current" />
        </div>
      </label>

      <Campo etiqueta="¿En qué?">
        <input list="cc-frecuentes" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={esGasto ? 'Ej. Gasolina, Walmart, tacos' : 'Ej. Quincena'} className={claseEntrada} />
        <datalist id="cc-frecuentes">{frecuentes.map((d) => <option key={d} value={d} />)}</datalist>
      </Campo>

      <div>
        <p className="text-sm text-suave mb-2">
          Categoría{!elegidaAMano && sugerida ? ' (sugerida por lo que escribiste)' : ''}
        </p>
        <Chips opciones={categorias} valor={categoriaFinal} onCambio={(c) => { setCategoria(c); setElegidaAMano(true); }} />
      </div>

      <div>
        <p className="text-sm text-suave mb-2">{esGasto ? 'Pagué con' : 'Lo recibí en'}</p>
        <Chips opciones={datos.formasPago.map((f) => f.nombre)} valor={formaPago} onCambio={setFormaPago} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha"><input type="date" value={fecha} max={hoyISO()} onChange={(e) => e.target.value && setFecha(e.target.value)} className={claseEntrada} /></Campo>
        <Campo etiqueta="Notas (opcional)"><input value={notas} onChange={(e) => setNotas(e.target.value)} className={claseEntrada} /></Campo>
      </div>

      <div className="flex gap-2 pt-1">
        {editando && (confirmarBorrado
          ? <Boton variante="peligro" onClick={() => { borrarMov(mov); onListo?.(); }}>Sí, borrar</Boton>
          : <Boton variante="peligro" aria-label="Borrar movimiento" onClick={() => setConfirmarBorrado(true)}><Trash2 size={16} /></Boton>)}
        <Boton className="flex-1 h-12 text-base" onClick={guardar}>{editando ? 'Guardar cambios' : esGasto ? 'Guardar gasto' : 'Guardar ingreso'}</Boton>
      </div>
    </div>
  );
}
