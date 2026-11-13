import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from './api.js';
import { patrimonio } from './finanzas.js';
import { mesActual, ponerMoneda } from './utils.js';

const Ctx = createContext(null);
export const useDatos = () => useContext(Ctx);

export const preferencia = (datos, clave, def = '') => datos?.preferencias?.find((p) => p.clave === clave)?.valor || def;

export function Proveedor({ children }) {
  const [conexion, setConexion] = useState(api.leerConexion());
  const [datos, setDatos] = useState(() => { const d = api.leerCache(); ponerMoneda(preferencia(d, 'moneda', 'MXN')); return d; });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [pendientes, setPendientes] = useState(api.leerCola().length);
  const [aviso, setAviso] = useState('');
  const ref = useRef(datos);
  const reloj = useRef(null);
  const fotoIntentada = useRef('');

  const poner = (d) => { ponerMoneda(preferencia(d, 'moneda', 'MXN')); ref.current = d; setDatos(d); api.guardarCache(d); };
  const avisar = useCallback((texto) => {
    setAviso(texto);
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setAviso(''), 3500);
  }, []);

  const cargar = useCallback(async () => {
    if (!api.leerConexion()) return;
    setCargando(true); setError('');
    try {
      await api.enviarCola();
      setPendientes(0);
      poner(api.normalizar(await api.llamar('cargar')));
    } catch (e) {
      setPendientes(api.leerCola().length);
      setError(e.message);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { if (conexion) cargar(); }, [conexion, cargar]);
  useEffect(() => {
    const alVolver = () => { if (api.leerCola().length) cargar(); };
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [cargar]);

  /** Prueba la conexión antes de guardarla. */
  async function conectar(nueva) {
    const d = api.normalizar(await api.llamar('cargar', undefined, nueva));
    api.guardarConexion(nueva);
    poner(d);
    setConexion(nueva);
  }
  function desconectar() {
    if (conexion?.demo) api.borrarDemo();
    api.borrarConexion();
    ref.current = null; setDatos(null); setConexion(null); setError(''); setPendientes(0);
  }

  const scriptViejo = Boolean(datos) && datos.version < api.VERSION_SCRIPT;

  async function enviar(accion, cuerpo, antes, mensajeOk) {
    try {
      await api.llamar(accion, cuerpo);
      if (mensajeOk) avisar(mensajeOk);
      return true;
    } catch (e) {
      if (e.sinRed) {
        api.encolar({ accion, datos: cuerpo });
        setPendientes(api.leerCola().length);
        avisar('Sin internet. Se enviará a tu hoja cuando vuelva la conexión.');
        return true;
      }
      poner(antes);
      avisar(`No se guardó: ${e.message}`);
      return false;
    }
  }

  function guardarMov(mov, fechaOriginal, mensaje) {
    const antes = ref.current;
    poner({ ...antes, movimientos: antes.movimientos.filter((m) => m.id !== mov.id).concat(mov) });
    return enviar('guardarMovimiento', { mov, fechaOriginal }, antes, mensaje ?? (mov.tipo === 'Ingreso' ? 'Ingreso guardado' : mov.tipo === 'Gasto' ? 'Gasto guardado' : 'Pago guardado'));
  }
  /** Guarda muchos movimientos en una sola llamada (importar respaldo). */
  function guardarMovs(movs, mensaje) {
    if (scriptViejo) { avisar('Actualiza tu Apps Script para importar movimientos (ver Configuración).'); return Promise.resolve(false); }
    const antes = ref.current;
    const ids = new Set(movs.map((m) => m.id));
    poner({ ...antes, movimientos: antes.movimientos.filter((m) => !ids.has(m.id)).concat(movs) });
    return enviar('guardarMovimientos', { movs }, antes, mensaje);
  }
  function borrarMov(mov) {
    const antes = ref.current;
    poner({ ...antes, movimientos: antes.movimientos.filter((m) => m.id !== mov.id) });
    return enviar('borrarMovimiento', { id: mov.id, fecha: mov.fecha }, antes, 'Movimiento borrado');
  }
  function guardarConfig(clave, filas, mensaje = 'Cambios guardados') {
    if (scriptViejo && api.CLAVES_V2.includes(clave)) {
      avisar('Para guardar esto, actualiza tu Apps Script con el nuevo Code.gs (ver Configuración).');
      return Promise.resolve(false);
    }
    const antes = ref.current;
    poner({ ...antes, [clave]: filas });
    return enviar('guardarConfig', { clave, filas }, antes, mensaje);
  }

  // Una foto del patrimonio por mes para la gráfica de evolución. Se actualiza sola cuando cambian los números.
  useEffect(() => {
    if (!datos || cargando || scriptViejo || (!datos.activos.length && !datos.deudas.length && !datos.tarjetas.length)) return;
    const p = patrimonio(datos);
    const ym = mesActual();
    const foto = { mes: ym, activos: Math.round(p.activos), pasivos: Math.round(p.pasivos), neto: Math.round(p.neto) };
    const actual = datos.historialPatrimonio.find((h) => h.mes === ym);
    if (actual && actual.activos === foto.activos && actual.pasivos === foto.pasivos) return;
    const firma = JSON.stringify(foto);
    if (fotoIntentada.current === firma) return; // si falló, no reintentar en bucle
    const t = setTimeout(() => {
      fotoIntentada.current = firma;
      guardarConfig('historialPatrimonio', datos.historialPatrimonio.filter((h) => h.mes !== ym).concat(foto).sort((a, b) => (a.mes < b.mes ? -1 : 1)), '');
    }, 2500);
    return () => clearTimeout(t);
  }, [datos, cargando, scriptViejo]);

  return (
    <Ctx.Provider value={{ conexion, datos, cargando, error, pendientes, aviso, scriptViejo, cargar, conectar, desconectar, guardarMov, guardarMovs, borrarMov, guardarConfig, avisar }}>
      {children}
    </Ctx.Provider>
  );
}
