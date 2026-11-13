// Cálculos que conectan los módulos: gastos fijos, tarjetas, deudas, metas, patrimonio, calendario y proyecciones.
// Todo se deriva de los movimientos, así que cualquier alta, edición o borrado se refleja en todas las pantallas.
import { diasDelMes, hoyISO, iso, mesActual, mesDe, moverMes, resumenMes, suma } from './utils.js';

export const FRECUENCIAS = ['Mensual', 'Quincenal', 'Semanal', 'Anual'];
const POR_MES = { Mensual: 1, Quincenal: 2, Semanal: 52 / 12, Anual: 1 / 12 };
const dos = (n) => String(n).padStart(2, '0');

/* ───────────── Movimientos vinculados ─────────────
   Los pagos de tarjeta, abonos a deudas y aportaciones a metas son movimientos normales
   cuyo ID empieza con TJ-, DE- o ME- seguido del ID de la tarjeta, deuda o meta. */

const PREFIJO = { tarjeta: 'TJ', deuda: 'DE', meta: 'ME' };
export const idVinculado = (clase, id, unico) => `${PREFIJO[clase]}-${id}-${unico}`;
export function vinculo(mov) {
  const m = /^(TJ|DE|ME)-([^-]+)-/.exec(String(mov.id));
  if (!m) return null;
  return { clase: { TJ: 'tarjeta', DE: 'deuda', ME: 'meta' }[m[1]], id: m[2] };
}
const vinculados = (datos, clase, id) => datos.movimientos.filter((m) => { const v = vinculo(m); return v && v.clase === clase && v.id === String(id); });
export const esFijo = (m) => String(m.id).startsWith('FIJO-');

/* ───────────── Gastos e ingresos fijos ───────────── */

export const equivalenteMensual = (f) => (Number(f.monto) || 0) * (POR_MES[f.frecuencia] ?? 1);

/** Fechas del mes en que toca un fijo. Debe coincidir con diasFijo_() en apps-script/Code.gs. */
export function ocurrencias(f, ym) {
  const dias = diasDelMes(ym);
  const dia = Math.min(Math.max(1, Number(f.dia) || 1), 31);
  const tope = (d) => Math.min(d, dias);
  let lista;
  const frecuencia = f.frecuencia || 'Mensual';
  if (frecuencia === 'Anual') lista = Number(ym.slice(5)) === (Number(f.mes) || 1) ? [tope(dia)] : [];
  else if (frecuencia === 'Quincenal') {
    const otro = dia <= 15 ? dia + 15 : dia - 15;
    lista = [...new Set([tope(Math.min(dia, otro)), tope(Math.max(dia, otro))])];
  } else if (frecuencia === 'Semanal') {
    lista = [];
    for (let d = ((dia - 1) % 7) + 1; d <= dias; d += 7) lista.push(d);
  } else lista = [tope(dia)];
  return lista.map((d, i) => ({ fecha: `${ym}-${dos(d)}`, id: `FIJO-${f.id}-${ym}${i ? `-${i + 1}` : ''}` }));
}

