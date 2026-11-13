/**
 * MICONTROL — backend en Google Apps Script
 * Este script vive dentro de tu hoja de cálculo y es el único que escribe en ella.
 * La app web le manda cada movimiento y él lo acomoda en la pestaña del mes (ej. "Nov-2026").
 *
 * Instalación: ver README.md del proyecto.
 * Si actualizas desde una versión anterior: pega este archivo completo, vuelve a poner tu clave
 * y publica una nueva versión (Implementar > Administrar implementaciones > lápiz > Nueva versión).
 * Tus datos no se borran; las pestañas nuevas se crean solas.
 */

// 1) CAMBIA ESTA CLAVE por una frase larga que solo tú conozcas (mínimo 12 caracteres).
//    Es la misma que escribirás en la app la primera vez que la abras.
const CLAVE = 'CAMBIA-ESTA-CLAVE';

// La app compara este número para saber si el script ya tiene las funciones nuevas.
const VERSION = 3;

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ENC_MES = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Forma de pago', 'Notas', 'Registrado', 'Subcategoría'];
const TIPOS = ['Gasto', 'Ingreso', 'Transferencia'];

const CONFIG = {
  categorias: {
    hoja: 'Categorías',
    enc: ['Nombre', 'Tipo', 'Grupo', 'Presupuesto mensual', 'Subcategorías'],
    campos: ['nombre', 'tipo', 'grupo', 'presupuesto', 'subcategorias'],
    inicial: [
      ['Súper y despensa', 'Gasto', 'Necesidad', 0, ''],
      ['Casa y renta', 'Gasto', 'Necesidad', 0, ''],
      ['Servicios (luz, agua, internet)', 'Gasto', 'Necesidad', 0, 'Luz, Agua, Internet, Gas, Celular'],
      ['Transporte y gasolina', 'Gasto', 'Necesidad', 0, 'Gasolina, Apps de transporte, Mantenimiento'],
      ['Salud', 'Gasto', 'Necesidad', 0, ''],
      ['Educación', 'Gasto', 'Necesidad', 0, ''],
      ['Deudas y tarjetas', 'Gasto', 'Necesidad', 0, ''],
      ['Restaurantes y cafés', 'Gasto', 'Gusto', 0, ''],
      ['Entretenimiento', 'Gasto', 'Gusto', 0, ''],
      ['Suscripciones', 'Gasto', 'Gusto', 0, ''],
      ['Ropa y calzado', 'Gasto', 'Gusto', 0, ''],
      ['Regalos', 'Gasto', 'Gusto', 0, ''],
      ['Otros gastos', 'Gasto', 'Gusto', 0, ''],
      ['Ahorro e inversión', 'Gasto', 'Ahorro', 0, ''],
      ['Sueldo', 'Ingreso', '', 0, ''],
      ['Bonos y comisiones', 'Ingreso', '', 0, ''],
      ['Ingresos extra', 'Ingreso', '', 0, ''],
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
    enc: ['ID', 'Descripción', 'Monto', 'Tipo', 'Categoría', 'Forma de pago', 'Día del mes', 'Activo', 'Frecuencia', 'Mes (si es anual)', 'Registro automático'],
    campos: ['id', 'descripcion', 'monto', 'tipo', 'categoria', 'formaPago', 'dia', 'activo', 'frecuencia', 'mes', 'automatico'],
    inicial: [],
  },
  metas: {
    hoja: 'Metas',
    enc: ['ID', 'Nombre', 'Meta', 'Ahorrado', 'Fecha límite'],
    campos: ['id', 'nombre', 'meta', 'ahorrado', 'fechaLimite'],
    texto: ['fechaLimite'],
    inicial: [],
  },
  tarjetas: {
    hoja: 'Tarjetas',
    enc: ['ID', 'Nombre', 'Banco', 'Forma de pago', 'Límite', 'Saldo registrado', 'Fecha del saldo', 'Día de corte', 'Día límite de pago'],
    campos: ['id', 'nombre', 'banco', 'formaPago', 'limite', 'saldo', 'fechaSaldo', 'diaCorte', 'diaPago'],
    texto: ['fechaSaldo'],
    inicial: [],
  },
  deudas: {
    hoja: 'Deudas',
    enc: ['ID', 'Nombre', 'Acreedor', 'Saldo registrado', 'Fecha del saldo', 'Pago mensual', 'Tasa anual %', 'Día de pago', 'Fecha de término'],
    campos: ['id', 'nombre', 'acreedor', 'saldo', 'fechaSaldo', 'pagoMensual', 'tasa', 'diaPago', 'fechaFin'],
    texto: ['fechaSaldo', 'fechaFin'],
    inicial: [],
  },
  mesesTarjeta: {
    hoja: 'Compras a meses',
    enc: ['ID', 'Tarjeta (ID)', 'Descripción', 'Monto', 'Plazo (meses)', 'Pagos hechos al registrar', 'Fecha de registro', 'Tasa anual %', 'Pago mensual'],
    campos: ['id', 'tarjeta', 'descripcion', 'monto', 'plazo', 'pagadosInicio', 'fechaRegistro', 'tasa', 'pagoMensual'],
    texto: ['tarjeta', 'fechaRegistro'],
    inicial: [],
  },
  activos: {
    hoja: 'Patrimonio',
    enc: ['ID', 'Nombre', 'Tipo', 'Valor', 'Actualizado'],
    campos: ['id', 'nombre', 'tipo', 'valor', 'fecha'],
    texto: ['fecha'],
    inicial: [],
  },
  historialPatrimonio: {
    hoja: 'Historial patrimonio',
    enc: ['Mes', 'Activos', 'Pasivos', 'Patrimonio neto'],
    campos: ['mes', 'activos', 'pasivos', 'neto'],
    texto: ['mes'],
    inicial: [],
  },
  preferencias: {
    hoja: 'Preferencias',
    enc: ['Clave', 'Valor'],
    campos: ['clave', 'valor'],
    texto: ['valor'],
    inicial: [['moneda', 'MXN']],
  },
};

const CAMPOS_NUMERO = ['presupuesto', 'monto', 'dia', 'meta', 'ahorrado', 'mes', 'limite', 'saldo', 'diaCorte', 'diaPago',
  'pagoMensual', 'tasa', 'valor', 'activos', 'pasivos', 'neto', 'plazo', 'pagadosInicio'];
const CAMPOS_SINO = ['activo', 'automatico'];

/* ───────────── Menú e instalación ───────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MiControl').addItem('Preparar hoja', 'instalar').addToUi();
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
  return ContentService.createTextOutput('MiControl está funcionando. Copia esta dirección en la app.');
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
    case 'cargar': {
      aplicarRecurrentes_(ss);
      const r = { movimientos: leerMovimientos_(ss), urlHoja: ss.getUrl(), version: VERSION };
      Object.keys(CONFIG).forEach(function (clave) { r[clave] = leerConfig_(ss, clave); });
      return r;
    }
    case 'guardarMovimiento':
      guardarMovimiento_(ss, datos.mov, datos.fechaOriginal);
      return true;
    case 'guardarMovimientos':
      (datos.movs || []).forEach(function (mov) { guardarMovimiento_(ss, mov); });
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
    if (def.inicial.length) {
      textoEnColumnas_(hoja, def, def.inicial.length);
      hoja.getRange(2, 1, def.inicial.length, def.enc.length).setValues(def.inicial);
    }
    formatoEncabezado_(hoja, def.enc.length);
    hoja.setTabColor('#202633');
  } else if (hoja.getLastColumn() < def.enc.length) {
    // Pestaña de una versión anterior: agrega los encabezados de las columnas nuevas
    hoja.getRange(1, 1, 1, def.enc.length).setValues([def.enc]);
    formatoEncabezado_(hoja, def.enc.length);
  }
  return hoja;
}

/** Las fechas y meses se guardan como texto para que Sheets no las convierta. */
function textoEnColumnas_(hoja, def, filas) {
  (def.texto || []).forEach(function (campo) {
    hoja.getRange(2, def.campos.indexOf(campo) + 1, filas, 1).setNumberFormat('@');
  });
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
        const esTexto = (def.texto || []).indexOf(campo) >= 0;
        if (v instanceof Date) v = Utilities.formatDate(v, tz, clave === 'historialPatrimonio' ? 'yyyy-MM' : 'yyyy-MM-dd');
        if (CAMPOS_SINO.indexOf(campo) >= 0) v = String(v).toLowerCase() !== 'no';
        else if (CAMPOS_NUMERO.indexOf(campo) >= 0 && !esTexto) v = Number(v) || 0;
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
      if (CAMPOS_SINO.indexOf(campo) >= 0) return v === false ? 'No' : 'Sí';
      if ((def.texto || []).indexOf(campo) >= 0) return v == null ? '' : String(v);
      if (CAMPOS_NUMERO.indexOf(campo) >= 0) return Number(v) || 0;
      return v == null ? '' : String(v);
    });
  });
  textoEnColumnas_(hoja, def, valores.length);
  hoja.getRange(2, 1, valores.length, def.campos.length).setValues(valores);
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
    hoja.setColumnWidth(10, 160);
    hoja.setTabColor('#C94F5B');
    // Resumen del mes en la fila 1, a la derecha de la tabla
    hoja.getRange('L1:Q1').setValues([['Ingresos', 0, 'Gastos', 0, 'Balance', 0]]).setFontWeight('bold');
    hoja.getRange('M1').setNumberFormat('$#,##0.00');
    hoja.getRange('O1').setNumberFormat('$#,##0.00');
    hoja.getRange('Q1').setNumberFormat('$#,##0.00');
  } else if (hoja && hoja.getRange(1, 10).getValue() === '') {
    // Pestaña de una versión anterior: agrega la columna de subcategoría
    hoja.getRange(1, 10).setValue('Subcategoría');
    formatoEncabezado_(hoja, ENC_MES.length);
  }
  return hoja;
}

