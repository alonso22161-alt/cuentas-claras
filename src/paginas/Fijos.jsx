import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { Boton, Campo, Encabezado, Hoja, Panel, Vacio, claseEntrada } from '../ui.jsx';
import { dinero0, nuevoId, suma } from '../utils.js';

const nuevo = (datos) => ({ id: '', descripcion: '', monto: '', tipo: 'Gasto', categoria: '', formaPago: datos.formasPago[0]?.nombre || '', dia: 1, activo: true });

export default function Fijos() {
  const { datos, guardarConfig, avisar } = useDatos();
  const [f, setF] = useState(null);
  const lista = datos.recurrentes;
  const activos = lista.filter((x) => x.activo && x.tipo === 'Gasto');
  const cats = f ? datos.categorias.filter((c) => c.tipo === f.tipo) : [];

  function guardar() {
    if (!f.descripcion.trim() || !(Number(f.monto) > 0) || !f.categoria) return avisar('Completa nombre, monto y categoría.');
    const fila = { ...f, id: f.id || nuevoId(), descripcion: f.descripcion.trim(), monto: Number(f.monto), dia: Math.min(31, Math.max(1, Number(f.dia) || 1)) };
    guardarConfig('recurrentes', f.id ? lista.map((x) => (x.id === f.id ? fila : x)) : [...lista, fila]);
    setF(null);
  }
  const borrar = () => { guardarConfig('recurrentes', lista.filter((x) => x.id !== f.id)); setF(null); };

  return (
    <>
      <Encabezado titulo="Gastos fijos"><Boton onClick={() => setF(nuevo(datos))}><Plus size={16} />Agregar</Boton></Encabezado>
      <p className="text-sm text-suave mb-4 max-w-prose">Renta, servicios, suscripciones o tu sueldo. Se registran solos cada mes el día que indiques, la primera vez que abras la app ese día o después.</p>
      {lista.length === 0 ? (
        <Panel><Vacio titulo="Sin gastos fijos">Agrega lo que pagas cada mes para no capturarlo a mano.</Vacio></Panel>
      ) : (
        <Panel titulo={`${dinero0(suma(activos, (x) => x.monto))} al mes en gastos fijos`}>
          <ul className="divide-y divide-linea -my-2">
            {lista.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setF({ ...x })} className={`w-full flex items-center gap-3 py-3 text-left ${x.activo ? '' : 'opacity-50'}`}>
                  <span className="cifra font-bold w-10 h-10 grid place-items-center rounded-xl bg-hundido shrink-0">{x.dia}</span>
                  <span className="flex-1 min-w-0"><span className="block font-medium truncate">{x.descripcion}</span><span className="block text-sm text-suave truncate">{x.categoria}, {x.formaPago}{x.activo ? '' : ' (en pausa)'}</span></span>
                  <span className="cifra font-bold" style={x.tipo === 'Ingreso' ? { color: 'var(--ingreso)' } : undefined}>{x.tipo === 'Ingreso' ? '+' : ''}{dinero0(x.monto)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {f && (
        <Hoja titulo={f.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onCerrar={() => setF(null)}>
          <div className="space-y-3">
            <Campo etiqueta="Nombre"><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ej. Renta" className={claseEntrada} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Monto"><input inputMode="decimal" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value.replace(/[^0-9.]/g, '') })} className={claseEntrada} /></Campo>
              <Campo etiqueta="Día del mes"><input inputMode="numeric" value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value.replace(/\D/g, '').slice(0, 2) })} className={claseEntrada} /></Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Tipo"><select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value, categoria: '' })} className={claseEntrada}><option>Gasto</option><option>Ingreso</option></select></Campo>
              <Campo etiqueta="Forma de pago"><select value={f.formaPago} onChange={(e) => setF({ ...f, formaPago: e.target.value })} className={claseEntrada}>{datos.formasPago.map((p) => <option key={p.nombre}>{p.nombre}</option>)}</select></Campo>
            </div>
            <Campo etiqueta="Categoría"><select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={claseEntrada}><option value="">Elige una</option>{cats.map((c) => <option key={c.nombre}>{c.nombre}</option>)}</select></Campo>
            <label className="flex items-center gap-2 text-sm py-1"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} className="h-4 w-4 accent-[var(--marca)]" />Activo (desmárcalo para pausarlo sin borrarlo)</label>
            <div className="flex gap-2 pt-1">{f.id && <Boton variante="peligro" onClick={borrar}>Borrar</Boton>}<Boton className="flex-1" onClick={guardar}>Guardar gasto fijo</Boton></div>
          </div>
        </Hoja>
      )}
    </>
  );
}
