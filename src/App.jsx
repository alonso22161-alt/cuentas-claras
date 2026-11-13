import { useState } from 'react';
import { CirclePlus, CloudOff, Ellipsis, Lightbulb, List, PieChart, PiggyBank, RefreshCw, Repeat, Settings, Target } from 'lucide-react';
import { useDatos } from './store.jsx';
import { Hoja } from './ui.jsx';
import Bienvenida from './paginas/Bienvenida.jsx';
import Capturar from './paginas/Capturar.jsx';
import Movimientos from './paginas/Movimientos.jsx';
import Resumen from './paginas/Resumen.jsx';
import Presupuestos from './paginas/Presupuestos.jsx';
import Fijos from './paginas/Fijos.jsx';
import Metas from './paginas/Metas.jsx';
import Consejos from './paginas/Consejos.jsx';
import Ajustes from './paginas/Ajustes.jsx';

// Para agregar una sección nueva: crea el archivo en src/paginas y agrégala a esta lista.
const SECCIONES = [
  { id: 'capturar', nombre: 'Capturar', Icono: CirclePlus, Pagina: Capturar, principal: true },
  { id: 'movimientos', nombre: 'Movimientos', Icono: List, Pagina: Movimientos, principal: true },
  { id: 'resumen', nombre: 'Resumen', Icono: PieChart, Pagina: Resumen, principal: true },
  { id: 'consejos', nombre: 'Consejos', Icono: Lightbulb, Pagina: Consejos, principal: true },
  { id: 'presupuestos', nombre: 'Presupuestos', Icono: PiggyBank, Pagina: Presupuestos },
  { id: 'fijos', nombre: 'Gastos fijos', Icono: Repeat, Pagina: Fijos },
  { id: 'metas', nombre: 'Metas de ahorro', Icono: Target, Pagina: Metas },
  { id: 'ajustes', nombre: 'Ajustes', Icono: Settings, Pagina: Ajustes },
];

export default function App() {
  const { conexion, datos, cargando, error, pendientes, aviso, cargar } = useDatos();
  const [seccion, setSeccion] = useState('capturar');
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (!conexion) return <Bienvenida />;
  if (!datos) {
    return (
      <main className="min-h-full grid place-items-center p-6 text-center">
        {error
          ? <div><p className="font-semibold">No se pudo cargar tu hoja</p><p className="text-suave text-sm mt-1 mb-4 max-w-sm">{error}</p><button type="button" onClick={cargar} className="h-11 px-5 rounded-xl bg-marca text-sobremarca font-semibold">Reintentar</button></div>
          : <p className="text-suave">Cargando tus cuentas</p>}
      </main>
    );
  }

  const actual = SECCIONES.find((s) => s.id === seccion) || SECCIONES[0];
  const irA = (id) => { setSeccion(id); setMenuAbierto(false); window.scrollTo(0, 0); };
  const enMas = !actual.principal;

  return (
    <div className="min-h-full lg:flex">
      {/* Menú lateral (computadora) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-linea bg-panel p-4">
        <div className="flex items-center gap-3 px-2 mb-6"><img src="./icono-192.png" alt="" width="36" height="36" className="rounded-xl" /><span className="cifra font-bold text-lg">Cuentas Claras</span></div>
        <nav className="space-y-1 flex-1" aria-label="Secciones">
          {SECCIONES.map(({ id, nombre, Icono }) => (
            <button key={id} type="button" onClick={() => irA(id)} aria-current={seccion === id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium ${seccion === id ? 'bg-marca text-sobremarca' : 'text-tinta hover:bg-hundido'}`}>
              <Icono size={18} />{nombre}
            </button>
          ))}
        </nav>
        <Estado {...{ cargando, error, pendientes, cargar, demo: conexion.demo }} />
      </aside>

      <div className="flex-1 min-w-0">
        {/* Barra superior (celular) */}
        <div className="lg:hidden flex items-center justify-between px-4 pb-1" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <span className="cifra font-bold">Cuentas Claras</span>
          <Estado {...{ cargando, error, pendientes, cargar, demo: conexion.demo }} compacto />
        </div>

        <main className="max-w-5xl mx-auto px-4 lg:px-8 pt-3 lg:pt-8" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
          <actual.Pagina irA={irA} />
        </main>
      </div>

      {/* Menú inferior (celular) */}
      <nav aria-label="Secciones" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-panel border-t border-linea grid grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {SECCIONES.filter((s) => s.principal).map(({ id, nombre, Icono }) => (
          <button key={id} type="button" onClick={() => irA(id)} aria-current={seccion === id ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium ${seccion === id ? 'text-marca' : 'text-suave'}`}>
            <Icono size={id === 'capturar' ? 26 : 21} strokeWidth={seccion === id ? 2.4 : 1.9} />{nombre}
          </button>
        ))}
        <button type="button" onClick={() => setMenuAbierto(true)} aria-haspopup="dialog" className={`flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium ${enMas ? 'text-marca' : 'text-suave'}`}>
          <Ellipsis size={21} />Más
        </button>
      </nav>

      {menuAbierto && (
        <Hoja titulo="Más" onCerrar={() => setMenuAbierto(false)}>
          <div className="grid grid-cols-2 gap-3">
            {SECCIONES.filter((s) => !s.principal).map(({ id, nombre, Icono }) => (
              <button key={id} type="button" onClick={() => irA(id)} className="bg-panel border border-linea rounded-2xl p-4 text-left font-semibold text-sm flex flex-col gap-3">
                <Icono size={22} className="text-marca" />{nombre}
              </button>
            ))}
          </div>
        </Hoja>
      )}

      {aviso && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 z-50 bg-tinta text-fondo text-sm font-medium px-4 py-2.5 rounded-full shadow-lg max-w-[90vw] text-center bottom-24 lg:bottom-8">{aviso}</div>
      )}
    </div>
  );
}

function Estado({ cargando, error, pendientes, cargar, demo, compacto }) {
  const texto = cargando ? 'Actualizando' : pendientes ? `${pendientes} por enviar` : error ? 'Sin conexión' : demo ? 'Datos de ejemplo' : 'Al día';
  const alerta = !cargando && (pendientes > 0 || error);
  return (
    <button type="button" onClick={cargar} disabled={cargando} title={error || 'Actualizar datos'}
      className={`inline-flex items-center gap-2 text-xs font-medium rounded-full ${compacto ? 'px-3 h-8 bg-panel border border-linea' : 'px-3 h-9 bg-hundido'}`}
      style={alerta ? { color: 'var(--aviso)' } : { color: 'var(--suave)' }}>
      {alerta ? <CloudOff size={14} /> : <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />}{texto}
    </button>
  );
}