function formatoEncabezado_(hoja, columnas) {
  hoja.getRange(1, 1, 1, columnas).setFontWeight('bold').setBackground('#202633').setFontColor('#FFFFFF');
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
    hoja.getRange(2, 1, ultima - 1, ENC_MES.length).getValues().forEach(function (f) {
      if (String(f[0]) === '') return;
      const fecha = f[1] instanceof Date ? Utilities.formatDate(f[1], tz, 'yyyy-MM-dd') : String(f[1]);
      lista.push({
        id: String(f[0]), fecha: fecha, tipo: String(f[2]), categoria: String(f[3]),
        descripcion: String(f[4]), monto: Number(f[5]) || 0, formaPago: String(f[6]), notas: String(f[7]),
        subcategoria: String(f[9]),
      });
    });
  });
  return lista;
}

function validarMovimiento_(mov) {
  if (!mov || !mov.id) throw new Error('Movimiento sin identificador.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(mov.fecha))) throw new Error('Fecha inválida.');
  if (!(Number(mov.monto) > 0)) throw new Error('El monto debe ser mayor a cero.');
  if (TIPOS.indexOf(mov.tipo) < 0) throw new Error('Tipo inválido.');
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
  if (fila) {
    hoja.getRange(fila, 1, 1, 8).setValues([valores]);
    hoja.getRange(fila, 10).setValue(mov.subcategoria || '');
  } else {
    hoja.appendRow(valores.concat([new Date(), mov.subcategoria || '']));
  }
  const ultima = hoja.getLastRow();
  if (ultima > 2) hoja.getRange(2, 1, ultima - 1, ENC_MES.length).sort([{ column: 2, ascending: true }, { column: 9, ascending: true }]);
  actualizarResumen_(hoja);
}

function borrarMovimiento_(ss, id, fecha) {
  const hoja = hojaMes_(ss, String(fecha).slice(0, 7), false);
  const fila = buscarFila_(hoja, id);
  if (fila) { hoja.deleteRow(fila); actualizarResumen_(hoja); }
}

/** Totales del mes en la fila 1. Las transferencias (pagos de tarjeta) no son ingreso ni gasto. */
function actualizarResumen_(hoja) {
  let ingresos = 0, gastos = 0;
  const ultima = hoja.getLastRow();
  if (ultima > 1) {
    hoja.getRange(2, 3, ultima - 1, 4).getValues().forEach(function (f) {
      if (f[0] === 'Ingreso') ingresos += Number(f[3]) || 0;
      else if (f[0] === 'Gasto') gastos += Number(f[3]) || 0;
    });
  }
  // Las hojas de la versión anterior tienen el resumen en K1:P1; las nuevas en L1:Q1
  const col = hoja.getRange('K1').getValue() === 'Ingresos' ? 12 : 13;
  hoja.getRange(1, col).setValue(ingresos);
  hoja.getRange(1, col + 2).setValue(gastos);
  hoja.getRange(1, col + 4).setValue(ingresos - gastos);
}

/* ───────────── Gastos fijos ───────────── */

/** Días del mes en que toca un gasto fijo según su frecuencia. Debe coincidir con ocurrencias() en src/finanzas.js. */
function diasFijo_(r, ym) {
  const p = ym.split('-');
  const diasDelMes = new Date(Number(p[0]), Number(p[1]), 0).getDate();
  const dia = Math.min(Math.max(1, r.dia || 1), 31);
  const tope = function (d) { return Math.min(d, diasDelMes); };
  const frecuencia = r.frecuencia || 'Mensual';
  if (frecuencia === 'Anual') return Number(p[1]) === (r.mes || 1) ? [tope(dia)] : [];
  if (frecuencia === 'Quincenal') {
    const otro = dia <= 15 ? dia + 15 : dia - 15;
    return [tope(Math.min(dia, otro)), tope(Math.max(dia, otro))].filter(function (d, i, a) { return a.indexOf(d) === i; });
  }
  if (frecuencia === 'Semanal') {
    const lista = [];
    for (let d = ((dia - 1) % 7) + 1; d <= diasDelMes; d += 7) lista.push(d);
    return lista;
  }
  return [tope(dia)];
}

/** Registra en el mes actual los gastos fijos automáticos cuyo día ya llegó. Usa un ID fijo por fecha para no duplicar. */
function aplicarRecurrentes_(ss) {
  const fijos = leerConfig_(ss, 'recurrentes').filter(function (r) { return r.activo && r.automatico && r.monto > 0; });
  if (!fijos.length) return;
  const hoy = hoyTexto_(ss);
  const ym = hoy.slice(0, 7);
  const diaHoy = Number(hoy.slice(8, 10));
  const hoja = hojaMes_(ss, ym, true);
  fijos.forEach(function (r) {
    diasFijo_(r, ym).forEach(function (dia, i) {
      if (dia > diaHoy) return;
      const id = 'FIJO-' + r.id + '-' + ym + (i ? '-' + (i + 1) : '');
      if (buscarFila_(hoja, id)) return;
      const esIngreso = r.tipo === 'Ingreso';
      guardarMovimiento_(ss, {
        id: id, fecha: ym + '-' + ('0' + dia).slice(-2), tipo: esIngreso ? 'Ingreso' : 'Gasto',
        categoria: r.categoria, descripcion: r.descripcion, monto: r.monto, formaPago: r.formaPago,
        notas: esIngreso ? 'Ingreso fijo automático' : 'Gasto fijo automático',
      });
    });
  });
}
