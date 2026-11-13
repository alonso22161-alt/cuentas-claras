import { useState } from 'react';
import { useDatos } from './store.jsx';
import { BotonConfirmar, Boton, Campo, claseEntrada, soloImporte } from './ui.jsx';
import { MESES, nuevoId } from './utils.js';
import { FRECUENCIAS } from './finanzas.js';

const nuevo = (datos, tipo) => ({
  id: '', descripcion: '', monto: '', tipo, categoria: '', formaPago: datos.formasPago[0]?.nombre || '',
  dia: 1, activo: true, frecuencia: 'Mensual', mes: new Date().getMonth() + 1, automatico: tipo === 'Gasto',
});

/** Alta y edición de gastos fijos e ingresos esperados (ambos viven en la pestaña "Gastos fijos"). */
export default function FormularioFijo({ fijo, tipo = 'Gasto', onListo }) {
  const { datos, guardarConfig, avisar } = useDatos();
  const [f, setF] = useState(() => (fijo ? { ...fijo, monto: String(fijo.monto) } : nuevo(datos, tipo)));
  const lista = datos.recurrentes;
  const cats = datos.categorias.filter((c) => c.tipo === f.tipo);
  const esIngreso = f.tipo === 'Ingreso';
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function guardar() {
    const monto = parseFloat(f.monto);
    if (!f.descripcion.trim()) return avisar('Escribe el concepto.');
    if (!(monto > 0)) return avisar('Escribe un importe mayor a cero.');
    if (!f.categoria) return avisar('Elige una categoría.');
    const dia = Number(f.dia);
    if (!(dia >= 1 && dia <= 31)) return avisar('El día debe estar entre 1 y 31.');
    const fila = { ...f, id: f.id || nuevoId(), descripcion: f.descripcion.trim(), monto: Math.round(monto * 100) / 100, dia, mes: Number(f.mes) || 1 };
    guardarConfig('recurrentes', f.id ? lista.map((x) => (x.id === f.id ? fila : x)) : [...lista, fila]);
    onListo?.();
  }
  const borrar = () => { guardarConfig('recurrentes', lista.filter((x) => x.id !== f.id)); onListo?.(); };

  return (
    <div className="space-y-3">
      <Campo etiqueta="Concepto"><input value={f.descripcion} onChange={cambiar('descripcion')} placeholder={esIngreso ? 'Ej. Sueldo, comisiones' : 'Ej. Renta, internet, colegiatura'} className={claseEntrada} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Importe"><input inputMode="decimal" value={f.monto} onChange={(e) => setF({ ...f, monto: soloImporte(e.target.value) })} placeholder="0.00" className={claseEntrada} /></Campo>
        <Campo etiqueta="Tipo">
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value, categoria: '' })} className={claseEntrada}><option value="Gasto">Gasto</option><option value="Ingreso">Ingreso</option></select>
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Frecuencia"><select value={f.frecuencia} onChange={cambiar('frecuencia')} className={claseEntrada}>{FRECUENCIAS.map((x) => <option key={x}>{x}</option>)}</select></Campo>
        <Campo etiqueta={f.frecuencia === 'Semanal' ? 'Primer día del mes' : f.frecuencia === 'Quincenal' ? 'Día (y 15 días después)' : 'Día de vencimiento'}>
          <input inputMode="numeric" value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value.replace(/\D/g, '').slice(0, 2) })} className={claseEntrada} />
        </Campo>
      </div>
      {f.frecuencia === 'Anual' && (
        <Campo etiqueta="Mes en que se paga"><select value={f.mes} onChange={cambiar('mes')} className={claseEntrada}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Campo>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Categoría"><select value={f.categoria} onChange={cambiar('categoria')} className={claseEntrada}><option value="">Elige una</option>{cats.map((c) => <option key={c.nombre}>{c.nombre}</option>)}</select></Campo>
        <Campo etiqueta={esIngreso ? 'Lo recibo en' : 'Forma de pago'}><select value={f.formaPago} onChange={cambiar('formaPago')} className={claseEntrada}>{datos.formasPago.map((p) => <option key={p.nombre}>{p.nombre}</option>)}</select></Campo>
      </div>
      <label className="flex items-start gap-2 text-sm pt-1">
        <input type="checkbox" checked={f.automatico} onChange={cambiar('automatico')} className="h-4 w-4 mt-0.5 accent-[var(--marca)]" />
        <span>Registrar automáticamente<span className="block text-xs text-suave">{f.automatico ? 'Se registra solo el día indicado, la primera vez que abras la app ese día o después.' : 'Queda pendiente hasta que lo marques como pagado (o recibido).'}</span></span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.activo} onChange={cambiar('activo')} className="h-4 w-4 accent-[var(--marca)]" />Activo (desmárcalo para pausarlo sin borrarlo)
      </label>
      <div className="flex items-center gap-2 pt-2">
        {f.id && <BotonConfirmar tam="md" pregunta="¿Borrar?" onConfirmar={borrar}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>Guardar</Boton>
      </div>
    </div>
  );
}

/** Marca como pagado (o recibido) un fijo: crea su movimiento con el ID de esa fecha, así nunca se duplica. */
export const movDeOcurrencia = (o) => ({
  id: o.id, fecha: o.fecha, tipo: o.fijo.tipo, categoria: o.fijo.categoria, subcategoria: '', descripcion: o.fijo.descripcion,
  monto: o.fijo.monto, formaPago: o.fijo.formaPago, notas: o.fijo.tipo === 'Ingreso' ? 'Ingreso fijo' : 'Gasto fijo',
});
