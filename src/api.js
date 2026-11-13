// Comunicación con tu Apps Script. Si la conexión es "demo", todo se guarda solo en este dispositivo.
import { hoyISO, mesActual, moverMes, diasDelMes, nuevoId } from './utils.js';
import { ocurrencias } from './finanzas.js';

const K = { conexion: 'cc_conexion', cache: 'cc_cache', cola: 'cc_cola', demo: 'cc_demo' };

const leer = (k, def = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento lleno o bloqueado */ } };

export const leerConexion = () => leer(K.conexion);
export const guardarConexion = (c) => escribir(K.conexion, c);
export function borrarConexion() { [K.conexion, K.cache, K.cola].forEach((k) => localStorage.removeItem(k)); }
export const leerCache = () => normalizar(leer(K.cache));
export const guardarCache = (d) => escribir(K.cache, d);
export const leerCola = () => leer(K.cola, []);
export const encolar = (op) => escribir(K.cola, [...leerCola(), op]);

/** Completa los campos que no existían en versiones anteriores, para que los datos viejos sigan funcionando. */
export function normalizar(d) {
  if (!d) return null;
  return {
    version: Number(d.version) || 1,
    categorias: (d.categorias || []).map((c) => ({ ...c, subcategorias: c.subcategorias || '' })),
    formasPago: d.formasPago || [],
    recurrentes: (d.recurrentes || []).map((r) => ({
      ...r, frecuencia: r.frecuencia || 'Mensual', mes: Number(r.mes) || 1, automatico: r.automatico !== false,
    })),
    metas: d.metas || [],
    tarjetas: d.tarjetas || [],
    deudas: d.deudas || [],
    activos: d.activos || [],
    historialPatrimonio: d.historialPatrimonio || [],
    preferencias: d.preferencias || [],
    movimientos: (d.movimientos || []).map((m) => ({ ...m, subcategoria: m.subcategoria || '' })),
    urlHoja: d.urlHoja || '',
  };
}

/** Claves de configuración que solo existen desde la versión 2 del script. */
export const CLAVES_V2 = ['tarjetas', 'deudas', 'activos', 'historialPatrimonio', 'preferencias'];
export const VERSION_SCRIPT = 2;

export async function llamar(accion, datos, conexion = leerConexion()) {
  if (!conexion) throw new Error('Falta conectar tu hoja.');
  if (conexion.demo) return demo(accion, datos);
  let resp;
  try {
    // text/plain evita la verificación previa (CORS) que Apps Script no responde
    resp = await fetch(conexion.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ clave: conexion.clave, accion, datos }),
      redirect: 'follow',
    });
  } catch {
    const e = new Error('Sin conexión a internet.');
    e.sinRed = true;
    throw e;
  }
  let json;
  try { json = await resp.json(); } catch { throw new Error('La dirección no respondió como se esperaba. Revisa que sea la de tu aplicación web (termina en /exec) y que el acceso sea "Cualquier usuario".'); }
  if (!json.ok) throw new Error(json.error || 'Error desconocido.');
  return json.datos;
}

/** Envía lo que quedó pendiente cuando no había internet. */
export async function enviarCola() {
  let cola = leerCola();
  while (cola.length) {
    try { await llamar(cola[0].accion, cola[0].datos); }
    catch (e) { if (e.sinRed) throw e; /* si el servidor lo rechazó, se descarta para no atorar la cola */ }
    cola = cola.slice(1);
    escribir(K.cola, cola);
  }
}

/* ───────────── Modo de ejemplo (sin Google) ───────────── */

function demo(accion, datos) {
  const d = leer(K.demo) || sembrar();
  if (!d.version) Object.assign(d, sembrarV2(d)); // datos de ejemplo creados con la versión anterior
  if (accion === 'cargar') { aplicarFijos(d); escribir(K.demo, d); return structuredClone(d); }
  if (accion === 'guardarMovimiento') d.movimientos = d.movimientos.filter((m) => m.id !== datos.mov.id).concat(datos.mov);
  else if (accion === 'guardarMovimientos') {
    const ids = new Set(datos.movs.map((m) => m.id));
    d.movimientos = d.movimientos.filter((m) => !ids.has(m.id)).concat(datos.movs);
  }
  else if (accion === 'borrarMovimiento') d.movimientos = d.movimientos.filter((m) => m.id !== datos.id);
  else if (accion === 'guardarConfig') d[datos.clave] = datos.filas;
  escribir(K.demo, d);
  return true;
}
export const borrarDemo = () => localStorage.removeItem(K.demo);

