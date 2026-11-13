import { useState } from 'react';
import { useDatos } from '../store.jsx';
import { Boton, Campo, claseEntrada } from '../ui.jsx';

export default function Bienvenida() {
  const { conectar } = useDatos();
  const [url, setUrl] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function entrar(conexion) {
    setError(''); setOcupado(true);
    try { await conectar(conexion); } catch (e) { setError(e.message); setOcupado(false); }
  }
  function conectarHoja() {
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url.trim())) return setError('La dirección debe empezar con https://script.google.com/ y terminar en /exec.');
    if (!clave) return setError('Escribe la clave que pusiste en Code.gs.');
    entrar({ url: url.trim(), clave });
  }

  return (
    <main className="min-h-full grid place-items-center p-5">
      <div className="w-full max-w-md">
        <img src="./icono-192.png" alt="" width="56" height="56" className="rounded-2xl mb-5" />
        <h1 className="cifra text-4xl font-bold leading-tight">Cuentas Claras</h1>
        <p className="text-suave mt-2 mb-6">Registra lo que gastas en segundos y mira a dónde se va tu dinero. Tus datos viven en tu propia hoja de Google Drive.</p>

        <div className="bg-panel border border-linea rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold">Conecta tu hoja</h2>
          <Campo etiqueta="Dirección de tu aplicación web (Apps Script)"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" autoCapitalize="none" autoCorrect="off" className={claseEntrada} /></Campo>
          <Campo etiqueta="Tu clave"><input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" className={claseEntrada} /></Campo>
          {error && <p role="alert" className="text-sm" style={{ color: 'var(--gasto)' }}>{error}</p>}
          <Boton className="w-full h-12" disabled={ocupado} onClick={conectarHoja}>{ocupado ? 'Conectando' : 'Conectar'}</Boton>
          <p className="text-xs text-suave">La dirección y la clave se guardan solo en este dispositivo. Los pasos para obtenerlas están en el archivo README del proyecto.</p>
        </div>

        <button type="button" disabled={ocupado} onClick={() => entrar({ demo: true })} className="w-full mt-4 h-11 rounded-xl border border-linea font-semibold text-sm">Probar con datos de ejemplo</button>
      </div>
    </main>
  );
}
