import { useState } from 'react';
import {
  ArrowUpDown, CalendarDays, CalendarRange, CloudOff, CreditCard, FileBarChart, Gem, Landmark, LayoutDashboard, LineChart,
  Menu, Plus, RefreshCw, Repeat, Settings, Sparkles, Target, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react';
import { useDatos } from './store.jsx';
import { Hoja, SelectorMes } from './ui.jsx';
import { mesActual } from './utils.js';
import FormularioMov from './FormularioMov.jsx';
import Bienvenida from './paginas/Bienvenida.jsx';
import Dashboard from './paginas/Dashboard.jsx';
import Movimientos from './paginas/Movimientos.jsx';
import Ingresos from './paginas/Ingresos.jsx';
import Gastos from './paginas/Gastos.jsx';
import Fijos from './paginas/Fijos.jsx';
import Presupuestos from './paginas/Presupuestos.jsx';
import Metas from './paginas/Metas.jsx';
import Tarjetas from './paginas/Tarjetas.jsx';
import Deudas from './paginas/Deudas.jsx';
import Quincenas from './paginas/Quincenas.jsx';
import Proyecciones from './paginas/Proyecciones.jsx';
import Calendario from './paginas/Calendario.jsx';
import Patrimonio from './paginas/Patrimonio.jsx';
import Analisis from './paginas/Analisis.jsx';
import Reportes from './paginas/Reportes.jsx';
import Ajustes from './paginas/Ajustes.jsx';

// Para agregar una sección nueva: crea el archivo en src/paginas y agrégala a esta lista.
// `mes: true` muestra el selector de mes arriba y la página recibe el mes elegido.
const SECCIONES = [
  { grupo: 'General', id: 'dashboard', nombre: 'Dashboard', titulo: 'Resumen financiero', Icono: LayoutDashboard, Pagina: Dashboard, mes: true },
  { grupo: 'General', id: 'quincenas', nombre: 'Quincenas', titulo: 'Planeación por quincena', Icono: CalendarRange, Pagina: Quincenas, mes: true, futuro: true },
  { grupo: 'General', id: 'movimientos', nombre: 'Movimientos', Icono: ArrowUpDown, Pagina: Movimientos, mes: true },
  { grupo: 'General', id: 'ingresos', nombre: 'Ingresos', Icono: TrendingUp, Pagina: Ingresos, mes: true },
  { grupo: 'General', id: 'gastos', nombre: 'Gastos', Icono: TrendingDown, Pagina: Gastos, mes: true },
  { grupo: 'Planeación', id: 'fijos', nombre: 'Gastos fijos', Icono: Repeat, Pagina: Fijos, mes: true },
  { grupo: 'Planeación', id: 'presupuestos', nombre: 'Presupuestos', Icono: Wallet, Pagina: Presupuestos, mes: true },
  { grupo: 'Planeación', id: 'metas', nombre: 'Metas de ahorro', Icono: Target, Pagina: Metas },
  { grupo: 'Control avanzado', id: 'tarjetas', nombre: 'Tarjetas de crédito', Icono: CreditCard, Pagina: Tarjetas },
  { grupo: 'Control avanzado', id: 'deudas', nombre: 'Deudas', titulo: 'Deudas y créditos', Icono: Landmark, Pagina: Deudas },
  { grupo: 'Control avanzado', id: 'proyecciones', nombre: 'Proyecciones', titulo: 'Proyección financiera', Icono: LineChart, Pagina: Proyecciones },
  { grupo: 'Control avanzado', id: 'calendario', nombre: 'Calendario de pagos', Icono: CalendarDays, Pagina: Calendario, mes: true, futuro: true },
  { grupo: 'Control avanzado', id: 'patrimonio', nombre: 'Patrimonio', titulo: 'Patrimonio personal', Icono: Gem, Pagina: Patrimonio },
  { grupo: 'Control avanzado', id: 'analisis', nombre: 'Análisis inteligente', Icono: Sparkles, Pagina: Analisis, mes: true },
  { grupo: 'Análisis', id: 'reportes', nombre: 'Reportes', Icono: FileBarChart, Pagina: Reportes, mes: true },
  { grupo: 'Análisis', id: 'ajustes', nombre: 'Configuración', Icono: Settings, Pagina: Ajustes },
];
const GRUPOS = [...new Set(SECCIONES.map((s) => s.grupo))];

const leerSeccion = () => { try { return localStorage.getItem('cc_seccion') || 'dashboard'; } catch { return 'dashboard'; } };

export default function App() {
  const { conexion, datos, cargando, error, pendientes, aviso, cargar, scriptViejo } = useDatos();
  const [seccion, setSeccion] = useState(leerSeccion);
  const [mes, setMes] = useState(mesActual());
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(null);

  if (!conexion) return <Bienvenida />;
  if (!datos) {
    return (
      <main className="min-h-full grid place-items-center p-6 text-center">
        {error
          ? <div><p className="font-semibold">No se pudo cargar tu hoja</p><p className="text-suave text-sm mt-1 mb-4 max-w-sm">{error}</p><button type="button" onClick={cargar} className="h-10 px-5 rounded-[9px] bg-marca text-sobremarca font-semibold">Reintentar</button></div>
          : <p className="text-suave">Cargando tus finanzas</p>}
      </main>
    );
  }

  const actual = SECCIONES.find((s) => s.id === seccion) || SECCIONES[0];
  const irA = (id) => {
    setSeccion(id); setMenuAbierto(false); window.scrollTo(0, 0);
    try { localStorage.setItem('cc_seccion', id); } catch { /* sin almacenamiento */ }
  };
  const abrirMov = (tipo = 'Gasto') => setNuevo({ tipo });
  // Las páginas sin selector futuro no deben quedarse en un mes que aún no llega
  const mesPagina = !actual.futuro && mes > mesActual() ? mesActual() : mes;
  const estado = { cargando, error, pendientes, cargar, demo: conexion.demo };

  const navegacion = (
    <nav className="flex-1 overflow-y-auto barra-nav -mx-1 px-1" aria-label="Secciones">
      {GRUPOS.map((g) => (
        <div key={g}>
          <p className="text-[10px] uppercase tracking-[1.4px] text-[#7f899b] px-3 pt-3 pb-2">{g}</p>
          {SECCIONES.filter((s) => s.grupo === g).map(({ id, nombre, Icono }) => (
            <button key={id} type="button" onClick={() => irA(id)} aria-current={seccion === id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-[9px] my-0.5 rounded-[9px] text-left text-[13.5px] font-medium transition-colors ${seccion === id ? 'bg-nav-activo text-white' : 'text-nav-tinta hover:bg-nav-activo hover:text-white'}`}>
              <Icono size={17} className="shrink-0" />{nombre}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
  const marca = (
    <div className="flex items-center gap-[11px] px-3 pb-4">
      <span className="w-[34px] h-[34px] rounded-[11px] grid place-items-center text-white font-black bg-[linear-gradient(135deg,#e87880,#b63848)]">M</span>
      <span className="text-[19px] font-bold text-white tracking-tight">MiControl</span>
    </div>
  );

  return (
    <div className="min-h-full">
      {/* Menú lateral fijo (computadora y tableta) */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[215px] lg:w-[248px] bg-nav px-[17px] pt-6 pb-4 z-30">
        {marca}
        {navegacion}
        <PieMenu {...estado} />
      </aside>

      {/* Menú desplegable (celular) */}
      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-[#11182780]" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] max-w-[85vw] bg-nav px-4 pb-4 flex flex-col" style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}>
            <div className="flex items-start justify-between">{marca}<button type="button" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} className="h-9 w-9 grid place-items-center rounded-full text-nav-tinta hover:text-white"><X size={19} /></button></div>
            {navegacion}
            <PieMenu {...estado} />
          </aside>
        </div>
      )}

      <div className="md:ml-[215px] lg:ml-[248px] min-w-0">
        {/* Barra superior (celular) */}
        <div className="md:hidden sticky top-0 z-20 bg-fondo/95 backdrop-blur flex items-center gap-2 px-3 pb-2 border-b border-linea" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}>
          <button type="button" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)} className="h-10 w-10 grid place-items-center rounded-[9px] bg-panel border border-linea"><Menu size={19} /></button>
          <span className="flex items-center gap-2 font-bold text-[15px] flex-1"><span className="w-6 h-6 rounded-[7px] grid place-items-center text-white text-xs font-black bg-[linear-gradient(135deg,#e87880,#b63848)]">M</span>MiControl</span>
          <Estado {...estado} compacto />
        </div>

        <main className="max-w-[1600px] px-4 sm:px-6 lg:px-[34px] pt-4 md:pt-[27px]" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-6">
            <div>
              <p className="text-xs text-suave mb-1">Tu espacio financiero personal</p>
              <h1 className="text-[22px] md:text-[25px] font-bold tracking-[-0.7px] leading-tight">{actual.titulo || actual.nombre}</h1>
            </div>
            <div className="flex items-center gap-2.5">
              {actual.mes && <SelectorMes mes={mesPagina} onCambio={setMes} futuro={actual.futuro} />}
              <button type="button" onClick={() => abrirMov()} className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-[9px] bg-marca text-sobremarca font-semibold text-sm hover:bg-marca-fuerte shadow-[0_4px_10px_#c94f5b22]"><Plus size={16} />Nuevo movimiento</button>
            </div>
          </header>

          {scriptViejo && (
            <div className="mb-4 rounded-[10px] border px-4 py-3 text-sm bg-aviso-suave" style={{ borderColor: 'color-mix(in srgb, var(--aviso) 30%, transparent)', color: 'var(--aviso)' }}>
              Hay una versión nueva de tu Apps Script. Tus movimientos funcionan, pero para guardar {datos.version < 2 ? 'tarjetas, deudas, patrimonio y preferencias' : 'compras a meses'} necesitas actualizarlo.{' '}
              <button type="button" className="font-semibold underline" onClick={() => irA('ajustes')}>Ver cómo</button>
            </div>
          )}

          <actual.Pagina key={actual.id} mes={mesPagina} irA={irA} abrirMov={abrirMov} />
        </main>
      </div>

      {/* Botón flotante para capturar rápido (celular) */}
      <button type="button" aria-label="Nuevo movimiento" onClick={() => abrirMov()}
        className="sm:hidden fixed right-4 z-30 h-14 w-14 rounded-full bg-marca text-sobremarca grid place-items-center shadow-[0_8px_24px_#c94f5b55]"
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        <Plus size={26} />
      </button>

      {nuevo && (
        <Hoja titulo="Nuevo movimiento" onCerrar={() => setNuevo(null)}>
          <FormularioMov tipoInicial={nuevo.tipo} onListo={() => setNuevo(null)} />
        </Hoja>
      )}

      {aviso && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 z-[60] bg-tinta text-fondo text-sm font-medium px-4 py-2.5 rounded-full shadow-lg max-w-[90vw] text-center bottom-24 sm:bottom-8">{aviso}</div>
      )}
    </div>
  );
}

function PieMenu(estado) {
  return (
    <div className="mt-3 pt-3 px-3 border-t border-[#3a4352] text-xs text-[#9da8b9] space-y-2">
      <Estado {...estado} />
      <p>Tu dinero, más claro.</p>
    </div>
  );
}

function Estado({ cargando, error, pendientes, cargar, demo, compacto }) {
  const texto = cargando ? 'Actualizando' : pendientes ? `${pendientes} por enviar` : error ? 'Sin conexión' : demo ? 'Datos de ejemplo' : 'Sincronizado';
  const alerta = !cargando && (pendientes > 0 || error);
  return (
    <button type="button" onClick={cargar} disabled={cargando} title={error || 'Actualizar datos'}
      className={`inline-flex items-center gap-2 text-xs font-medium rounded-full ${compacto ? 'px-3 h-9 bg-panel border border-linea text-suave' : 'px-3 h-8 bg-nav-activo text-nav-tinta hover:text-white'}`}
      style={alerta ? { color: 'var(--aviso)' } : undefined}>
      {alerta ? <CloudOff size={14} /> : <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />}{texto}
    </button>
  );
}
