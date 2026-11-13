import { useState } from 'react';
import { Plus, Target, Trophy } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioPago from '../FormularioPago.jsx';
import { Barra, BotonConfirmar, Boton, Campo, Hoja, Indicador, Panel, Rejilla, Vacio, claseEntrada, soloImporte } from '../ui.jsx';
import { dinero0, etiquetaDia, nuevoId, pct, suma } from '../utils.js';
import { estadoMeta } from '../finanzas.js';

function FormularioMeta({ meta, onListo }) {
  const { datos, guardarConfig, avisar } = useDatos();
  const [f, setF] = useState(meta ? { ...meta, meta: String(meta.meta), ahorrado: String(meta.ahorrado || '') } : { id: '', nombre: '', meta: '', ahorrado: '', fechaLimite: '' });
  const lista = datos.metas;
  function guardar() {
    if (!f.nombre.trim()) return avisar('Escribe el nombre de la meta.');
    if (!(parseFloat(f.meta) > 0)) return avisar('La cantidad objetivo debe ser mayor a cero.');
    const fila = { ...f, id: f.id || nuevoId(), nombre: f.nombre.trim(), meta: parseFloat(f.meta), ahorrado: parseFloat(f.ahorrado) || 0 };
    guardarConfig('metas', f.id ? lista.map((x) => (x.id === f.id ? fila : x)) : [...lista, fila], 'Meta guardada');
    onListo();
  }
  return (
    <div className="space-y-3">
      <Campo etiqueta="Nombre de la meta"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Fondo de emergencia" className={claseEntrada} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Cantidad objetivo"><input inputMode="decimal" value={f.meta} onChange={(e) => setF({ ...f, meta: soloImporte(e.target.value) })} className={claseEntrada} /></Campo>
        <Campo etiqueta="Ahorrado antes de la app" ayuda="Las aportaciones se suman aparte"><input inputMode="decimal" value={f.ahorrado} onChange={(e) => setF({ ...f, ahorrado: soloImporte(e.target.value) })} placeholder="0" className={claseEntrada} /></Campo>
      </div>
      <Campo etiqueta="Fecha objetivo (opcional)"><input type="date" value={f.fechaLimite || ''} onChange={(e) => setF({ ...f, fechaLimite: e.target.value })} className={claseEntrada} /></Campo>
      <div className="flex items-center gap-2 pt-1">
        {f.id && <BotonConfirmar tam="md" pregunta="¿Borrar la meta?" onConfirmar={() => { guardarConfig('metas', lista.filter((x) => x.id !== f.id)); onListo(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>Guardar meta</Boton>
      </div>
    </div>
  );
}

export default function Metas() {
  const { datos } = useDatos();
  const [editando, setEditando] = useState(null);
  const [aportando, setAportando] = useState(null);
  const [historial, setHistorial] = useState(null);
  const estados = datos.metas.map((m) => ({ m, e: estadoMeta(datos, m) }));
  const totalMeta = suma(estados, (x) => x.e.meta), totalAhorro = suma(estados, (x) => x.e.ahorrado);

  return (
    <div className="space-y-4">
      {estados.length > 0 && (
        <Rejilla className="grid-cols-2 xl:grid-cols-4">
          <Indicador etiqueta="Ahorrado en metas" valor={dinero0(totalAhorro)} tono="ingreso" Icono={Target} nota={`De ${dinero0(totalMeta)} en total`} />
          <Indicador etiqueta="Avance general" valor={pct(totalMeta ? totalAhorro / totalMeta : 0)} nota={`Faltan ${dinero0(Math.max(0, totalMeta - totalAhorro))}`} />
          <Indicador etiqueta="Metas cumplidas" valor={`${estados.filter((x) => x.e.falta === 0).length} de ${estados.length}`} Icono={Trophy} />
          <Indicador etiqueta="Aportación mensual sugerida" valor={dinero0(suma(estados, (x) => x.e.porMes || 0))} nota="Para llegar a tiempo a las fechas objetivo" />
        </Rejilla>
      )}
      <Panel titulo="Metas de ahorro" subtitulo="Dale un propósito a tu dinero" accion={<Boton onClick={() => setEditando({})}><Plus size={15} />Nueva meta</Boton>}>
        {estados.length === 0 ? (
          <Vacio titulo="Aún no tienes metas">Un fondo de emergencia, un viaje, el enganche de algo. Ponle cantidad y fecha, y registra tus aportaciones.</Vacio>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {estados.map(({ m, e }) => (
              <div key={m.id} className="border border-linea rounded-xl p-4">
                <div className="flex justify-between gap-3 items-baseline">
                  <h3 className="font-bold text-sm truncate">{m.nombre}</h3>
                  <b className="cifra text-sm shrink-0">{dinero0(e.ahorrado)} <span className="text-suave font-medium">/ {dinero0(e.meta)}</span></b>
                </div>
                <div className="my-3"><Barra valor={e.ahorrado} tope={e.meta} color="var(--ingreso)" alto="h-[9px]" /></div>
                <p className="text-xs text-suave">
                  {pct(e.avance)} completado · {e.falta === 0 ? 'Meta cumplida' : `Faltan ${dinero0(e.falta)}`}
                  {e.falta > 0 && m.fechaLimite && (e.mesesRestantes > 0 ? ` · Aparta ${dinero0(e.porMes)} al mes para llegar el ${etiquetaDia(m.fechaLimite)}` : ' · La fecha objetivo ya pasó')}
                </p>
                <div className="flex flex-wrap gap-1 mt-3 -ml-1">
                  <Boton tam="sm" variante="secundario" onClick={() => setAportando(m)}><Plus size={13} />Aportar</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setHistorial(historial === m.id ? null : m.id)}>Historial ({e.aportaciones.length})</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setEditando(m)}>Editar</Boton>
                </div>
                {historial === m.id && (
                  <ul className="mt-3 border-t border-linea pt-2 space-y-1.5 text-xs">
                    {e.aportaciones.length === 0 && <li className="text-suave">Sin aportaciones registradas.{Number(m.ahorrado) > 0 && ` Saldo inicial: ${dinero0(m.ahorrado)}.`}</li>}
                    {e.aportaciones.map((a) => <li key={a.id} className="flex justify-between"><span className="text-suave first-letter:uppercase">{etiquetaDia(a.fecha)} · {a.formaPago}</span><b className="cifra">{dinero0(a.monto)}</b></li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
      {editando && <Hoja titulo={editando.id ? 'Editar meta' : 'Nueva meta de ahorro'} onCerrar={() => setEditando(null)}><FormularioMeta meta={editando.id ? editando : null} onListo={() => setEditando(null)} /></Hoja>}
      {aportando && <Hoja titulo={`Aportar a ${aportando.nombre}`} onCerrar={() => setAportando(null)}><FormularioPago clase="meta" item={aportando} onListo={() => setAportando(null)} /></Hoja>}
    </div>
  );
}
