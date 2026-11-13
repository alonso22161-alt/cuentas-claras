import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from './api.js';

const Ctx = createContext(null);
export const useDatos = () => useContext(Ctx);

export function Proveedor({ children }) {
  const [conexion, setConexion] = useState(api.leerConexion());
  const [datos, setDatos] = useState(api.leerCache());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [pendientes, setPendientes] = useState(api.leerCola().length);
  const [aviso, setAviso] = useState('');
  const ref = useRef(datos);
  const reloj = useRef(null);

  const poner = (d) => { ref.current = d; setDatos(d); api.guardarCache(d); };
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

  function guardarMov(mov, fechaOriginal) {
    const antes = ref.current;
    poner({ ...antes, movimientos: antes.movimientos.filter((m) => m.id !== mov.id).concat(mov) });
    return enviar('guardarMovimiento', { mov, fechaOriginal }, antes, mov.tipo === 'Ingreso' ? 'Ingreso guardado' : 'Gasto guardado');
  }
  function borrarMov(mov) {
    const antes = ref.current;
    poner({ ...antes, movimientos: antes.movimientos.filter((m) => m.id !== mov.id) });
    return enviar('borrarMovimiento', { id: mov.id, fecha: mov.fecha }, antes, 'Movimiento borrado');
  }
  function guardarConfig(clave, filas) {
    const antes = ref.current;
    poner({ ...antes, [clave]: filas });
    return enviar('guardarConfig', { clave, filas }, antes, 'Cambios guardados');
  }

  return (
    <Ctx.Provider value={{ conexion, datos, cargando, error, pendientes, aviso, cargar, conectar, desconectar, guardarMov, borrarMov, guardarConfig, avisar }}>
      {children}
    </Ctx.Provider>
  );
}
