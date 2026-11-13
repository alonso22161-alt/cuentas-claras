export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const dos = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const hoyISO = () => iso(new Date());
export const mesActual = () => hoyISO().slice(0, 7);
export const mesDe = (fecha) => String(fecha).slice(0, 7);

export function moverMes(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}`;
}
export const etiquetaMes = (ym) => { const [y, m] = ym.split('-'); return `${MESES[+m - 1]} ${y}`; };
export const etiquetaMesLarga = (ym) => { const [y, m] = ym.split('-'); return `${MESES_LARGOS[+m - 1]} de ${y}`; };
export const diasDelMes = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };

export function etiquetaDia(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  if (fecha === hoyISO()) return 'Hoy';
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  if (fecha === iso(ayer)) return 'Ayer';
  return `${DIAS[f.getDay()]} ${d} de ${MESES_LARGOS[m - 1]}`;
}

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const fmt0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
export const dinero = (n) => fmt.format(n || 0);
export const dinero0 = (n) => fmt0.format(n || 0);
export const pct = (n) => `${Math.round((n || 0) * 100)}%`;
export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const suma = (lista, f = (x) => x) => lista.reduce((t, x) => t + (Number(f(x)) || 0), 0);

export const PALETA = ['#0F766E', '#B3264E', '#C98A1B', '#3B6FB6', '#7A4EA3', '#2E9D6A', '#D2603A', '#5A6B7B', '#A3327C', '#4C9AA8', '#8A7A2E', '#6C5CE7', '#C0507A', '#3E8E41'];
export function colorDe(nombre, categorias) {
  const i = categorias.findIndex((c) => c.nombre === nombre);
  return PALETA[(i < 0 ? PALETA.length - 1 : i) % PALETA.length];
}

/** Totales de un mes. "Ahorro" son los gastos en categorías del grupo Ahorro (dinero que apartas, no que pierdes). */
export function resumenMes(datos, ym) {
  const movs = datos.movimientos.filter((m) => mesDe(m.fecha) === ym);
  const grupoDe = Object.fromEntries(datos.categorias.map((c) => [c.nombre, c.grupo]));
  const tipoPago = Object.fromEntries(datos.formasPago.map((f) => [f.nombre, f.tipo]));
  const gastosMovs = movs.filter((m) => m.tipo === 'Gasto');
  const ingresos = suma(movs.filter((m) => m.tipo === 'Ingreso'), (m) => m.monto);
  const gastos = suma(gastosMovs, (m) => m.monto);
  const apartado = suma(gastosMovs.filter((m) => grupoDe[m.categoria] === 'Ahorro'), (m) => m.monto);
  const consumo = gastos - apartado;
  const agrupar = (clave) => {
    const o = {};
    gastosMovs.forEach((m) => { const k = clave(m) || 'Sin clasificar'; o[k] = (o[k] || 0) + m.monto; });
    return Object.entries(o).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);
  };
  return {
    movs, ingresos, gastos, apartado, consumo,
    balance: ingresos - gastos,
    tasaAhorro: ingresos > 0 ? (ingresos - consumo) / ingresos : 0,
    porCategoria: agrupar((m) => m.categoria),
    porForma: agrupar((m) => m.formaPago),
    porGrupo: agrupar((m) => grupoDe[m.categoria] || 'Gusto'),
    aCredito: suma(gastosMovs.filter((m) => tipoPago[m.formaPago] === 'Crédito'), (m) => m.monto),
  };
}

/** Promedio mensual de gasto por categoría en los n meses anteriores a ym (solo meses con movimientos). */
export function promedioPrevio(datos, ym, n = 3) {
  const meses = [];
  for (let i = 1; i <= n; i++) {
    const r = resumenMes(datos, moverMes(ym, -i));
    if (r.movs.length) meses.push(r);
  }
  const porCat = {};
  meses.forEach((r) => r.porCategoria.forEach((c) => { porCat[c.nombre] = (porCat[c.nombre] || 0) + c.total / meses.length; }));
  return {
    meses: meses.length, porCat,
    consumo: meses.length ? suma(meses, (r) => r.consumo) / meses.length : 0,
    ingresos: meses.length ? suma(meses, (r) => r.ingresos) / meses.length : 0,
  };
}

const PISTAS = [
  ['súper', ['walmart', 'soriana', 'chedraui', 'costco', 'sams', "sam's", 'heb', 'super', 'súper', 'despensa', 'mercado', 'bodega aurrera', 'la comer']],
  ['restaurante', ['restaurante', 'tacos', 'café', 'cafe', 'starbucks', 'comida', 'cena', 'desayuno', 'pizza', 'sushi', 'rappi', 'uber eats', 'didi food', 'oxxo', 'hamburguesa']],
  ['transporte', ['gasolina', 'uber', 'didi', 'taxi', 'caseta', 'estacionamiento', 'camión', 'camion', 'verificación', 'llanta', 'mecánico']],
  ['servicios', ['cfe', 'luz', 'agua', 'siapa', 'telmex', 'izzi', 'totalplay', 'megacable', 'internet', 'gas', 'telcel', 'celular']],
  ['suscripcion', ['netflix', 'spotify', 'disney', 'hbo', 'max', 'prime', 'youtube', 'icloud', 'google one', 'claude', 'chatgpt', 'suscripción']],
  ['salud', ['farmacia', 'doctor', 'médico', 'medico', 'dentista', 'consulta', 'medicina', 'laboratorio', 'hospital']],
  ['entretenimiento', ['cine', 'cinépolis', 'cinepolis', 'concierto', 'boleto', 'juego', 'bar', 'antro']],
  ['casa', ['renta', 'hipoteca', 'mantenimiento', 'predial']],
  ['ropa', ['ropa', 'zapatos', 'tenis', 'zara', 'liverpool', 'cklass']],
  ['educaci', ['colegiatura', 'curso', 'libro', 'escuela']],
  ['sueldo', ['sueldo', 'nómina', 'nomina', 'quincena', 'salario']],
];

/** Sugiere categoría: primero por lo que tú ya capturaste con esa descripción, luego por palabras conocidas. */
export function sugerirCategoria(descripcion, tipo, datos) {
  const t = descripcion.trim().toLowerCase();
  if (t.length < 3) return null;
  const validas = datos.categorias.filter((c) => c.tipo === tipo).map((c) => c.nombre);
  const previos = datos.movimientos
    .filter((m) => m.tipo === tipo && m.descripcion && validas.includes(m.categoria))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const igual = previos.find((m) => m.descripcion.toLowerCase() === t) || previos.find((m) => m.descripcion.toLowerCase().startsWith(t));
  if (igual) return igual.categoria;
  for (const [raiz, palabras] of PISTAS) {
    if (palabras.some((p) => t.includes(p))) {
      const cat = validas.find((n) => n.toLowerCase().includes(raiz));
      if (cat) return cat;
    }
  }
  return null;
}

export function descargarCSV(movimientos) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Forma de pago', 'Notas']]
    .concat([...movimientos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((m) => [m.fecha, m.tipo, m.categoria, m.descripcion, m.monto, m.formaPago, m.notas]));
  const blob = new Blob(['\ufeff' + filas.map((f) => f.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cuentas-claras-${hoyISO()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