/** Cada vez que toca un fijo en el mes, con su estado. Pagado = existe el movimiento con ese ID. */
export function estadoFijos(datos, ym, tipo = 'Gasto') {
  const ids = new Set(datos.movimientos.map((m) => m.id));
  return datos.recurrentes
    .filter((f) => f.activo && f.tipo === tipo)
    .flatMap((f) => ocurrencias(f, ym).map((o) => ({ ...o, fijo: f, pagado: ids.has(o.id) })))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

/* ───────────── Fechas de pago ───────────── */

/** Fecha con ese día en el mes indicado, ajustada si el mes es más corto. */
export const fechaEnMes = (ym, dia) => `${ym}-${dos(Math.min(Math.max(1, Number(dia) || 1), diasDelMes(ym)))}`;

/** Próxima fecha (hoy incluido) que cae en ese día del mes. */
export function proximaFecha(dia, desde = hoyISO()) {
  const ym = mesDe(desde);
  const esta = fechaEnMes(ym, dia);
  return esta >= desde ? esta : fechaEnMes(moverMes(ym, 1), dia);
}

export function diasEntre(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function sumarDias(fecha, n) {
  const [y, m, d] = fecha.split('-').map(Number);
  return iso(new Date(y, m - 1, d + n));
}

/* ───────────── Tarjetas de crédito ─────────────
   Saldo = saldo registrado + compras con su forma de pago − pagos y devoluciones, desde la fecha del saldo.
   Un pago de tarjeta es una transferencia: las compras ya contaron como gasto el día que se hicieron. */

/** Mensualidad de una compra a meses. Con tasa 0 es "meses sin intereses". */
export function mensualidad(monto, tasaAnual, plazo) {
  const n = Math.max(1, Number(plazo) || 1), r = (Number(tasaAnual) || 0) / 100 / 12, m = Number(monto) || 0;
  return Math.round((r > 0 ? (m * r) / (1 - (1 + r) ** -n) : m / n) * 100) / 100;
}

/**
 * Estado de una compra a meses. Los pagos hechos son los que traía al registrarla más
 * una por cada fecha límite de pago de la tarjeta que ya pasó desde entonces.
 */
export function estadoPlan(t, p, hoy = hoyISO()) {
  const plazo = Math.max(1, Number(p.plazo) || 1);
  const mensual = Number(p.pagoMensual) || mensualidad(p.monto, p.tasa, plazo);
  const registro = p.fechaRegistro || hoy;
  let vencidos = 0;
  for (let ym = mesDe(registro), i = 0; i < 600; ym = moverMes(ym, 1), i++) {
    const vence = fechaEnMes(ym, t.diaPago);
    if (vence > hoy) break;
    if (vence > registro) vencidos++;
  }
  const hechos = Math.min(plazo, (Number(p.pagadosInicio) || 0) + vencidos);
  const pendientes = plazo - hechos;
  return {
    plan: p, plazo, mensual, hechos, pendientes, restante: mensual * pendientes, terminado: pendientes === 0,
    total: mensual * plazo, intereses: Math.max(0, mensual * plazo - (Number(p.monto) || 0)), avance: hechos / plazo,
  };
}

export function estadoTarjeta(datos, t) {
  const desde = t.fechaSaldo || '0000-00-00';
  const conTarjeta = datos.movimientos.filter((m) => m.formaPago === t.formaPago && m.fecha >= desde && vinculo(m)?.clase !== 'tarjeta');
  const cargos = suma(conTarjeta.filter((m) => m.tipo === 'Gasto'), (m) => m.monto);
  const devoluciones = suma(conTarjeta.filter((m) => m.tipo === 'Ingreso'), (m) => m.monto);
  const pagos = vinculados(datos, 'tarjeta', t.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const pagado = suma(pagos.filter((m) => m.fecha >= desde), (m) => m.monto);
  const bruto = (Number(t.saldo) || 0) + cargos - devoluciones - pagado;
  const saldo = Math.max(0, bruto);
  const limite = Number(t.limite) || 0;
  const hoy = hoyISO();
  const proximoPago = proximaFecha(t.diaPago, hoy);
  const proximoCorte = proximaFecha(t.diaCorte, hoy);
  const pagadoEsteMes = pagos.some((m) => mesDe(m.fecha) === mesDe(proximoPago) && m.fecha <= proximoPago);
  // Compras a meses: lo que aún no vence no se paga este mes
  const planes = (datos.mesesTarjeta || []).filter((p) => String(p.tarjeta) === String(t.id)).map((p) => estadoPlan(t, p, hoy));
  const activos = planes.filter((x) => !x.terminado);
  const aMeses = suma(activos, (x) => x.restante);
  const mensualidades = suma(activos, (x) => x.mensual);
  const pagoMes = Math.max(0, saldo - Math.max(0, aMeses - mensualidades));
  return {
    planes, aMeses, mensualidades, pagoMes,
    saldo, bruto, limite, disponible: Math.max(0, limite - saldo), utilizacion: limite > 0 ? saldo / limite : 0,
    cargos, pagos, proximoPago, proximoCorte, diasParaPago: diasEntre(hoy, proximoPago), pagadoEsteMes,
    compras: conTarjeta.filter((m) => m.tipo === 'Gasto').sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
  };
}

/* ───────────── Deudas ─────────────
   Saldo = saldo registrado − abonos desde la fecha del saldo. Los intereses no se suman solos:
   cuando el banco te dé un saldo nuevo, actualízalo en la deuda. */

export function estadoDeuda(datos, d) {
  const desde = d.fechaSaldo || '0000-00-00';
  const abonos = vinculados(datos, 'deuda', d.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const abonado = suma(abonos.filter((m) => m.fecha >= desde), (m) => m.monto);
  const inicial = Number(d.saldo) || 0;
  const bruto = inicial - abonado;
  const saldo = Math.max(0, bruto);
  const pago = Number(d.pagoMensual) || 0;
  const tasaMes = (Number(d.tasa) || 0) / 100 / 12;
  let mesesRestantes = null;
  if (saldo > 0 && pago > 0) {
    if (tasaMes > 0) mesesRestantes = pago > saldo * tasaMes ? Math.ceil(-Math.log(1 - (tasaMes * saldo) / pago) / Math.log(1 + tasaMes)) : Infinity;
    else mesesRestantes = Math.ceil(saldo / pago);
  }
  const proximoPago = proximaFecha(d.diaPago);
  return {
    saldo, bruto, inicial, abonado, abonos, avance: inicial > 0 ? Math.min(1, abonado / inicial) : 0, interesMes: saldo * tasaMes,
    mesesRestantes, proximoPago, diasParaPago: diasEntre(hoyISO(), proximoPago),
    pagadoEsteMes: abonos.some((m) => mesDe(m.fecha) === mesDe(proximoPago)),
  };
}

/**
 * Cuando escribes el saldo real de una tarjeta o deuda, calcula el saldo base a guardar para que,
 * con los movimientos ya registrados, el saldo actual quede exactamente en lo que escribiste.
 */
export function ajustarSaldo(datos, clase, item, saldoReal) {
  const estado = clase === 'tarjeta' ? estadoTarjeta : estadoDeuda;
  const base = item.fechaSaldo ? item : { ...item, saldo: 0, fechaSaldo: hoyISO() };
  const { bruto } = estado(datos, base);
  return { saldo: Math.round(((Number(base.saldo) || 0) + saldoReal - bruto) * 100) / 100, fechaSaldo: base.fechaSaldo };
}

/* ───────────── Metas ───────────── */

export function estadoMeta(datos, m) {
  const aportaciones = vinculados(datos, 'meta', m.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const ahorrado = (Number(m.ahorrado) || 0) + suma(aportaciones, (x) => x.monto);
  const meta = Number(m.meta) || 0;
  let porMes = null, mesesRestantes = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(m.fechaLimite || '')) {
    const [y, mm] = m.fechaLimite.split('-').map(Number);
    const [hy, hm] = hoyISO().split('-').map(Number);
    mesesRestantes = (y - hy) * 12 + (mm - hm);
    if (mesesRestantes > 0) porMes = Math.max(0, meta - ahorrado) / mesesRestantes;
  }
  return { ahorrado, meta, falta: Math.max(0, meta - ahorrado), avance: meta > 0 ? Math.min(1, ahorrado / meta) : 0, aportaciones, porMes, mesesRestantes };
}

/* ───────────── Patrimonio ───────────── */

export const TIPOS_ACTIVO = ['Cuenta bancaria', 'Efectivo', 'Inversión', 'Vehículo', 'Propiedad', 'Otro'];

export function patrimonio(datos) {
  const activos = suma(datos.activos, (a) => a.valor);
  const tarjetas = suma(datos.tarjetas, (t) => estadoTarjeta(datos, t).saldo);
  const deudas = suma(datos.deudas, (d) => estadoDeuda(datos, d).saldo);
  return { activos, tarjetas, deudas, pasivos: tarjetas + deudas, neto: activos - tarjetas - deudas };
}

/* ───────────── Calendario de compromisos ───────────── */

/** Todo lo que hay que pagar en el mes: gastos fijos, tarjetas y deudas. */
export function compromisos(datos, ym) {
  const lista = estadoFijos(datos, ym).map((o) => ({
    clave: o.id, fecha: o.fecha, nombre: o.fijo.descripcion, monto: o.fijo.monto, clase: 'Gasto fijo', pagado: o.pagado, ref: o,
  }));
  datos.tarjetas.forEach((t) => {
    const e = estadoTarjeta(datos, t);
    const fecha = fechaEnMes(ym, t.diaPago);
    const delMes = e.pagos.filter((m) => mesDe(m.fecha) === ym);
    const pagado = delMes.length > 0;
    if (e.saldo > 0 || pagado) lista.push({ clave: `tj-${t.id}-${ym}`, fecha, nombre: t.nombre, monto: pagado ? suma(delMes, (m) => m.monto) : e.pagoMes, clase: 'Tarjeta', pagado, ref: t });
  });
  datos.deudas.forEach((d) => {
    const e = estadoDeuda(datos, d);
    const fecha = fechaEnMes(ym, d.diaPago);
    const delMes = e.abonos.filter((m) => mesDe(m.fecha) === ym);
    const pagado = delMes.length > 0;
    const vigente = !d.fechaFin || fecha <= d.fechaFin;
    const monto = pagado ? suma(delMes, (m) => m.monto) : Math.min(Number(d.pagoMensual) || e.saldo, e.saldo);
    if ((e.saldo > 0 && vigente) || pagado) lista.push({ clave: `de-${d.id}-${ym}`, fecha, nombre: d.nombre, monto, clase: 'Deuda', pagado, ref: d });
  });
  return lista.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/** Compromisos pendientes de hoy a n días. */
export function proximosPagos(datos, n = 10) {
  const hoy = hoyISO();
  const fin = sumarDias(hoy, n);
  const meses = [...new Set([mesDe(hoy), mesDe(fin)])];
  return meses.flatMap((ym) => compromisos(datos, ym)).filter((c) => !c.pagado && c.fecha >= hoy && c.fecha <= fin);
}

/* ───────────── Quincenas ───────────── */

export function quincenas(datos, ym) {
  const r = resumenMes(datos, ym);
  const todos = compromisos(datos, ym);
  return [
    { nombre: 'Primera quincena', rango: 'Del 1 al 15', dentro: (f) => Number(f.slice(8)) <= 15 },
    { nombre: 'Segunda quincena', rango: `Del 16 al ${diasDelMes(ym)}`, dentro: (f) => Number(f.slice(8)) > 15 },
  ].map((q) => {
    const movs = r.movs.filter((m) => q.dentro(m.fecha));
    const ingresos = suma(movs.filter((m) => m.tipo === 'Ingreso'), (m) => m.monto);
    const gastos = suma(movs.filter((m) => m.tipo === 'Gasto'), (m) => m.monto);
    const lista = todos.filter((c) => q.dentro(c.fecha));
    // Lo pagado ya está en los gastos. Las tarjetas no se restan: sus compras ya contaron como gasto.
    const pendiente = suma(lista.filter((c) => !c.pagado && c.clase !== 'Tarjeta'), (c) => c.monto);
    const esperado = suma(estadoFijos(datos, ym, 'Ingreso').filter((o) => !o.pagado && q.dentro(o.fecha)), (o) => o.fijo.monto);
    return { ...q, movs, ingresos, gastos, balance: ingresos - gastos, compromisos: lista, pendiente, esperado, disponible: ingresos + esperado - gastos - pendiente };
  });
}

/* ───────────── Gastos extraordinarios ───────────── */

/** Gastos que superan por mucho lo normal de su categoría en los 6 meses previos. */
export function extraordinarios(datos, ym) {
  const desde = `${moverMes(ym, -6)}-01`;
  const previos = datos.movimientos.filter((m) => m.tipo === 'Gasto' && m.fecha >= desde && mesDe(m.fecha) < ym && !esFijo(m));
  const porCat = {};
  previos.forEach((m) => { (porCat[m.categoria] ||= []).push(m.monto); });
  const ids = new Set();
  datos.movimientos.filter((m) => m.tipo === 'Gasto' && mesDe(m.fecha) === ym && !esFijo(m) && !vinculo(m)).forEach((m) => {
    const lista = porCat[m.categoria];
    const promedio = lista?.length >= 3 ? suma(lista) / lista.length : null;
    if (m.monto >= 1000 && (promedio == null ? m.monto >= 5000 : m.monto >= promedio * 2.5)) ids.add(m.id);
  });
  return ids;
}

/* ───────────── Proyecciones ───────────── */

/** Promedios de los últimos 3 meses completos (sin contar el actual). */
export function basesProyeccion(datos) {
  const grupoDe = Object.fromEntries(datos.categorias.map((c) => [c.nombre, c.grupo]));
  const meses = [1, 2, 3].map((i) => moverMes(mesActual(), -i)).filter((ym) => datos.movimientos.some((m) => mesDe(m.fecha) === ym));
  const enMeses = (f) => (meses.length ? suma(meses, (ym) => suma(datos.movimientos.filter((m) => mesDe(m.fecha) === ym && f(m)), (m) => m.monto)) / meses.length : 0);
  return {
    meses: meses.length,
    // Solo lo que no es fijo, ni abono a deuda, ni ahorro: eso se proyecta por separado
    variables: enMeses((m) => m.tipo === 'Gasto' && !esFijo(m) && !vinculo(m) && grupoDe[m.categoria] !== 'Ahorro'),
    ingresosExtra: enMeses((m) => m.tipo === 'Ingreso' && !esFijo(m)),
  };
}

/** Proyección mes a mes. sim: { ingresos: %, gastos: %, extra: $ por mes (positivo = más ingreso) }. */
export function proyectar(datos, n = 12, sim = {}) {
  const base = basesProyeccion(datos);
  const fIng = 1 + (Number(sim.ingresos) || 0) / 100;
  const fGas = 1 + (Number(sim.gastos) || 0) / 100;
  const extra = Number(sim.extra) || 0;
  const saldos = Object.fromEntries(datos.deudas.map((d) => [d.id, estadoDeuda(datos, d).saldo]));
  let acumulado = 0;
  return Array.from({ length: n }, (_, i) => {
    const ym = moverMes(mesActual(), i + 1);
    const enMes = (tipo) => suma(datos.recurrentes.filter((f) => f.activo && f.tipo === tipo), (f) => f.monto * ocurrencias(f, ym).length);
    const ingresos = (enMes('Ingreso') + base.ingresosExtra) * fIng + Math.max(0, extra);
    const fijos = enMes('Gasto') * fGas;
    const variables = base.variables * fGas + Math.max(0, -extra);
    let deudas = 0;
    datos.deudas.forEach((d) => {
      const fecha = fechaEnMes(ym, d.diaPago);
      if (d.fechaFin && fecha > d.fechaFin) return;
      const tasa = (Number(d.tasa) || 0) / 100 / 12;
      const pago = Math.min(Number(d.pagoMensual) || 0, saldos[d.id] * (1 + tasa));
      saldos[d.id] = Math.max(0, saldos[d.id] * (1 + tasa) - pago);
      deudas += pago;
    });
    const neto = ingresos - fijos - variables - deudas;
    acumulado += neto;
    return { ym, ingresos, fijos, variables, deudas, neto, acumulado };
  });
}
