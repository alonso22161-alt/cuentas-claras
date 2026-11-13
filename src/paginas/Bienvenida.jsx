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
    <main className="min-h-full grid lg:grid-cols-[1fr_1.1fr]">
      <section className="hidden lg:flex flex-col justify-between bg-nav text-white p-12">
        <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl grid place-items-center font-black bg-[linear-gradient(135deg,#e87880,#b63848)]">M</span><span className="text-xl font-bold tracking-tight">MiControl</span></div>
        <div>
          <h2 className="text-4xl font-bold tracking-tight leading-tight max-w-md">Tu dinero, más claro.</h2>
          <p className="text-nav-tinta mt-4 max-w-md">Ingresos, gastos, tarjetas, deudas, metas y patrimonio en un solo lugar. Tus datos viven en tu propia hoja de Google Drive.</p>
        </div>
        <p className="text-xs text-nav-tinta">Gratis, sin anuncios y sin compartir tu información con nadie.</p>
      </section>
      <section className="grid place-items-center p-5">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6"><span className="w-11 h-11 rounded-xl grid place-items-center text-white font-black bg-[linear-gradient(135deg,#e87880,#b63848)]">M</span><span className="text-2xl font-bold tracking-tight">MiControl</span></div>
          <p className="text-xs text-suave mb-1">Bienvenido</p>
          <h1 className="text-[25px] font-bold tracking-[-0.7px]">Conecta tu hoja</h1>
          <p className="text-suave text-sm mt-1 mb-6">Pega la dirección de tu Apps Script y tu clave. Solo se piden una vez en cada dispositivo.</p>

          <div className="bg-panel border border-linea rounded-[14px] shadow-tarjeta p-5 space-y-4">
            <Campo etiqueta="Dirección de tu aplicación web (Apps Script)"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" autoCapitalize="none" autoCorrect="off" className={claseEntrada} /></Campo>
            <Campo etiqueta="Tu clave"><input type="password" value={clave} onChange={(e) => setClave(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && conectarHoja()} autoComplete="current-password" className={claseEntrada} /></Campo>
            {error && <p role="alert" className="text-sm text-gasto">{error}</p>}
            <Boton className="w-full h-11" disabled={ocupado} onClick={conectarHoja}>{ocupado ? 'Conectando' : 'Conectar'}</Boton>
            <p className="text-[11px] text-suave">La dirección y la clave se guardan solo en este dispositivo. Los pasos para obtenerlas están en el README del proyecto.</p>
          </div>

          <Boton variante="secundario" className="w-full mt-3 h-11" disabled={ocupado} onClick={() => entrar({ demo: true })}>Probar con datos de ejemplo</Boton>
        </div>
      </section>
    </main>
  );
}
