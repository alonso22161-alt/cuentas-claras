import { useMemo, useState } from 'react';
import { useDatos } from './store.jsx';
import { BotonConfirmar, Boton, Campo, Chips, claseEntrada, soloImporte } from './ui.jsx';
import { hoyISO, nuevoId, sugerirCategoria } from './utils.js';
import { vinculo } from './finanzas.js';
import FormularioPago from './FormularioPago.jsx';

export const listaSub = (cat) => String(cat?.subcategorias || '').split(',').map((s) => s.trim()).filter(Boolean);

/** Abre el formulario correcto para editar: los pagos de tarjeta, abonos y aportaciones tienen el suyo. */
export function EditorMov({ mov, onListo }) {
  const { datos } = useDatos();
  const v = vinculo(mov);
  if (v) {
    const item = { tarjeta: datos.tarjetas, deuda: datos.deudas, meta: datos.metas }[v.clase].find((x) => String(x.id) === v.id);
    if (item) return <FormularioPago clase={v.clase} item={item} mov={mov} onListo={onListo} />;
  }
  return <FormularioMov mov={mov} onListo={onListo} />;
}

/** Formulario para capturar o editar un ingreso o gasto. Si recibe `mov`, edita; si no, crea uno nuevo. */
export default function FormularioMov({ mov, tipoInicial = 'Gasto', onListo }) {
  const { datos, guardarMov, borrarMov, avisar } = useDatos();
  const editando = Boolean(mov);
  const [tipo, setTipo] = useState(mov?.tipo === 'Ingreso' ? 'Ingreso' : mov ? 'Gasto' : tipoInicial);
  const [monto, setMonto] = useState(mov ? String(mov.monto) : '');
  const [descripcion, setDescripcion] = useState(mov?.descripcion || '');
  const [categoria, setCategoria] = useState(mov?.categoria || '');
  const [subcategoria, setSubcategoria] = useState(mov?.subcategoria || '');
  const [elegidaAMano, setElegidaAMano] = useState(editando);
  const [formaPago, setFormaPago] = useState(mov?.formaPago || localStorage.getItem('cc_ultima_forma') || datos.formasPago[0]?.nombre || '');
  const [fecha, setFecha] = useState(mov?.fecha || hoyISO());
  const [notas, setNotas] = useState(mov?.notas || '');

  const categorias = datos.categorias.filter((c) => c.tipo === tipo).map((c) => c.nombre);
  const sugerida = useMemo(() => sugerirCategoria(descripcion, tipo, datos), [descripcion, tipo, datos]);
  const categoriaFinal = elegidaAMano && categorias.includes(categoria) ? categoria : sugerida || '';
  const subs = listaSub(datos.categorias.find((c) => c.nombre === categoriaFinal && c.tipo === tipo));
  const frecuentes = useMemo(() => {
    const vistos = new Set();
    return [...datos.movimientos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .map((m) => m.descripcion).filter((d) => d && !vistos.has(d.toLowerCase()) && vistos.add(d.toLowerCase())).slice(0, 40);
  }, [datos.movimientos]);

  const valor = parseFloat(monto);
  const esGasto = tipo === 'Gasto';

  async function guardar() {
    if (!(valor > 0)) return avisar('Escribe un importe mayor a cero.');
    if (valor >= 100000000) return avisar('El importe es demasiado grande. Revísalo.');
    if (!categoriaFinal) return avisar('Elige una categoría.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return avisar('Elige una fecha válida.');
    localStorage.setItem('cc_ultima_forma', formaPago);
    const nuevo = {
      id: mov?.id || nuevoId(), fecha, tipo, categoria: categoriaFinal, subcategoria: subs.includes(subcategoria) ? subcategoria : '',
      descripcion: descripcion.trim(), monto: Math.round(valor * 100) / 100, formaPago, notas: notas.trim(),
    };
    guardarMov(nuevo, mov?.fecha);
    if (!editando) { setMonto(''); setDescripcion(''); setCategoria(''); setSubcategoria(''); setElegidaAMano(false); setNotas(''); }
    onListo?.();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 bg-hundido rounded-[10px]" role="group" aria-label="Tipo de movimiento">
        {['Gasto', 'Ingreso'].map((t) => (
          <button key={t} type="button" aria-pressed={tipo === t} onClick={() => { setTipo(t); setCategoria(''); setSubcategoria(''); setElegidaAMano(false); }}
            className={`h-9 rounded-lg text-sm font-semibold ${tipo === t ? 'bg-panel shadow-sm' : 'text-suave'}`}
            style={tipo === t ? { color: t === 'Gasto' ? 'var(--gasto)' : 'var(--ingreso)' } : undefined}>
            {t}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Importe</span>
        <div className="flex items-baseline justify-center gap-1 py-1" style={{ color: esGasto ? 'var(--gasto)' : 'var(--ingreso)' }}>
          <span className="cifra text-3xl font-bold opacity-70">$</span>
          <input inputMode="decimal" autoFocus={!editando} placeholder="0" value={monto}
            onChange={(e) => setMonto(soloImporte(e.target.value))}
            style={{ width: `${Math.max(1, String(monto).length) + 0.5}ch` }}
            className="cifra text-5xl font-bold bg-transparent outline-none text-center min-w-[2ch] max-w-full placeholder:opacity-40 placeholder:text-current" />
        </div>
      </label>

      <Campo etiqueta="Concepto">
        <input list="cc-frecuentes" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={esGasto ? 'Ej. Supermercado, gasolina, tacos' : 'Ej. Quincena, bono'} className={claseEntrada} />
        <datalist id="cc-frecuentes">{frecuentes.map((d) => <option key={d} value={d} />)}</datalist>
      </Campo>

      <div>
        <p className="text-[11px] font-semibold text-suave mb-1.5">Categoría{!elegidaAMano && sugerida ? ' (sugerida por lo que escribiste)' : ''}</p>
        <Chips opciones={categorias} valor={categoriaFinal} onCambio={(c) => { setCategoria(c); setSubcategoria(''); setElegidaAMano(true); }} />
      </div>

      {subs.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-suave mb-1.5">Subcategoría (opcional)</p>
          <Chips opciones={subs} valor={subcategoria} onCambio={(s) => setSubcategoria(s === subcategoria ? '' : s)} />
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold text-suave mb-1.5">{esGasto ? 'Cuenta o medio de pago' : 'Lo recibí en'}</p>
        <Chips opciones={datos.formasPago.map((f) => f.nombre)} valor={formaPago} onCambio={setFormaPago} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha"><input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className={claseEntrada} /></Campo>
        <Campo etiqueta="Nota (opcional)"><input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalle adicional" className={claseEntrada} /></Campo>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {editando && <BotonConfirmar tam="md" pregunta="¿Borrar?" onConfirmar={() => { borrarMov(mov); onListo?.(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>{editando ? 'Guardar cambios' : esGasto ? 'Guardar gasto' : 'Guardar ingreso'}</Boton>
      </div>
    </div>
  );
}
