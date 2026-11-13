import { useRef, useState } from 'react';
import { Download, ExternalLink, FileSpreadsheet, Pencil, Trash2, Upload } from 'lucide-react';
import { useDatos, preferencia } from '../store.jsx';
import { BotonConfirmar, Boton, Campo, Panel, claseEntrada } from '../ui.jsx';
import { MONEDAS, descargarCSV, hoyISO } from '../utils.js';
import { descargar, descargarExcel } from '../excel.js';
import { VERSION_CLAVE, VERSION_SCRIPT, normalizar } from '../api.js';

const CLAVES_CONFIG = ['categorias', 'formasPago', 'recurrentes', 'metas', 'tarjetas', 'mesesTarjeta', 'deudas', 'activos', 'historialPatrimonio', 'preferencias'];

function ListaEditable({ titulo, ayuda, filas, opciones, campoOpcion, onGuardar, extra, conSub }) {
  const [nombre, setNombre] = useState('');
  const [opcion, setOpcion] = useState(opciones[0]);
  const [subEditando, setSubEditando] = useState(null);
  const [subTexto, setSubTexto] = useState('');
  const agregar = () => {
    const n = nombre.trim();
    if (!n || filas.some((f) => f.nombre.toLowerCase() === n.toLowerCase())) return;
    onGuardar([...filas, { nombre: n, [campoOpcion]: opcion, ...extra }]);
    setNombre('');
  };
  const guardarSub = (f) => {
    const limpio = subTexto.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
    if (limpio !== (f.subcategorias || '')) onGuardar(filas.map((x) => (x.nombre === f.nombre ? { ...x, subcategorias: limpio } : x)));
    setSubEditando(null);
  };
  return (
    <Panel titulo={titulo} subtitulo={ayuda}>
      <ul className="divide-y divide-linea">
        {filas.map((f) => (
          <li key={f.nombre} className="py-2">
            <div className="flex items-center gap-2">
              <span className="flex-1 min-w-0"><span className="block truncate text-sm">{f.nombre}</span>{conSub && f.subcategorias && subEditando !== f.nombre && <span className="block truncate text-[11px] text-suave">{f.subcategorias}</span>}</span>
              {conSub && <button type="button" aria-label={`Subcategorías de ${f.nombre}`} title="Subcategorías" onClick={() => { setSubEditando(f.nombre); setSubTexto(f.subcategorias || ''); }} className="h-8 w-8 grid place-items-center text-suave hover:text-marca"><Pencil size={14} /></button>}
              <select aria-label={`Clasificación de ${f.nombre}`} value={f[campoOpcion]} onChange={(e) => onGuardar(filas.map((x) => (x.nombre === f.nombre ? { ...x, [campoOpcion]: e.target.value } : x)))} className="h-8 rounded-lg border border-linea bg-panel px-2 text-xs">
                {opciones.map((o) => <option key={o}>{o}</option>)}
              </select>
              <button type="button" aria-label={`Quitar ${f.nombre}`} onClick={() => onGuardar(filas.filter((x) => x.nombre !== f.nombre))} className="h-8 w-8 grid place-items-center text-suave hover:text-gasto"><Trash2 size={14} /></button>
            </div>
            {subEditando === f.nombre && (
              <div className="flex gap-2 mt-2">
                <input autoFocus value={subTexto} onChange={(e) => setSubTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarSub(f)} placeholder="Separadas por coma. Ej. Luz, Agua, Internet" aria-label={`Subcategorías de ${f.nombre}`} className={`${claseEntrada} !h-9`} />
                <Boton tam="sm" onClick={() => guardarSub(f)}>Guardar</Boton>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mt-3">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Nombre nuevo" aria-label={`Agregar a ${titulo}`} className={claseEntrada} />
        <select value={opcion} onChange={(e) => setOpcion(e.target.value)} aria-label="Clasificación" className={`${claseEntrada} !w-auto`}>{opciones.map((o) => <option key={o}>{o}</option>)}</select>
        <Boton variante="secundario" onClick={agregar}>Agregar</Boton>
      </div>
    </Panel>
  );
}

function NuevaIngreso({ onAgregar, existentes }) {
  const [n, setN] = useState('');
  const agregar = () => { const v = n.trim(); if (v && !existentes.some((c) => c.nombre.toLowerCase() === v.toLowerCase())) { onAgregar(v); setN(''); } };
  return (
    <div className="flex gap-2 mt-3">
      <input value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Nombre nuevo" aria-label="Agregar categoría de ingreso" className={claseEntrada} />
      <Boton variante="secundario" onClick={agregar}>Agregar</Boton>
    </div>
  );
}

const leerTema = () => { try { return localStorage.getItem('cc_tema') || 'sistema'; } catch { return 'sistema'; } };

export default function Ajustes() {
  const { datos, conexion, guardarConfig, guardarMovs, desconectar, cargar, cargando, avisar, scriptViejo } = useDatos();
  const [confirmar, setConfirmar] = useState(false);
  const [tema, setTema] = useState(leerTema);
  const [respaldo, setRespaldo] = useState(null);
  const archivo = useRef(null);
  const gastos = datos.categorias.filter((c) => c.tipo === 'Gasto');
  const ingresos = datos.categorias.filter((c) => c.tipo === 'Ingreso');
  const moneda = preferencia(datos, 'moneda', 'MXN');

  function cambiarTema(t) {
    setTema(t);
    try { if (t === 'sistema') localStorage.removeItem('cc_tema'); else localStorage.setItem('cc_tema', t); } catch { /* sin almacenamiento */ }
    if (t === 'sistema') delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = t;
  }
  const cambiarMoneda = (m) => guardarConfig('preferencias', [...datos.preferencias.filter((p) => p.clave !== 'moneda'), { clave: 'moneda', valor: m }], 'Moneda actualizada');

  function bajarRespaldo() {
    const contenido = { app: 'MiControl', version: VERSION_SCRIPT, fecha: new Date().toISOString(), datos: Object.fromEntries([...CLAVES_CONFIG, 'movimientos'].map((k) => [k, datos[k]])) };
    descargar(new Blob([JSON.stringify(contenido, null, 1)], { type: 'application/json' }), `micontrol-respaldo-${hoyISO()}.json`);
  }
  function bajarExcel() {
    descargarExcel(`micontrol-${hoyISO()}.xlsx`, [
      { nombre: 'Movimientos', filas: [['Fecha', 'Tipo', 'Categoría', 'Subcategoría', 'Concepto', 'Monto', 'Cuenta', 'Notas'], ...[...datos.movimientos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((m) => [m.fecha, m.tipo, m.categoria, m.subcategoria, m.descripcion, m.monto, m.formaPago, m.notas])] },
      { nombre: 'Gastos fijos', filas: [['Concepto', 'Tipo', 'Importe', 'Frecuencia', 'Día', 'Categoría', 'Activo'], ...datos.recurrentes.map((r) => [r.descripcion, r.tipo, r.monto, r.frecuencia, r.dia, r.categoria, r.activo ? 'Sí' : 'No'])] },
      { nombre: 'Tarjetas', filas: [['Tarjeta', 'Banco', 'Límite', 'Día de corte', 'Día de pago'], ...datos.tarjetas.map((t) => [t.nombre, t.banco, t.limite, t.diaCorte, t.diaPago])] },
      { nombre: 'Deudas', filas: [['Deuda', 'Acreedor', 'Pago mensual', 'Tasa %', 'Día de pago'], ...datos.deudas.map((d) => [d.nombre, d.acreedor, d.pagoMensual, d.tasa, d.diaPago])] },
      { nombre: 'Patrimonio', filas: [['Activo', 'Tipo', 'Valor'], ...datos.activos.map((a) => [a.nombre, a.tipo, a.valor])] },
    ]);
  }
  async function elegirArchivo(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      if (json?.app !== 'MiControl' || !json.datos || !Array.isArray(json.datos.movimientos)) throw new Error();
      setRespaldo({ nombre: f.name, fecha: json.fecha, datos: normalizar(json.datos) });
    } catch { avisar('Ese archivo no es un respaldo de MiControl.'); }
  }
  async function restaurar() {
    const d = respaldo.datos;
    setRespaldo(null);
    for (const clave of CLAVES_CONFIG) {
      if (datos.version < (VERSION_CLAVE[clave] || 1)) continue;
      await guardarConfig(clave, d[clave], '');
    }
    const nuevos = d.movimientos.filter((m) => /^\d{4}-\d{2}-\d{2}$/.test(m.fecha) && Number(m.monto) > 0);
    for (let i = 0; i < nuevos.length; i += 200) await guardarMovs(nuevos.slice(i, i + 200), '');
    avisar(`Respaldo restaurado: ${nuevos.length} movimientos`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4 min-w-0">
        <Panel titulo="Preferencias" subtitulo="Personaliza cómo se muestran tus finanzas">
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo etiqueta="Moneda"><select value={moneda} onChange={(e) => cambiarMoneda(e.target.value)} className={claseEntrada}>{MONEDAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Campo>
            <Campo etiqueta="Apariencia" ayuda="Se guarda solo en este dispositivo"><select value={tema} onChange={(e) => cambiarTema(e.target.value)} className={claseEntrada}><option value="sistema">Igual que el sistema</option><option value="claro">Claro</option><option value="oscuro">Oscuro</option></select></Campo>
          </div>
        </Panel>
        <ListaEditable titulo="Categorías de gasto" ayuda="El grupo se usa para la regla 50/30/20. Lo que marques como Ahorro cuenta como dinero apartado, no como consumo. Con el lápiz defines subcategorías."
          filas={gastos} opciones={['Necesidad', 'Gusto', 'Ahorro']} campoOpcion="grupo" extra={{ tipo: 'Gasto', presupuesto: 0, subcategorias: '' }} conSub
          onGuardar={(f) => guardarConfig('categorias', [...f, ...ingresos])} />
        <Panel titulo="Categorías de ingreso">
          <ul className="divide-y divide-linea">
            {ingresos.map((c) => (
              <li key={c.nombre} className="flex items-center py-2 text-sm"><span className="flex-1">{c.nombre}</span>
                <button type="button" aria-label={`Quitar ${c.nombre}`} onClick={() => guardarConfig('categorias', datos.categorias.filter((x) => x !== c))} className="h-8 w-8 grid place-items-center text-suave hover:text-gasto"><Trash2 size={14} /></button></li>
            ))}
          </ul>
          <NuevaIngreso onAgregar={(n) => guardarConfig('categorias', [...datos.categorias, { nombre: n, tipo: 'Ingreso', grupo: '', presupuesto: 0, subcategorias: '' }])} existentes={datos.categorias} />
        </Panel>
      </div>

      <div className="space-y-4 min-w-0">
        <ListaEditable titulo="Cuentas y formas de pago" ayuda="Da de alta cada tarjeta o cuenta por separado, por ejemplo “BBVA crédito”. Las de tipo Crédito se pueden vincular a una tarjeta."
          filas={datos.formasPago} opciones={['Efectivo', 'Débito', 'Crédito']} campoOpcion="tipo" onGuardar={(f) => guardarConfig('formasPago', f)} />

        <Panel titulo="Administración de datos" subtitulo={conexion?.demo ? 'Estás usando datos de ejemplo guardados solo en este dispositivo.' : 'Todo se guarda en tu hoja de Google Drive, con una pestaña por mes.'}>
          <div className="flex flex-wrap gap-2">
            {datos.urlHoja && <a href={datos.urlHoja} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-[9px] px-4 h-10 font-semibold text-sm bg-marca text-sobremarca"><ExternalLink size={15} />Abrir mi hoja</a>}
            <Boton variante="secundario" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando' : 'Actualizar datos'}</Boton>
            <Boton variante="secundario" onClick={() => descargarCSV(datos.movimientos)}><Download size={15} />CSV</Boton>
            <Boton variante="secundario" onClick={bajarExcel}><FileSpreadsheet size={15} />Excel</Boton>
          </div>
          <div className="border-t border-linea mt-4 pt-4">
            <p className="text-sm font-semibold">Respaldos</p>
            <p className="text-xs text-suave mt-0.5 mb-3">Descarga un archivo con toda tu información. Al importarlo se reemplaza tu configuración y se agregan o actualizan los movimientos; ninguno se borra.</p>
            <div className="flex flex-wrap gap-2">
              <Boton variante="secundario" onClick={bajarRespaldo}><Download size={15} />Descargar respaldo</Boton>
              <Boton variante="secundario" onClick={() => archivo.current?.click()}><Upload size={15} />Importar respaldo</Boton>
              <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={elegirArchivo} />
            </div>
            {respaldo && (
              <div className="mt-3 rounded-[10px] border border-linea bg-aviso-suave p-3 text-sm">
                <p>¿Importar <b>{respaldo.nombre}</b>{respaldo.fecha ? ` (${respaldo.fecha.slice(0, 10)})` : ''}? Trae {respaldo.datos.movimientos.length} movimientos y reemplazará tus categorías, fijos, metas, tarjetas, deudas y patrimonio.</p>
                <div className="flex gap-2 mt-2"><Boton tam="sm" onClick={restaurar}>Sí, importar</Boton><Boton tam="sm" variante="secundario" onClick={() => setRespaldo(null)}>Cancelar</Boton></div>
              </div>
            )}
          </div>
          <div className="border-t border-linea mt-4 pt-4">
            {confirmar
              ? <div className="flex flex-wrap items-center gap-2"><span className="text-sm">{conexion?.demo ? 'Se borrarán los datos de ejemplo.' : 'Tu hoja no se borra; solo se desconecta este dispositivo.'}</span><Boton variante="peligro" onClick={desconectar}>Sí, salir</Boton><Boton variante="secundario" onClick={() => setConfirmar(false)}>Cancelar</Boton></div>
              : <Boton variante="peligro" onClick={() => setConfirmar(true)}>{conexion?.demo ? 'Salir del modo de ejemplo' : 'Desconectar este dispositivo'}</Boton>}
          </div>
        </Panel>

        {!conexion?.demo && (
          <Panel titulo="Tu Apps Script" subtitulo={scriptViejo ? `Versión ${datos.version}: falta actualizar` : `Versión ${datos.version}: al día`}>
            <div className={`text-xs leading-relaxed rounded-[10px] p-3 ${scriptViejo ? 'bg-aviso-suave' : 'bg-hundido'}`} style={scriptViejo ? { color: 'var(--aviso)' } : undefined}>
              <p className="font-semibold mb-1">{scriptViejo ? 'Para usar todas las funciones (tarjetas, compras a meses, deudas, patrimonio):' : 'Si algún día cambia Code.gs:'}</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Abre tu hoja y entra a Extensiones &gt; Apps Script.</li>
                <li>Borra todo y pega el nuevo contenido de apps-script/Code.gs del proyecto.</li>
                <li>Vuelve a escribir tu clave en la línea de CLAVE y guarda.</li>
                <li>Implementar &gt; Administrar implementaciones &gt; lápiz &gt; Versión: Nueva versión &gt; Implementar.</li>
                <li>Regresa aquí y presiona Actualizar datos.</li>
              </ol>
              <p className="mt-1.5">La URL no cambia y tus datos no se borran; las pestañas nuevas se crean solas.</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
