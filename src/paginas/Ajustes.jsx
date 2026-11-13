import { useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { Boton, Encabezado, Panel, claseEntrada } from '../ui.jsx';
import { descargarCSV } from '../utils.js';

function ListaEditable({ titulo, ayuda, filas, opciones, campoOpcion, onGuardar, extra }) {
  const [nombre, setNombre] = useState('');
  const [opcion, setOpcion] = useState(opciones[0]);
  const agregar = () => {
    const n = nombre.trim();
    if (!n || filas.some((f) => f.nombre.toLowerCase() === n.toLowerCase())) return;
    onGuardar([...filas, { nombre: n, [campoOpcion]: opcion, ...extra }]);
    setNombre('');
  };
  return (
    <Panel titulo={titulo}>
      {ayuda && <p className="text-sm text-suave mb-3">{ayuda}</p>}
      <ul className="divide-y divide-linea">
        {filas.map((f) => (
          <li key={f.nombre} className="flex items-center gap-2 py-2">
            <span className="flex-1 min-w-0 truncate text-sm">{f.nombre}</span>
            <select aria-label={`Clasificación de ${f.nombre}`} value={f[campoOpcion]} onChange={(e) => onGuardar(filas.map((x) => (x.nombre === f.nombre ? { ...x, [campoOpcion]: e.target.value } : x)))} className="h-9 rounded-lg border border-linea bg-panel px-2 text-sm">
              {opciones.map((o) => <option key={o}>{o}</option>)}
            </select>
            <button type="button" aria-label={`Quitar ${f.nombre}`} onClick={() => onGuardar(filas.filter((x) => x.nombre !== f.nombre))} className="h-9 w-9 grid place-items-center text-suave"><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mt-3">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Nombre nuevo" aria-label={`Agregar a ${titulo}`} className={claseEntrada} />
        <select value={opcion} onChange={(e) => setOpcion(e.target.value)} aria-label="Clasificación" className={`${claseEntrada} !w-auto`}>{opciones.map((o) => <option key={o}>{o}</option>)}</select>
        <Boton variante="suave" onClick={agregar}>Agregar</Boton>
      </div>
    </Panel>
  );
}

export default function Ajustes() {
  const { datos, conexion, guardarConfig, desconectar, cargar, cargando } = useDatos();
  const [confirmar, setConfirmar] = useState(false);
  const gastos = datos.categorias.filter((c) => c.tipo === 'Gasto');
  const ingresos = datos.categorias.filter((c) => c.tipo === 'Ingreso');

  return (
    <>
      <Encabezado titulo="Ajustes" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <ListaEditable titulo="Categorías de gasto" ayuda="El grupo se usa para la regla 50/30/20. Lo que marques como Ahorro cuenta como dinero apartado, no como gasto perdido."
          filas={gastos} opciones={['Necesidad', 'Gusto', 'Ahorro']} campoOpcion="grupo" extra={{ tipo: 'Gasto', presupuesto: 0 }}
          onGuardar={(f) => guardarConfig('categorias', [...f, ...ingresos])} />
        <div className="space-y-4">
          <ListaEditable titulo="Formas de pago" ayuda="Puedes dar de alta cada tarjeta por separado, por ejemplo “BBVA crédito”."
            filas={datos.formasPago} opciones={['Efectivo', 'Débito', 'Crédito']} campoOpcion="tipo" onGuardar={(f) => guardarConfig('formasPago', f)} />
          <Panel titulo="Categorías de ingreso">
            <ul className="divide-y divide-linea">
              {ingresos.map((c) => (
                <li key={c.nombre} className="flex items-center py-2 text-sm"><span className="flex-1">{c.nombre}</span>
                  <button type="button" aria-label={`Quitar ${c.nombre}`} onClick={() => guardarConfig('categorias', datos.categorias.filter((x) => x !== c))} className="h-9 w-9 grid place-items-center text-suave"><Trash2 size={15} /></button></li>
              ))}
            </ul>
            <NuevaIngreso onAgregar={(n) => guardarConfig('categorias', [...datos.categorias, { nombre: n, tipo: 'Ingreso', grupo: '', presupuesto: 0 }])} existentes={datos.categorias} />
          </Panel>
          <Panel titulo="Tus datos">
            <p className="text-sm text-suave mb-3">{conexion?.demo ? 'Estás usando datos de ejemplo guardados solo en este dispositivo.' : 'Todo se guarda en tu hoja de cálculo de Google Drive, una pestaña por mes.'}</p>
            <div className="flex flex-wrap gap-2">
              {datos.urlHoja && <a href={datos.urlHoja} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 h-11 font-semibold text-sm bg-marca text-sobremarca"><ExternalLink size={15} />Abrir mi hoja</a>}
              <Boton variante="suave" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando' : 'Actualizar datos'}</Boton>
              <Boton variante="suave" onClick={() => descargarCSV(datos.movimientos)}>Descargar CSV</Boton>
            </div>
            <div className="border-t border-linea mt-4 pt-4">
              {confirmar
                ? <div className="flex flex-wrap items-center gap-2"><span className="text-sm">{conexion?.demo ? 'Se borrarán los datos de ejemplo.' : 'Tu hoja no se borra; solo se desconecta este dispositivo.'}</span><Boton variante="peligro" onClick={desconectar}>Sí, salir</Boton><Boton variante="suave" onClick={() => setConfirmar(false)}>Cancelar</Boton></div>
                : <Boton variante="peligro" onClick={() => setConfirmar(true)}>{conexion?.demo ? 'Salir del modo de ejemplo' : 'Desconectar este dispositivo'}</Boton>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function NuevaIngreso({ onAgregar, existentes }) {
  const [n, setN] = useState('');
  const agregar = () => { const v = n.trim(); if (v && !existentes.some((c) => c.nombre.toLowerCase() === v.toLowerCase())) { onAgregar(v); setN(''); } };
  return (
    <div className="flex gap-2 mt-3">
      <input value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Nombre nuevo" aria-label="Agregar categoría de ingreso" className={claseEntrada} />
      <Boton variante="suave" onClick={agregar}>Agregar</Boton>
    </div>
  );
}
