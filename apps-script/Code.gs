/**
 * CUENTAS CLARAS — backend en Google Apps Script
 * Este script vive dentro de tu hoja de cálculo y es el único que escribe en ella.
 * La app web le manda cada movimiento y él lo acomoda en la pestaña del mes (ej. "Nov-2026").
 *
 * Instalación: ver README.md del proyecto.
 */

// 1) CAMBIA ESTA CLAVE por una frase larga que solo tú conozcas (mínimo 12 caracteres).
//    Es la misma que escribirás en la app la primera vez que la abras.
const CLAVE = 'CAMBIA-ESTA-CLAVE';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ENC_MES = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Forma de pago', 'Notas', 'Registrado'];

const CONFIG = {
  categorias: {
    hoja: 'Categorías',
    enc: ['Nombre', 'Tipo', 'Grupo', 'Presupuesto mensual'],
    campos: ['nombre', 'tipo', 'grupo', 'presupuesto'],
    inicial: [
      ['Súper y despensa', 'Gasto', 'Necesidad', 0],
      ['Casa y renta', 'Gasto', 'Necesidad', 0],
      ['Servicios (luz, agua, internet)', 'Gasto', 'Necesidad', 0],
      ['Transporte y gasolina', 'Gasto', 'Necesidad', 0],
      ['Salud', 'Gasto', 'Necesidad', 0],
      ['Educación', 'Gasto', 'Necesidad', 0],
      ['Deudas y tarjetas', 'Gasto', 'Necesidad', 0],
      ['Restaurantes y cafés', 'Gasto', 'Gusto', 0],
      ['Entretenimiento', 'Gasto', 'Gusto', 0],
      ['Suscripciones', 'Gasto', 'Gusto', 0],
      ['Ropa y calzado', 'Gasto', 'Gusto', 0],
      ['Regalos', 'Gasto', 'Gusto', 0],
      ['Otros gastos', 'Gasto', 'Gusto', 0],
      ['Ahorro e inversión', 'Gasto', 'Ahorro', 0],
      ['Sueldo', 'Ingreso', '', 0],
      ['Ingresos extra', 'Ingreso', '', 0],
    ],
  },
  formasPago: {
    hoja: 'Formas de pago',
    enc: ['Nombre', 'Tipo'],
    campos: ['nombre', 'tipo'],
    inicial: [
      ['Efectivo', 'Efectivo'],
      ['Tarjeta de débito', 'Débito'],
      ['Tarjeta de crédito', 'Crédito'],
      ['Transferencia', 'Débito'],
    ],
  },
  recurrentes: {
    hoja: 'Gastos fijos',
    enc: ['ID', 'Descripción', 'Monto', 'Tipo', 'Categoría', 'Forma de pago', 'Día del mes', 'Activo'],
    campos: ['id', 'descripcion', 'monto', 'tipo', 'categoria', 'formaPago', 'dia', 'activo'],
    inicial: [],
  },
  metas: {
    hoja: 'Metas',
    enc: ['ID', 'Nombre', 'Meta', 'Ahorrado', 'Fecha límite'],
    campos: ['id', 'nombre', 'meta', 'ahorrado', 'fechaLimite'],
    inicial: [],
  },
};

const CAMPOS_NUMERO = ['presupuesto', 'monto', 'dia', 'meta', 'ahorrado'];

/* ───────────── Menú e instalación ───────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cuentas Claras').addItem('Preparar hoja', 'instalar').addToUi();
}

/** Crea las pestañas de configuración y la del mes actual. Se puede correr varias veces sin dañar nada. */
function instalar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CONFIG).forEach(function (clave) { hojaConfig_(ss, clave); });
  hojaMes_(ss, hoyTexto_(ss).slice(0, 7), true);
  const sobrante = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (sobrante && sobrante.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sobrante);
  Logger.log('Hoja lista. Ahora implementa el script como aplicación web (ver README).');
}

/* ───────────── Entradas web ───────────── */

function doGet() {
  return ContentService.createTextOutput('Cuentas Claras está funcionando. Copia esta dirección en la app.');
}