// Igual que aplicarRecurrentes_() en Code.gs
function aplicarFijos(d) {
  const ym = mesActual();
  const hoy = hoyISO();
  d.recurrentes.filter((r) => r.activo && r.automatico !== false && r.monto > 0).forEach((r) => {
    ocurrencias(r, ym).forEach((o) => {
      if (o.fecha > hoy || d.movimientos.some((m) => m.id === o.id)) return;
      d.movimientos.push({ id: o.id, fecha: o.fecha, tipo: r.tipo, categoria: r.categoria, subcategoria: '', descripcion: r.descripcion, monto: r.monto, formaPago: r.formaPago, notas: r.tipo === 'Ingreso' ? 'Ingreso fijo automático' : 'Gasto fijo automático' });
    });
  });
}

function sembrar() {
  const categorias = [
    ['Súper y despensa', 'Gasto', 'Necesidad', 6500], ['Casa y renta', 'Gasto', 'Necesidad', 9500],
    ['Servicios (luz, agua, internet)', 'Gasto', 'Necesidad', 1800], ['Transporte y gasolina', 'Gasto', 'Necesidad', 3000],
    ['Salud', 'Gasto', 'Necesidad', 0], ['Educación', 'Gasto', 'Necesidad', 0], ['Deudas y tarjetas', 'Gasto', 'Necesidad', 0],
    ['Restaurantes y cafés', 'Gasto', 'Gusto', 2500], ['Entretenimiento', 'Gasto', 'Gusto', 1200],
    ['Suscripciones', 'Gasto', 'Gusto', 700], ['Ropa y calzado', 'Gasto', 'Gusto', 0], ['Regalos', 'Gasto', 'Gusto', 0],
    ['Otros gastos', 'Gasto', 'Gusto', 0], ['Ahorro e inversión', 'Gasto', 'Ahorro', 0],
    ['Sueldo', 'Ingreso', '', 0], ['Ingresos extra', 'Ingreso', '', 0],
  ].map(([nombre, tipo, grupo, presupuesto]) => ({ nombre, tipo, grupo, presupuesto }));
  const formasPago = [['Efectivo', 'Efectivo'], ['Tarjeta de débito', 'Débito'], ['Tarjeta de crédito', 'Crédito'], ['Transferencia', 'Débito']]
    .map(([nombre, tipo]) => ({ nombre, tipo }));
  const recurrentes = [
    { id: 'r1', descripcion: 'Renta', monto: 9500, tipo: 'Gasto', categoria: 'Casa y renta', formaPago: 'Transferencia', dia: 1, activo: true },
    { id: 'r2', descripcion: 'Internet', monto: 599, tipo: 'Gasto', categoria: 'Servicios (luz, agua, internet)', formaPago: 'Tarjeta de crédito', dia: 5, activo: true },
    { id: 'r3', descripcion: 'Netflix', monto: 249, tipo: 'Gasto', categoria: 'Suscripciones', formaPago: 'Tarjeta de crédito', dia: 8, activo: true },
  ];
  const metas = [{ id: 'm1', nombre: 'Fondo de emergencia', meta: 90000, ahorrado: 31500, fechaLimite: `${new Date().getFullYear() + 1}-06-30` }];

  // Generador con semilla fija: los datos de ejemplo siempre son los mismos
  let s = 7;
  const azar = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const entre = (a, b) => Math.round(a + azar() * (b - a));
  const variados = [
    ['Walmart', 'Súper y despensa', 700, 1900, 'Tarjeta de débito', 4], ['Tianguis', 'Súper y despensa', 150, 400, 'Efectivo', 3],
    ['Gasolina', 'Transporte y gasolina', 500, 900, 'Tarjeta de crédito', 3], ['Uber', 'Transporte y gasolina', 60, 180, 'Tarjeta de crédito', 3],
    ['Tacos', 'Restaurantes y cafés', 90, 260, 'Efectivo', 5], ['Café', 'Restaurantes y cafés', 55, 110, 'Tarjeta de débito', 6],
    ['Cena con amigos', 'Restaurantes y cafés', 350, 800, 'Tarjeta de crédito', 2], ['Oxxo', 'Restaurantes y cafés', 35, 120, 'Efectivo', 6],
    ['Cine', 'Entretenimiento', 180, 420, 'Tarjeta de crédito', 1], ['Farmacia', 'Salud', 120, 600, 'Tarjeta de débito', 1],
    ['CFE', 'Servicios (luz, agua, internet)', 380, 720, 'Transferencia', 1], ['Spotify', 'Suscripciones', 129, 129, 'Tarjeta de crédito', 1],
  ];
  const movimientos = [];
  const hoy = hoyISO();
  for (let i = 3; i >= 0; i--) {
    const ym = moverMes(mesActual(), -i);
    const dias = diasDelMes(ym);
    const fecha = (dia) => `${ym}-${String(Math.min(dia, dias)).padStart(2, '0')}`;
    const agregar = (m) => { if (m.fecha <= hoy) movimientos.push({ id: nuevoId() + movimientos.length, notas: '', ...m }); };
    agregar({ fecha: fecha(15), tipo: 'Ingreso', categoria: 'Sueldo', descripcion: 'Quincena', monto: 17500, formaPago: 'Transferencia' });
    agregar({ fecha: fecha(dias), tipo: 'Ingreso', categoria: 'Sueldo', descripcion: 'Quincena', monto: 17500, formaPago: 'Transferencia' });
    if (i > 0) recurrentes.forEach((r) => agregar({ id: `FIJO-${r.id}-${ym}`, fecha: fecha(r.dia), tipo: r.tipo, categoria: r.categoria, descripcion: r.descripcion, monto: r.monto, formaPago: r.formaPago, notas: 'Gasto fijo automático' }));
    variados.forEach(([descripcion, categoria, min, max, formaPago, veces]) => {
      const n = categoria === 'Restaurantes y cafés' && i === 0 ? veces + 2 : veces;
      for (let k = 0; k < n; k++) agregar({ fecha: fecha(entre(1, dias)), tipo: 'Gasto', categoria, descripcion, monto: entre(min, max), formaPago });
    });
    agregar({ fecha: fecha(16), tipo: 'Gasto', categoria: 'Ahorro e inversión', descripcion: 'Cetes', monto: 2500, formaPago: 'Transferencia' });
  }
  return { categorias, formasPago, metas, urlHoja: '', ...sembrarV2({ movimientos, recurrentes }) };
}

