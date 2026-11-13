import { useState } from 'react';
import { useDatos } from './store.jsx';
import { BotonConfirmar, Boton, Campo, claseEntrada, soloImporte } from './ui.jsx';
import { dinero, hoyISO, nuevoId } from './utils.js';
import { estadoDeuda, estadoTarjeta, idVinculado } from './finanzas.js';

const TEXTOS = {
  tarjeta: {
    boton: 'Registrar pago',
    ayuda: 'Es una transferencia: baja el saldo de la tarjeta pero no cuenta como gasto, porque tus compras ya se contaron el día que las hiciste.',
  },
  deuda: {
    boton: 'Registrar abono',
    ayuda: 'El abono baja el saldo de la deuda. Si lo cuentas como gasto, también se resta de tu balance del mes.',
    casilla: 'Contar como gasto del mes (salida de dinero)',
  },
  meta: {
    boton: 'Registrar aportación',
    ayuda: 'Se guarda en el historial de la meta. Si la registras como movimiento, cuenta como ahorro del mes: baja lo que te queda pero no cuenta como consumo.',
    casilla: 'Registrar como movimiento del mes',
  },
};

/** Pago a tarjeta, abono a deuda o aportación a meta. Crea un movimiento vinculado para no duplicar nada. */
export default function FormularioPago({ clase, item, mov, onListo }) {
  const { datos, guardarMov, borrarMov, guardarConfig, avisar } = useDatos();
  const editando = Boolean(mov);
  const t = TEXTOS[clase];
  const sugerido = clase === 'tarjeta' ? estadoTarjeta(datos, item).saldo : clase === 'deuda' ? Math.min(Number(item.pagoMensual) || 0, estadoDeuda(datos, item).saldo) : 0;
  const origenes = datos.formasPago.filter((f) => f.tipo !== 'Crédito' && f.nombre !== item.formaPago);
  const catsGasto = datos.categorias.filter((c) => c.tipo === 'Gasto');
  const catInicial = clase === 'deuda'
    ? (catsGasto.find((c) => /deuda/i.test(c.nombre)) || catsGasto.find((c) => c.grupo === 'Necesidad'))?.nombre
    : catsGasto.find((c) => c.grupo === 'Ahorro')?.nombre;

  const [monto, setMonto] = useState(mov ? String(mov.monto) : sugerido > 0 ? String(Math.round(sugerido * 100) / 100) : '');
  const [fecha, setFecha] = useState(mov?.fecha || hoyISO());
  const [origen, setOrigen] = useState(mov?.formaPago || origenes[0]?.nombre || datos.formasPago[0]?.nombre || '');
  const [categoria, setCategoria] = useState(mov?.tipo === 'Gasto' ? mov.categoria : catInicial || catsGasto[0]?.nombre || '');
  const [comoGasto, setComoGasto] = useState(mov ? mov.tipo === 'Gasto' : true);
  const [notas, setNotas] = useState(mov?.notas || '');

  const valor = parseFloat(monto);

  function guardar() {
    if (!(valor > 0)) return avisar('Escribe un importe mayor a cero.');
    if (valor >= 100000000) return avisar('El importe es demasiado grande. Revísalo.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return avisar('Elige una fecha válida.');
    const importe = Math.round(valor * 100) / 100;
    // Aportación sin movimiento: solo suma a lo ahorrado de la meta (como en la versión anterior)
    if (clase === 'meta' && !comoGasto && !editando) {
      guardarConfig('metas', datos.metas.map((m) => (m.id === item.id ? { ...m, ahorrado: (Number(m.ahorrado) || 0) + importe } : m)), 'Aportación guardada');
      return onListo?.();
    }
    const gasto = clase !== 'tarjeta' && comoGasto;
    if (gasto && !categoria) return avisar('Elige una categoría.');
    const nombre = { tarjeta: `Pago ${item.nombre}`, deuda: `Abono ${item.nombre}`, meta: `Aportación ${item.nombre}` }[clase];
    guardarMov({
      id: mov?.id || idVinculado(clase, item.id, nuevoId()), fecha,
      tipo: gasto ? 'Gasto' : 'Transferencia',
      categoria: gasto ? categoria : { tarjeta: 'Pago de tarjeta', deuda: 'Abono a deuda', meta: 'Ahorro' }[clase],
      subcategoria: '', descripcion: nombre, monto: importe, formaPago: origen, notas: notas.trim(),
    }, mov?.fecha, { tarjeta: 'Pago registrado', deuda: 'Abono registrado', meta: 'Aportación registrada' }[clase]);
    onListo?.();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">{t.ayuda}</p>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Importe" ayuda={sugerido > 0 && !editando ? `${clase === 'tarjeta' ? 'Saldo actual' : 'Pago mensual'}: ${dinero(sugerido)}` : null}>
          <input inputMode="decimal" autoFocus value={monto} onChange={(e) => setMonto(soloImporte(e.target.value))} placeholder="0.00" className={`${claseEntrada} cifra font-semibold`} />
        </Campo>
        <Campo etiqueta="Fecha"><input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className={claseEntrada} /></Campo>
      </div>
      <Campo etiqueta={clase === 'meta' ? 'De dónde sale el dinero' : 'Pagué desde'}>
        <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={claseEntrada}>
          {(origenes.length ? origenes : datos.formasPago).map((f) => <option key={f.nombre}>{f.nombre}</option>)}
        </select>
      </Campo>
      {t.casilla && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={comoGasto} onChange={(e) => setComoGasto(e.target.checked)} disabled={editando && clase === 'meta'} className="h-4 w-4 mt-0.5 accent-[var(--marca)]" />
          <span>{t.casilla}</span>
        </label>
      )}
      {clase !== 'tarjeta' && comoGasto && (
        <Campo etiqueta="Categoría">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={claseEntrada}>
            {catsGasto.map((c) => <option key={c.nombre}>{c.nombre}</option>)}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Nota (opcional)"><input value={notas} onChange={(e) => setNotas(e.target.value)} className={claseEntrada} /></Campo>
      <div className="flex items-center gap-2 pt-1">
        {editando && <BotonConfirmar tam="md" pregunta="¿Borrar?" onConfirmar={() => { borrarMov(mov); onListo?.(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>{editando ? 'Guardar cambios' : t.boton}</Boton>
      </div>
    </div>
  );
}