function doPost(e) {
  let salida;
  try {
    const pedido = JSON.parse(e.postData.contents);
    if (CLAVE === 'CAMBIA-ESTA-CLAVE' || CLAVE.length < 12) {
      throw new Error('Falta definir tu clave en Code.gs (mínimo 12 caracteres) y volver a implementar.');
    }
    if (pedido.clave !== CLAVE) throw new Error('Clave incorrecta.');

    const candado = LockService.getScriptLock();
    candado.waitLock(20000);
    try {
      salida = { ok: true, datos: atender_(pedido.accion, pedido.datos || {}) };
    } finally {
      candado.releaseLock();
    }
  } catch (err) {
    salida = { ok: false, error: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

function atender_(accion, datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  switch (accion) {
    case 'cargar':
      aplicarRecurrentes_(ss);
      return {
        categorias: leerConfig_(ss, 'categorias'),
        formasPago: leerConfig_(ss, 'formasPago'),
        recurrentes: leerConfig_(ss, 'recurrentes'),
        metas: leerConfig_(ss, 'metas'),
        movimientos: leerMovimientos_(ss),
        urlHoja: ss.getUrl(),
      };
    case 'guardarMovimiento':
      guardarMovimiento_(ss, datos.mov, datos.fechaOriginal);
      return true;
    case 'borrarMovimiento':
      borrarMovimiento_(ss, datos.id, datos.fecha);
      return true;
    case 'guardarConfig':
      escribirConfig_(ss, datos.clave, datos.filas || []);
      return true;
    default:
      throw new Error('Acción desconocida: ' + accion);
  }
}

/* ───────────── Pestañas de configuración ───────────── */

function hojaConfig_(ss, clave) {
  const def = CONFIG[clave];
  if (!def) throw new Error('Configuración desconocida: ' + clave);
  let hoja = ss.getSheetByName(def.hoja);
  if (!hoja) {
    hoja = ss.insertSheet(def.hoja, ss.getSheets().length);
    hoja.getRange(1, 1, 1, def.enc.length).setValues([def.enc]);
    if (def.inicial.length) hoja.getRange(2, 1, def.inicial.length, def.enc.length).setValues(def.inicial);
    formatoEncabezado_(hoja, def.enc.length);
    hoja.setTabColor('#5C7170');
  }
  return hoja;
}

function leerConfig_(ss, clave) {
  const def = CONFIG[clave];
  const hoja = hojaConfig_(ss, clave);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  const tz = ss.getSpreadsheetTimeZone();
  return hoja.getRange(2, 1, ultima - 1, def.campos.length).getValues()
    .filter(function (f) { return String(f[0]) !== ''; })
    .map(function (f) {
      const o = {};
      def.campos.forEach(function (campo, i) {
        let v = f[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        if (campo === 'activo') v = String(v).toLowerCase() !== 'no';
        else if (CAMPOS_NUMERO.indexOf(campo) >= 0) v = Number(v) || 0;
        else v = String(v);
        o[campo] = v;
      });
      return o;
    });
}

function escribirConfig_(ss, clave, filas) {
  const def = CONFIG[clave];
  const hoja = hojaConfig_(ss, clave);
  const ultima = hoja.getLastRow();
  if (ultima > 1) hoja.getRange(2, 1, ultima - 1, def.campos.length).clearContent();
  if (!filas.length) return;
  const valores = filas.map(function (o) {
    return def.campos.map(function (campo) {
      const v = o[campo];
      if (campo === 'activo') return v === false ? 'No' : 'Sí';
      if (CAMPOS_NUMERO.indexOf(campo) >= 0) return Number(v) || 0;
      return v == null ? '' : String(v);
    });
  });
  const rango = hoja.getRange(2, 1, valores.length, def.campos.length);
  if (clave === 'metas') hoja.getRange(2, 5, valores.length, 1).setNumberFormat('@'); // fecha límite como texto
  rango.setValues(valores);
}

/* ───────────── Pestañas por mes ───────────── */

function nombreMes_(ym) {
  const p = ym.split('-');
  return MESES[Number(p[1]) - 1] + '-' + p[0];
}

function hojaMes_(ss, ym, crear) {
  const nombre = nombreMes_(ym);
  let hoja = ss.getSheetByName(nombre);
  if (!hoja && crear) {
    hoja = ss.insertSheet(nombre, 0); // la más reciente queda primero
    hoja.getRange(1, 1, 1, ENC_MES.length).setValues([ENC_MES]);
    formatoEncabezado_(hoja, ENC_MES.length);
    hoja.getRange('B:B').setNumberFormat('dd/mm/yyyy');
    hoja.getRange('F:F').setNumberFormat('$#,##0.00');
    hoja.getRange('I:I').setNumberFormat('dd/mm/yyyy hh:mm');
    hoja.hideColumns(1);
    hoja.setColumnWidth(4, 190);
    hoja.setColumnWidth(5, 240);
    hoja.setColumnWidth(7, 150);
    hoja.setColumnWidth(8, 200);
    hoja.setTabColor('#0F4C4A');
    // Resumen del mes en la fila 1, a la derecha de la tabla
    hoja.getRange('K1:P1').setValues([['Ingresos', 0, 'Gastos', 0, 'Balance', 0]]).setFontWeight('bold');
    hoja.getRange('L1').setNumberFormat('$#,##0.00');
    hoja.getRange('N1').setNumberFormat('$#,##0.00');
    hoja.getRange('P1').setNumberFormat('$#,##0.00');
  }
  return hoja;
}

function formatoEncabezado_(hoja, columnas) {
  hoja.getRange(1, 1, 1, columnas).setFontWeight('bold').setBackground('#0F4C4A').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

function fechaDesdeTexto_(texto) {
  const p = String(texto).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0); // mediodía: evita brincos de día por zona horaria
}

function hoyTexto_(ss) {
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

function buscarFila_(hoja, id) {
  if (!hoja) return 0;
  const ultima = hoja.getLastRow();
  if (ultima < 2) return 0;
  const ids = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function leerMovimientos_(ss) {
  const tz = ss.getSpreadsheetTimeZone();
  const patron = new RegExp('^(' + MESES.join('|') + ')-\\d{4}$');
  const lista = [];
  ss.getSheets().forEach(function (hoja) {
    if (!patron.test(hoja.getName())) return;
    const ultima = hoja.getLastRow();
    if (ultima < 2) return;
    hoja.getRange(2, 1, ultima - 1, 8).getValues().forEach(function (f) {
      if (String(f[0]) === '') return;
      const fecha = f[1] instanceof Date ? Utilities.formatDate(f[1], tz, 'yyyy-MM-dd') : String(f[1]);
      lista.push({
        id: String(f[0]), fecha: fecha, tipo: String(f[2]), categoria: String(f[3]),
        descripcion: String(f[4]), monto: Number(f[5]) || 0, formaPago: String(f[6]), notas: String(f[7]),
      });
    });
  });
  return lista;
}

function validarMovimiento_(mov) {
  if (!mov || !mov.id) throw new Error('Movimiento sin identificador.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(mov.fecha))) throw new Error('Fecha inválida.');
  if (!(Number(mov.monto) > 0)) throw new Error('El monto debe ser mayor a cero.');
  if (mov.tipo !== 'Gasto' && mov.tipo !== 'Ingreso') throw new Error('Tipo inválido.');
}

function guardarMovimiento_(ss, mov, fechaOriginal) {
  validarMovimiento_(mov);
  const ymNuevo = mov.fecha.slice(0, 7);
  const ymViejo = String(fechaOriginal || mov.fecha).slice(0, 7);
  if (ymViejo !== ymNuevo) {
    const vieja = hojaMes_(ss, ymViejo, false);
    const filaVieja = buscarFila_(vieja, mov.id);
    if (filaVieja) { vieja.deleteRow(filaVieja); actualizarResumen_(vieja); }
  }
  const hoja = hojaMes_(ss, ymNuevo, true);
  const valores = [mov.id, fechaDesdeTexto_(mov.fecha), mov.tipo, mov.categoria || '', mov.descripcion || '',
    Number(mov.monto), mov.formaPago || '', mov.notas || ''];
  const fila = buscarFila_(hoja, mov.id);
  if (fila) hoja.getRange(fila, 1, 1, 8).setValues([valores]);
  else hoja.appendRow(valores.concat([new Date()]));
  const ultima = hoja.getLastRow();
  if (ultima > 2) hoja.getRange(2, 1, ultima - 1, ENC_MES.length).sort([{ column: 2, ascending: true }, { column: 9, ascending: true }]);
  actualizarResumen_(hoja);
}

function borrarMovimiento_(ss, id, fecha) {
  const hoja = hojaMes_(ss, String(fecha).slice(0, 7), false);
  const fila = buscarFila_(hoja, id);
  if (fila) { hoja.deleteRow(fila); actualizarResumen_(hoja); }
}

function actualizarResumen_(hoja) {
  let ingresos = 0, gastos = 0;
  const ultima = hoja.getLastRow();
  if (ultima > 1) {
    hoja.getRange(2, 3, ultima - 1, 4).getValues().forEach(function (f) {
      if (f[0] === 'Ingreso') ingresos += Number(f[3]) || 0;
      else if (f[0] === 'Gasto') gastos += Number(f[3]) || 0;
    });
  }
  hoja.getRange('L1').setValue(ingresos);
  hoja.getRange('N1').setValue(gastos);
  hoja.getRange('P1').setValue(ingresos - gastos);
}

/* ───────────── Gastos fijos ───────────── */

/** Registra en el mes actual los gastos fijos cuyo día ya llegó. Usa un ID fijo por mes para no duplicar. */
function aplicarRecurrentes_(ss) {
  const fijos = leerConfig_(ss, 'recurrentes').filter(function (r) { return r.activo && r.monto > 0; });
  if (!fijos.length) return;
  const hoy = hoyTexto_(ss);
  const ym = hoy.slice(0, 7);
  const diaHoy = Number(hoy.slice(8, 10));
  const partes = ym.split('-');
  const diasDelMes = new Date(Number(partes[0]), Number(partes[1]), 0).getDate();
  const hoja = hojaMes_(ss, ym, true);
  fijos.forEach(function (r) {
    const dia = Math.min(Math.max(1, r.dia || 1), diasDelMes);
    if (dia > diaHoy) return;
    const id = 'FIJO-' + r.id + '-' + ym;
    if (buscarFila_(hoja, id)) return;
    guardarMovimiento_(ss, {
      id: id, fecha: ym + '-' + ('0' + dia).slice(-2), tipo: r.tipo === 'Ingreso' ? 'Ingreso' : 'Gasto',
      categoria: r.categoria, descripcion: r.descripcion, monto: r.monto, formaPago: r.formaPago, notas: 'Gasto fijo automático',
    });
  });
}