/** Tarjetas, deudas, patrimonio y preferencias de ejemplo. */
function sembrarV2(d) {
  const hace = (n) => moverMes(mesActual(), -n);
  const historialPatrimonio = [3, 2, 1].map((n, i) => ({ mes: hace(n), activos: 168000 + i * 6500, pasivos: 64000 - i * 3800, neto: 104000 + i * 10300 }));
  return {
    version: 2,
    recurrentes: (d.recurrentes || []).map((r) => ({ frecuencia: 'Mensual', mes: 1, automatico: true, ...r })),
    tarjetas: [{ id: 't1', nombre: 'BBVA Azul', banco: 'BBVA', formaPago: 'Tarjeta de crédito', limite: 40000, saldo: 6200, fechaSaldo: `${hace(1)}-20`, diaCorte: 20, diaPago: 10 }],
    deudas: [{ id: 'd1', nombre: 'Crédito automotriz', acreedor: 'Banorte', saldo: 58000, fechaSaldo: `${hace(2)}-01`, pagoMensual: 4200, tasa: 13.5, diaPago: 12, fechaFin: `${new Date().getFullYear() + 1}-12-12` }],
    activos: [
      { id: 'a1', nombre: 'Cuenta de nómina', tipo: 'Cuenta bancaria', valor: 24500, fecha: hoyISO() },
      { id: 'a2', nombre: 'Cetes', tipo: 'Inversión', valor: 38000, fecha: hoyISO() },
      { id: 'a3', nombre: 'Auto', tipo: 'Vehículo', valor: 125000, fecha: hoyISO() },
    ],
    historialPatrimonio,
    preferencias: [{ clave: 'moneda', valor: 'MXN' }],
    movimientos: (d.movimientos || []).concat(
      [2, 1].map((n) => ({ id: `DE-d1-ej${n}`, fecha: `${hace(n - 1)}-12` <= hoyISO() ? `${hace(n - 1)}-12` : `${hace(n)}-12`, tipo: 'Gasto', categoria: 'Deudas y tarjetas', subcategoria: '', descripcion: 'Abono Crédito automotriz', monto: 4200, formaPago: 'Transferencia', notas: '' })),
      [{ id: 'TJ-t1-ej1', fecha: `${hace(0)}-10` <= hoyISO() ? `${hace(0)}-10` : `${hace(1)}-10`, tipo: 'Transferencia', categoria: 'Pago de tarjeta', subcategoria: '', descripcion: 'Pago BBVA Azul', monto: 5000, formaPago: 'Transferencia', notas: '' }],
    ),
  };
}
