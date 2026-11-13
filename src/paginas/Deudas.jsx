import { useState } from 'react';
import { CalendarClock, Landmark, Percent, Plus, Receipt } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioPago from '../FormularioPago.jsx';
import { Barra, BotonConfirmar, Boton, Campo, Etiqueta, Hoja, Indicador, Panel, Rejilla, Vacio, claseEntrada, soloImporte } from '../ui.jsx';
import { dinero, dinero0, etiquetaDia, nuevoId, pct, suma } from '../utils.js';
import { ajustarSaldo, estadoDeuda } from '../finanzas.js';

function FormularioDeuda({ deuda, onListo }) {
  const { datos, guardarConfig, avisar } = useDatos();
  const actual = deuda ? estadoDeuda(datos, deuda).saldo : 0;
  const [f, setF] = useState(deuda
    ? { ...deuda, saldoReal: String(Math.round(actual * 100) / 100), pagoMensual: String(deuda.pagoMensual), tasa: String(deuda.tasa || '') }
    : { id: '', nombre: '', acreedor: '', saldoReal: '', pagoMensual: '', tasa: '', diaPago: '', fechaFin: '' });

  function guardar() {
    const nombre = f.nombre.trim();
    if (!nombre) return avisar('Escribe el concepto de la deuda.');
    const saldoReal = parseFloat(f.saldoReal);
    if (!(saldoReal >= 0) || f.saldoReal === '') return avisar('Escribe el saldo pendiente.');
    const dp = Number(f.diaPago);
    if (!(dp >= 1 && dp <= 31)) return avisar('El día de pago debe estar entre 1 y 31.');
    const tasa = parseFloat(f.tasa) || 0;
    if (tasa < 0 || tasa > 300) return avisar('La tasa anual debe estar entre 0 y 300%.');
    const base = { ...f, id: f.id || nuevoId(), nombre, acreedor: f.acreedor.trim(), pagoMensual: parseFloat(f.pagoMensual) || 0, tasa, diaPago: dp };
    delete base.saldoReal;
    const fila = !deuda || Math.abs(saldoReal - actual) >= 0.01 ? { ...base, ...ajustarSaldo(datos, 'deuda', deuda ? base : { ...base, fechaSaldo: '' }, saldoReal) } : base;
    guardarConfig('deudas', f.id ? datos.deudas.map((d) => (d.id === f.id ? fila : d)) : [...datos.deudas, fila], 'Deuda guardada');
    onListo();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Concepto"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Crédito automotriz" className={claseEntrada} /></Campo>
        <Campo etiqueta="Acreedor o institución"><input value={f.acreedor} onChange={(e) => setF({ ...f, acreedor: e.target.value })} placeholder="Ej. Banorte" className={claseEntrada} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Saldo pendiente hoy" ayuda={deuda ? 'Cámbialo si tu banco te da un saldo distinto' : null}><input inputMode="decimal" value={f.saldoReal} onChange={(e) => setF({ ...f, saldoReal: soloImporte(e.target.value) })} className={claseEntrada} /></Campo>
        <Campo etiqueta="Pago mensual"><input inputMode="decimal" value={f.pagoMensual} onChange={(e) => setF({ ...f, pagoMensual: soloImporte(e.target.value) })} className={claseEntrada} /></Campo>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo etiqueta="Tasa anual %"><input inputMode="decimal" value={f.tasa} onChange={(e) => setF({ ...f, tasa: soloImporte(e.target.value) })} placeholder="0" className={claseEntrada} /></Campo>
        <Campo etiqueta="Día de pago"><input inputMode="numeric" value={f.diaPago} onChange={(e) => setF({ ...f, diaPago: e.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="1 a 31" className={claseEntrada} /></Campo>
        <Campo etiqueta="Vencimiento"><input type="date" value={f.fechaFin || ''} onChange={(e) => setF({ ...f, fechaFin: e.target.value })} className={claseEntrada} /></Campo>
      </div>
      <div className="flex items-center gap-2 pt-2">
        {f.id && <BotonConfirmar tam="md" pregunta="¿Borrar la deuda?" onConfirmar={() => { guardarConfig('deudas', datos.deudas.filter((d) => d.id !== f.id)); onListo(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>Guardar deuda</Boton>
      </div>
    </div>
  );
}

export default function Deudas() {
  const { datos } = useDatos();
  const [editando, setEditando] = useState(null);
  const [abonando, setAbonando] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const lista = datos.deudas.map((d) => ({ d, e: estadoDeuda(datos, d) }));
  const total = suma(lista, (x) => x.e.saldo);
  const activas = lista.filter((x) => x.e.saldo > 0);
  const proxima = activas.filter((x) => !x.e.pagadoEsteMes).sort((a, b) => a.e.diasParaPago - b.e.diasParaPago)[0];

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <Rejilla className="grid-cols-2 xl:grid-cols-4">
          <Indicador etiqueta="Saldo pendiente" valor={dinero0(total)} tono={total > 0 ? 'gasto' : undefined} Icono={Landmark} nota={`${activas.length} deudas activas`} />
          <Indicador etiqueta="Pagos mensuales" valor={dinero0(suma(activas, (x) => Number(x.d.pagoMensual) || 0))} Icono={Receipt} nota="Compromiso de cada mes" />
          <Indicador etiqueta="Interés estimado al mes" valor={dinero0(suma(activas, (x) => x.e.interesMes))} Icono={Percent} nota="Según la tasa anual registrada" />
          <Indicador etiqueta="Próximo abono" valor={proxima ? dinero0(Math.min(Number(proxima.d.pagoMensual) || proxima.e.saldo, proxima.e.saldo)) : '—'} Icono={CalendarClock} nota={proxima ? `${proxima.d.nombre} · ${etiquetaDia(proxima.e.proximoPago)}` : 'Sin abonos pendientes'} notaTono={proxima && proxima.e.diasParaPago <= 5 ? 'gasto' : undefined} />
        </Rejilla>
      )}

      <Panel titulo="Deudas y créditos" subtitulo="Registra saldos pendientes y da seguimiento a tus abonos" accion={<Boton onClick={() => setEditando({})}><Plus size={15} />Agregar deuda</Boton>}>
        {lista.length === 0 ? (
          <Vacio titulo="Sin deudas registradas">Préstamos personales, crédito automotriz, hipoteca o lo que debas a alguien. El saldo baja con cada abono que registres.</Vacio>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {lista.map(({ d, e }) => (
              <div key={d.id} className="border border-linea rounded-xl p-4 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="font-bold text-sm truncate">{d.nombre}</p><p className="text-xs text-suave truncate">{d.acreedor || 'Sin acreedor'}{d.fechaFin ? ` · Vence ${etiquetaDia(d.fechaFin)}` : ''}</p></div>
                  {e.saldo <= 0 ? <Etiqueta tono="ingreso">Liquidada</Etiqueta> : e.pagadoEsteMes ? <Etiqueta tono="ingreso">Abono del mes hecho</Etiqueta> : <Etiqueta tono={e.diasParaPago <= 5 ? 'gasto' : 'neutro'}>{e.diasParaPago === 0 ? 'Pago hoy' : `Pago en ${e.diasParaPago} días`}</Etiqueta>}
                </div>
                <div className="flex justify-between text-xs mt-4 mb-1.5"><span className="text-suave">Pagado desde el registro</span><b className="cifra">{pct(e.avance)}</b></div>
                <Barra valor={e.abonado} tope={e.inicial} color="var(--ingreso)" alto="h-[9px]" />
                <dl className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div><dt className="text-suave">Saldo</dt><dd className="cifra font-bold text-sm text-gasto">{dinero0(e.saldo)}</dd></div>
                  <div><dt className="text-suave">Pago mensual</dt><dd className="cifra font-bold text-sm">{dinero0(d.pagoMensual)}</dd></div>
                  <div><dt className="text-suave">Tasa anual</dt><dd className="cifra font-bold text-sm">{Number(d.tasa) ? `${d.tasa}%` : '—'}</dd></div>
                  <div><dt className="text-suave">Abonado</dt><dd className="cifra font-semibold">{dinero0(e.abonado)}</dd></div>
                  <div><dt className="text-suave">Interés al mes</dt><dd className="cifra font-semibold">{dinero0(e.interesMes)}</dd></div>
                  <div><dt className="text-suave">Terminas en</dt><dd className="font-semibold">{e.mesesRestantes == null ? '—' : e.mesesRestantes === Infinity ? 'El pago no cubre el interés' : `${e.mesesRestantes} meses`}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-1 mt-4 -ml-1">
                  <Boton tam="sm" variante="secundario" onClick={() => setAbonando(d)} disabled={e.saldo <= 0}>Registrar abono</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setAbierta(abierta === d.id ? null : d.id)}>Historial ({e.abonos.length})</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setEditando(d)}>Editar</Boton>
                </div>
                {abierta === d.id && (
                  <ul className="mt-3 border-t border-linea pt-2 space-y-1.5 text-xs">
                    {e.abonos.length === 0 && <li className="text-suave">Sin abonos registrados.</li>}
                    {e.abonos.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="text-suave first-letter:uppercase">{etiquetaDia(m.fecha)} · {m.tipo === 'Gasto' ? 'Contado como gasto' : 'Transferencia'}</span><b className="cifra">{dinero(m.monto)}</b></li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-suave mt-4">El saldo baja automáticamente con cada abono. Los intereses no se suman solos: cuando tu banco te dé un saldo nuevo, actualízalo en Editar.</p>
      </Panel>

      {editando && <Hoja titulo={editando.id ? 'Editar deuda' : 'Nueva deuda'} onCerrar={() => setEditando(null)}><FormularioDeuda deuda={editando.id ? editando : null} onListo={() => setEditando(null)} /></Hoja>}
      {abonando && <Hoja titulo={`Abono a ${abonando.nombre}`} onCerrar={() => setAbonando(null)}><FormularioPago clase="deuda" item={abonando} onListo={() => setAbonando(null)} /></Hoja>}
    </div>
  );
}
