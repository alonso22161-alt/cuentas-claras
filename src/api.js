// Comunicación con tu Apps Script. Si la conexión es "demo", todo se guarda solo en este dispositivo.
import { hoyISO, iso, mesActual, moverMes, diasDelMes, nuevoId } from './utils.js';

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

export function normalizar(d) {
  if (!d) return null;
  return {
    categorias: d.categorias || [], formasPago: d.formasPago || [], recurrentes: d.recurrentes || [],
    metas: d.metas || [], movimientos: d.movimientos || [], urlHoja: d.urlHoja || '',
  };
}

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
  if (accion === 'cargar') { aplicarFijos(d); escribir(K.demo, d); return structuredClone(d); }
  if (accion === 'guardarMovimiento') d.movimientos = d.movimientos.filter((m) => m.id !== datos.mov.id).concat(datos.mov);
  else if (accion === 'borrarMovimiento') d.movimientos = d.movimientos.filter((m) => m.id !== datos.id);
  else if (accion === 'guardarConfig') d[datos.clave] = datos.filas;
  escribir(K.demo, d);
  return true;
}
export const borrarDemo = () => localStorage.removeItem(K.demo);

function aplicarFijos(d) {
  const ym = mesActual();
  const hoy = Number(hoyISO().slice(8));
  d.recurrentes.filter((r) => r.activo && r.monto > 0).forEach((r) => {
    const dia = Math.min(Math.max(1, r.dia || 1), diasDelMes(ym));
    const id = `FIJO-${r.id}-${ym}`;
    if (dia > hoy || d.movimientos.some((m) => m.id === id)) return;
    d.movimientos.push({ id, fecha: `${ym}-${String(dia).padStart(2, '0')}`, tipo: r.tipo, categoria: r.categoria, descripcion: r.descripcion, monto: r.monto, formaPago: r.formaPago, notas: 'Gasto fijo automático' });
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
  return { categorias, formasPago, recurrentes, metas, movimientos, urlHoja: '' };
}
