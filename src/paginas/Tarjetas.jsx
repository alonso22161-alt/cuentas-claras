import { useState } from 'react';
import { CalendarClock, CreditCard, Gauge, Plus, Wallet } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioPago from '../FormularioPago.jsx';
import { Barra, BotonConfirmar, Boton, Campo, Etiqueta, Hoja, Indicador, Panel, Rejilla, Vacio, claseEntrada, soloImporte } from '../ui.jsx';
import { dinero, dinero0, etiquetaDia, hoyISO, nuevoId, pct, suma } from '../utils.js';
import { ajustarSaldo, estadoPlan, estadoTarjeta, mensualidad } from '../finanzas.js';

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

const PLAZOS = [3, 6, 9, 12, 18, 24, 36, 48];

/** Compra a meses (con o sin intereses) dentro de una tarjeta. */
function FormularioMeses({ tarjeta, plan, onListo }) {
  const { datos, guardarConfig, guardarMov, avisar } = useDatos();
  const actual = plan ? estadoPlan(tarjeta, plan) : null;
  const catsGasto = datos.categorias.filter((c) => c.tipo === 'Gasto');
  const [f, setF] = useState(plan
    ? { ...plan, monto: String(plan.monto), plazo: String(plan.plazo), tasa: String(plan.tasa || ''), pagoMensual: String(plan.pagoMensual), hechos: String(actual.hechos) }
    : { id: '', descripcion: '', monto: '', plazo: '12', tasa: '', pagoMensual: '', hechos: '0' });
  const [mensualAMano, setMensualAMano] = useState(Boolean(plan));
  const [registrar, setRegistrar] = useState(!plan);
  const [categoria, setCategoria] = useState(catsGasto.find((c) => /compra|ropa|otros/i.test(c.nombre))?.nombre || catsGasto[0]?.nombre || '');
  const [fecha, setFecha] = useState(hoyISO());
  const calculada = mensualidad(f.monto, f.tasa, f.plazo);
  const mensual = mensualAMano ? parseFloat(f.pagoMensual) || 0 : calculada;
  const plazo = Number(f.plazo) || 0;
  const tasa = parseFloat(f.tasa) || 0;
  const cambiar = (k, v) => setF({ ...f, [k]: v });

  function guardar() {
    const descripcion = f.descripcion.trim();
    const monto = parseFloat(f.monto);
    const hechos = Number(f.hechos) || 0;
    if (!descripcion) return avisar('Escribe qué compraste.');
    if (!(monto > 0)) return avisar('Escribe el monto de la compra.');
    if (!(plazo >= 1 && plazo <= 120)) return avisar('El plazo debe estar entre 1 y 120 meses.');
    if (tasa < 0 || tasa > 300) return avisar('La tasa anual debe estar entre 0 y 300%.');
    if (!(mensual > 0)) return avisar('Revisa el pago mensual.');
    if (hechos > plazo) return avisar('Los pagos hechos no pueden ser más que el plazo.');
    // Si los pagos hechos no cambiaron, se conserva la fecha de registro para que sigan avanzando solos
    const mismaBase = plan && hechos === actual.hechos;
    const fila = {
      id: f.id || nuevoId(), tarjeta: tarjeta.id, descripcion, monto, plazo, tasa, pagoMensual: Math.round(mensual * 100) / 100,
      pagadosInicio: mismaBase ? plan.pagadosInicio : hechos, fechaRegistro: mismaBase ? plan.fechaRegistro : hoyISO(),
    };
    const lista = datos.mesesTarjeta || [];
    guardarConfig('mesesTarjeta', plan ? lista.map((x) => (x.id === plan.id ? fila : x)) : [...lista, fila], 'Compra a meses guardada');
    if (!plan && registrar) {
      guardarMov({ id: nuevoId(), fecha, tipo: 'Gasto', categoria, subcategoria: '', descripcion, monto, formaPago: tarjeta.formaPago, notas: `Compra a ${plazo} meses${tasa ? ` con ${tasa}% anual` : ' sin intereses'}` }, undefined, '');
    }
    onListo();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Qué compraste"><input value={f.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} placeholder="Ej. Laptop, refrigerador" className={claseEntrada} /></Campo>
        <Campo etiqueta="Monto de la compra"><input inputMode="decimal" value={f.monto} onChange={(e) => cambiar('monto', soloImporte(e.target.value))} className={claseEntrada} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Plazo (meses)">
          <input list="cc-plazos" inputMode="numeric" value={f.plazo} onChange={(e) => cambiar('plazo', e.target.value.replace(/\D/g, '').slice(0, 3))} className={claseEntrada} />
          <datalist id="cc-plazos">{PLAZOS.map((p) => <option key={p} value={p} />)}</datalist>
        </Campo>
        <Campo etiqueta="Tasa anual %" ayuda="Déjala en 0 si es sin intereses"><input inputMode="decimal" value={f.tasa} onChange={(e) => cambiar('tasa', soloImporte(e.target.value))} placeholder="0" className={claseEntrada} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Pago mensual" ayuda={mensualAMano ? <button type="button" className="text-marca" onClick={() => setMensualAMano(false)}>Usar el calculado ({dinero(calculada)})</button> : 'Calculado; puedes cambiarlo'}>
          <input inputMode="decimal" value={mensualAMano ? f.pagoMensual : calculada ? String(calculada) : ''} onChange={(e) => { setMensualAMano(true); cambiar('pagoMensual', soloImporte(e.target.value)); }} className={claseEntrada} />
        </Campo>
        <Campo etiqueta="Pagos ya hechos" ayuda={plazo ? `Quedan ${Math.max(0, plazo - (Number(f.hechos) || 0))} de ${plazo}` : null}>
          <input inputMode="numeric" value={f.hechos} onChange={(e) => cambiar('hechos', e.target.value.replace(/\D/g, '').slice(0, 3))} className={claseEntrada} />
        </Campo>
      </div>
      {mensual > 0 && plazo > 0 && (
        <p className="text-xs text-suave rounded-[10px] bg-hundido p-3">
          Pagarás {dinero(mensual * plazo)} en total{tasa > 0 ? `, de los cuales ${dinero(Math.max(0, mensual * plazo - (parseFloat(f.monto) || 0)))} son intereses` : ' sin intereses'}. Los pagos pendientes bajan solos cada fecha límite de pago de la tarjeta.
        </p>
      )}
      {!plan && (
        <div className="rounded-[10px] border border-linea p-3 space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={registrar} onChange={(e) => setRegistrar(e.target.checked)} className="h-4 w-4 mt-0.5 accent-[var(--marca)]" />
            <span>Registrar la compra como gasto con esta tarjeta<span className="block text-xs text-suave">Suma el monto al saldo de la tarjeta. Desmárcalo si la compra ya está incluida en el saldo.</span></span>
          </label>
          {registrar && (
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Categoría"><select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={claseEntrada}>{catsGasto.map((c) => <option key={c.nombre}>{c.nombre}</option>)}</select></Campo>
              <Campo etiqueta="Fecha de compra"><input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className={claseEntrada} /></Campo>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        {plan && <BotonConfirmar tam="md" pregunta="¿Borrar la compra a meses?" onConfirmar={() => { guardarConfig('mesesTarjeta', (datos.mesesTarjeta || []).filter((x) => x.id !== plan.id)); onListo(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>Guardar compra a meses</Boton>
      </div>
    </div>
  );
}

function ListaMeses({ planes, onEditar }) {
  const orden = [...planes].sort((a, b) => a.terminado - b.terminado);
  return (
    <ul className="mt-2 space-y-2">
      {orden.map((x) => (
        <li key={x.plan.id}>
          <button type="button" onClick={() => onEditar(x.plan)} className={`w-full text-left rounded-[10px] bg-hundido/70 hover:bg-hundido p-3 ${x.terminado ? 'opacity-55' : ''}`}>
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className="min-w-0"><b className="block text-sm truncate">{x.plan.descripcion}</b><span className="text-suave">{dinero0(x.plan.monto)} a {x.plazo} meses · </span><Etiqueta tono={Number(x.plan.tasa) ? 'aviso' : 'ingreso'}>{Number(x.plan.tasa) ? `${x.plan.tasa}% anual` : 'Sin intereses'}</Etiqueta></span>
              <span className="text-right shrink-0"><b className="cifra text-sm block">{dinero(x.mensual)}<span className="text-suave font-normal text-[11px]"> /mes</span></b><span className="text-suave">{x.terminado ? 'Liquidada' : `Faltan ${dinero0(x.restante)}`}</span></span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1"><Barra valor={x.hechos} tope={x.plazo} color="var(--ingreso)" alto="h-1.5" /></div>
              <span className="text-[11px] text-suave shrink-0">{x.hechos} de {x.plazo} pagos · {x.pendientes} pendientes</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Tarjetas() {
  const { datos } = useDatos();
  const [editando, setEditando] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [meses, setMeses] = useState(null);
  const lista = datos.tarjetas.map((t) => ({ t, e: estadoTarjeta(datos, t) }));
  const aMeses = suma(lista, (x) => x.e.aMeses);
  const deuda = suma(lista, (x) => x.e.saldo), limite = suma(lista, (x) => x.e.limite);
  const proxima = lista.filter((x) => x.e.saldo > 0 && !x.e.pagadoEsteMes).sort((a, b) => a.e.diasParaPago - b.e.diasParaPago)[0];

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <Rejilla className="grid-cols-2 xl:grid-cols-4">
          <Indicador etiqueta="Saldo utilizado" valor={dinero0(deuda)} tono={deuda > 0 ? 'gasto' : undefined} Icono={CreditCard} nota={aMeses > 0 ? `${dinero0(aMeses)} a meses` : `${lista.length} tarjetas`} />
          <Indicador etiqueta="Crédito disponible" valor={dinero0(Math.max(0, limite - deuda))} tono="ingreso" Icono={Wallet} nota={`De ${dinero0(limite)} de límite total`} />
          <Indicador etiqueta="Utilización" valor={pct(limite ? deuda / limite : 0)} Icono={Gauge} tono={limite && deuda / limite >= 0.7 ? 'gasto' : limite && deuda / limite >= 0.3 ? 'aviso' : undefined} nota="Recomendado: menos de 30%" />
          <Indicador etiqueta="Próximo pago" valor={proxima ? dinero0(proxima.e.pagoMes) : '—'} Icono={CalendarClock} nota={proxima ? `${proxima.t.nombre} · ${etiquetaDia(proxima.e.proximoPago)}` : 'Sin pagos pendientes'} notaTono={proxima && proxima.e.diasParaPago <= 5 ? 'gasto' : undefined} />
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
                <div className="mt-3 rounded-[10px] border border-linea p-3 flex items-center justify-between gap-3 text-xs">
                  <span><span className="block text-suave">Pago para no generar intereses</span>{e.aMeses > 0 && <span className="block text-suave">Incluye {dinero0(e.mensualidades)} de mensualidades · {dinero0(e.aMeses - e.mensualidades)} aún no vence</span>}{e.aMeses > e.saldo + 1 && <span className="block text-gasto">Lo pendiente a meses es mayor que el saldo: revisa el saldo de la tarjeta en Editar.</span>}</span>
                  <b className="cifra text-base shrink-0">{dinero(e.pagoMes)}</b>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs font-bold">Compras a meses{e.planes.length ? ` (${e.planes.filter((x) => !x.terminado).length} activas)` : ''}</p>
                  <Boton tam="sm" variante="texto" onClick={() => setMeses({ tarjeta: t })}><Plus size={13} />Compra a meses</Boton>
                </div>
                {e.planes.length === 0 ? <p className="text-[11px] text-suave">Sin compras a meses.</p> : <ListaMeses planes={e.planes} onEditar={(plan) => setMeses({ tarjeta: t, plan })} />}
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
      {meses && <Hoja titulo={meses.plan ? 'Editar compra a meses' : `Compra a meses · ${meses.tarjeta.nombre}`} onCerrar={() => setMeses(null)}><FormularioMeses tarjeta={meses.tarjeta} plan={meses.plan} onListo={() => setMeses(null)} /></Hoja>}
      {pagando && <Hoja titulo={`Pago a ${pagando.nombre}`} onCerrar={() => setPagando(null)}><FormularioPago clase="tarjeta" item={pagando} onListo={() => setPagando(null)} /></Hoja>}
    </div>
  );
}
