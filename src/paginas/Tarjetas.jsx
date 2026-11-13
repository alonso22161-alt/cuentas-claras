import { useState } from 'react';
import { CalendarClock, CreditCard, Gauge, Plus, Wallet } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioPago from '../FormularioPago.jsx';
import { Barra, BotonConfirmar, Boton, Campo, Etiqueta, Hoja, Indicador, Panel, Rejilla, Vacio, claseEntrada, soloImporte } from '../ui.jsx';
import { dinero, dinero0, etiquetaDia, nuevoId, pct, suma } from '../utils.js';
import { ajustarSaldo, estadoTarjeta } from '../finanzas.js';

const NUEVA = '__nueva__';
const colorUso = (u) => (u >= 0.7 ? 'var(--gasto)' : u >= 0.3 ? 'var(--aviso)' : 'var(--ingreso)');
const dia = (v) => String(v).replace(/\D/g, '').slice(0, 2);

function FormularioTarjeta({ tarjeta, onListo }) {
  const { datos, guardarConfig, avisar } = useDatos();
  const actual = tarjeta ? estadoTarjeta(datos, tarjeta).saldo : 0;
  const credito = datos.formasPago.filter((f) => f.tipo === 'Crédito');
  const [f, setF] = useState(tarjeta
    ? { ...tarjeta, limite: String(tarjeta.limite), saldoReal: String(Math.round(actual * 100) / 100) }
    : { id: '', nombre: '', banco: '', formaPago: NUEVA, limite: '', saldoReal: '', diaCorte: '', diaPago: '' });

  async function guardar() {
    const nombre = f.nombre.trim();
    if (!nombre) return avisar('Escribe el nombre de la tarjeta.');
    if (!(parseFloat(f.limite) > 0)) return avisar('El límite de crédito debe ser mayor a cero.');
    const dc = Number(f.diaCorte), dp = Number(f.diaPago);
    if (!(dc >= 1 && dc <= 31) || !(dp >= 1 && dp <= 31)) return avisar('Los días de corte y de pago deben estar entre 1 y 31.');
    let formaPago = f.formaPago;
    if (formaPago === NUEVA) {
      formaPago = nombre;
      if (!datos.formasPago.some((x) => x.nombre.toLowerCase() === nombre.toLowerCase())) {
        await guardarConfig('formasPago', [...datos.formasPago, { nombre, tipo: 'Crédito' }], '');
      }
    }
    if (datos.tarjetas.some((t) => t.formaPago === formaPago && t.id !== f.id)) return avisar('Esa forma de pago ya está vinculada a otra tarjeta.');
    const saldoReal = parseFloat(f.saldoReal) || 0;
    const base = { ...f, id: f.id || nuevoId(), nombre, banco: f.banco.trim(), formaPago, limite: parseFloat(f.limite), diaCorte: dc, diaPago: dp };
    delete base.saldoReal;
    const cambioSaldo = !tarjeta || tarjeta.formaPago !== formaPago || Math.abs(saldoReal - actual) >= 0.01;
    const fila = cambioSaldo ? { ...base, ...ajustarSaldo(datos, 'tarjeta', tarjeta && tarjeta.formaPago === formaPago ? base : { ...base, fechaSaldo: '' }, saldoReal) } : base;
    guardarConfig('tarjetas', f.id ? datos.tarjetas.map((t) => (t.id === f.id ? fila : t)) : [...datos.tarjetas, fila], 'Tarjeta guardada');
    onListo();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombre de la tarjeta"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. BBVA Azul" className={claseEntrada} /></Campo>
        <Campo etiqueta="Banco"><input value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} placeholder="Ej. BBVA" className={claseEntrada} /></Campo>
      </div>
      <Campo etiqueta="Forma de pago vinculada" ayuda="Las compras que registres con esta forma de pago suben el saldo de la tarjeta.">
        <select value={f.formaPago} onChange={(e) => setF({ ...f, formaPago: e.target.value })} className={claseEntrada}>
          <option value={NUEVA}>Crear una con el nombre de la tarjeta</option>
          {credito.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Límite de crédito"><input inputMode="decimal" value={f.limite} onChange={(e) => setF({ ...f, limite: soloImporte(e.target.value) })} className={claseEntrada} /></Campo>
        <Campo etiqueta="Saldo utilizado hoy" ayuda={tarjeta ? 'Cámbialo solo si no coincide con tu banco' : 'Lo que debes según tu banco'}><input inputMode="decimal" value={f.saldoReal} onChange={(e) => setF({ ...f, saldoReal: soloImporte(e.target.value) })} placeholder="0" className={claseEntrada} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Día de corte"><input inputMode="numeric" value={f.diaCorte} onChange={(e) => setF({ ...f, diaCorte: dia(e.target.value) })} placeholder="1 a 31" className={claseEntrada} /></Campo>
        <Campo etiqueta="Día límite de pago"><input inputMode="numeric" value={f.diaPago} onChange={(e) => setF({ ...f, diaPago: dia(e.target.value) })} placeholder="1 a 31" className={claseEntrada} /></Campo>
      </div>
      <div className="flex items-center gap-2 pt-2">
        {f.id && <BotonConfirmar tam="md" pregunta="¿Borrar la tarjeta?" onConfirmar={() => { guardarConfig('tarjetas', datos.tarjetas.filter((t) => t.id !== f.id)); onListo(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>Guardar tarjeta</Boton>
      </div>
    </div>
  );
}

export default function Tarjetas() {
  const { datos } = useDatos();
  const [editando, setEditando] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const lista = datos.tarjetas.map((t) => ({ t, e: estadoTarjeta(datos, t) }));
  const deuda = suma(lista, (x) => x.e.saldo), limite = suma(lista, (x) => x.e.limite);
  const proxima = lista.filter((x) => x.e.saldo > 0 && !x.e.pagadoEsteMes).sort((a, b) => a.e.diasParaPago - b.e.diasParaPago)[0];

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <Rejilla className="grid-cols-2 xl:grid-cols-4">
          <Indicador etiqueta="Saldo utilizado" valor={dinero0(deuda)} tono={deuda > 0 ? 'gasto' : undefined} Icono={CreditCard} nota={`${lista.length} tarjetas`} />
          <Indicador etiqueta="Crédito disponible" valor={dinero0(Math.max(0, limite - deuda))} tono="ingreso" Icono={Wallet} nota={`De ${dinero0(limite)} de límite total`} />
          <Indicador etiqueta="Utilización" valor={pct(limite ? deuda / limite : 0)} Icono={Gauge} tono={limite && deuda / limite >= 0.7 ? 'gasto' : limite && deuda / limite >= 0.3 ? 'aviso' : undefined} nota="Recomendado: menos de 30%" />
          <Indicador etiqueta="Próximo pago" valor={proxima ? dinero0(proxima.e.saldo) : '—'} Icono={CalendarClock} nota={proxima ? `${proxima.t.nombre} · ${etiquetaDia(proxima.e.proximoPago)}` : 'Sin pagos pendientes'} notaTono={proxima && proxima.e.diasParaPago <= 5 ? 'gasto' : undefined} />
        </Rejilla>
      )}

      <Panel titulo="Tarjetas de crédito" subtitulo="Controla límite, saldo utilizado y fechas de corte y pago" accion={<Boton onClick={() => setEditando({})}><Plus size={15} />Agregar tarjeta</Boton>}>
        {lista.length === 0 ? (
          <Vacio titulo="Todavía no registras tarjetas">Agrega tus tarjetas para ver su saldo, crédito disponible y recibir alertas antes de la fecha límite de pago.</Vacio>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {lista.map(({ t, e }) => (
              <div key={t.id} className="border border-linea rounded-xl p-4 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-14 rounded-lg shrink-0 bg-[linear-gradient(135deg,#2b3242,#4a5368)] grid place-items-end p-1.5"><span className="h-2 w-4 rounded-sm bg-[#e8c27a]" /></span>
                    <div className="min-w-0"><p className="font-bold text-sm truncate">{t.nombre}</p><p className="text-xs text-suave truncate">{t.banco || 'Sin banco'} · {t.formaPago}</p></div>
                  </div>
                  {e.saldo <= 0 ? <Etiqueta tono="ingreso">Sin saldo</Etiqueta> : e.pagadoEsteMes ? <Etiqueta tono="ingreso">Pago registrado</Etiqueta> : <Etiqueta tono={e.diasParaPago <= 5 ? 'gasto' : 'neutro'}>{e.diasParaPago === 0 ? 'Vence hoy' : `Vence en ${e.diasParaPago} días`}</Etiqueta>}
                </div>
                <div className="flex justify-between text-xs mt-4 mb-1.5"><span className="text-suave">Utilización</span><b className="cifra" style={{ color: colorUso(e.utilizacion) }}>{pct(e.utilizacion)}</b></div>
                <Barra valor={e.saldo} tope={e.limite} color={colorUso(e.utilizacion)} alto="h-[9px]" />
                <dl className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div><dt className="text-suave">Saldo</dt><dd className="cifra font-bold text-sm">{dinero0(e.saldo)}</dd></div>
                  <div><dt className="text-suave">Disponible</dt><dd className="cifra font-bold text-sm text-ingreso">{dinero0(e.disponible)}</dd></div>
                  <div><dt className="text-suave">Límite</dt><dd className="cifra font-bold text-sm">{dinero0(e.limite)}</dd></div>
                  <div><dt className="text-suave">Corte</dt><dd className="font-semibold">Día {t.diaCorte}</dd></div>
                  <div className="col-span-2"><dt className="text-suave">Fecha límite de pago</dt><dd className="font-semibold first-letter:uppercase">{etiquetaDia(e.proximoPago)}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-1 mt-4 -ml-1">
                  <Boton tam="sm" variante="secundario" onClick={() => setPagando(t)}>Registrar pago</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setAbierta(abierta === t.id ? null : t.id)}>Historial</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setEditando(t)}>Editar</Boton>
                </div>
                {abierta === t.id && (
                  <div className="mt-3 border-t border-linea pt-3 grid sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-semibold mb-1.5">Pagos</p>
                      {e.pagos.length === 0 ? <p className="text-suave">Sin pagos registrados.</p> : <ul className="space-y-1">{e.pagos.slice(0, 8).map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="text-suave first-letter:uppercase">{etiquetaDia(m.fecha)}</span><b className="cifra text-ingreso">{dinero(m.monto)}</b></li>)}</ul>}
                    </div>
                    <div>
                      <p className="font-semibold mb-1.5">Compras recientes</p>
                      {e.compras.length === 0 ? <p className="text-suave">Sin compras desde el saldo registrado.</p> : <ul className="space-y-1">{e.compras.slice(0, 8).map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="truncate">{m.descripcion || m.categoria}</span><b className="cifra">{dinero(m.monto)}</b></li>)}</ul>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-suave mt-4">El saldo se actualiza solo: suben las compras registradas con la forma de pago de la tarjeta y bajan los pagos. Los pagos son transferencias y no cuentan como gasto, porque las compras ya contaron el día que las hiciste.</p>
      </Panel>

      {editando && <Hoja titulo={editando.id ? 'Editar tarjeta' : 'Nueva tarjeta'} onCerrar={() => setEditando(null)}><FormularioTarjeta tarjeta={editando.id ? editando : null} onListo={() => setEditando(null)} /></Hoja>}
      {pagando && <Hoja titulo={`Pago a ${pagando.nombre}`} onCerrar={() => setPagando(null)}><FormularioPago clase="tarjeta" item={pagando} onListo={() => setPagando(null)} /></Hoja>}
    </div>
  );
}
