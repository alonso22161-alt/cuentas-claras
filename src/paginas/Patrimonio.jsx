import { useState } from 'react';
import { Gem, Landmark, Plus, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatos } from '../store.jsx';
import { BotonConfirmar, Boton, Campo, Hoja, Indicador, Panel, Rejilla, Vacio, claseEntrada, claseTabla, claseTd, claseTh, soloImporte } from '../ui.jsx';
import { Globo, corto, ejes } from './Dashboard.jsx';
import { dinero0, etiquetaDia, etiquetaMes, hoyISO, nuevoId, pct, suma } from '../utils.js';
import { TIPOS_ACTIVO, estadoDeuda, estadoTarjeta, patrimonio } from '../finanzas.js';

function FormularioActivo({ activo, onListo }) {
  const { datos, guardarConfig, avisar } = useDatos();
  const [f, setF] = useState(activo ? { ...activo, valor: String(activo.valor) } : { id: '', nombre: '', tipo: TIPOS_ACTIVO[0], valor: '' });
  function guardar() {
    if (!f.nombre.trim()) return avisar('Escribe el nombre del activo.');
    const valor = parseFloat(f.valor);
    if (!(valor >= 0) || f.valor === '') return avisar('Escribe el valor estimado.');
    const fila = { ...f, id: f.id || nuevoId(), nombre: f.nombre.trim(), valor, fecha: hoyISO() };
    guardarConfig('activos', f.id ? datos.activos.map((a) => (a.id === f.id ? fila : a)) : [...datos.activos, fila], 'Activo guardado');
    onListo();
  }
  return (
    <div className="space-y-3">
      <Campo etiqueta="Nombre"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Cuenta de ahorro, Cetes, auto" className={claseEntrada} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Tipo"><select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={claseEntrada}>{TIPOS_ACTIVO.map((t) => <option key={t}>{t}</option>)}</select></Campo>
        <Campo etiqueta="Valor estimado hoy"><input inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: soloImporte(e.target.value) })} className={claseEntrada} /></Campo>
      </div>
      <div className="flex items-center gap-2 pt-2">
        {f.id && <BotonConfirmar tam="md" pregunta="¿Borrar?" onConfirmar={() => { guardarConfig('activos', datos.activos.filter((a) => a.id !== f.id)); onListo(); }}>Eliminar</BotonConfirmar>}
        <Boton className="flex-1 h-11" onClick={guardar}>Guardar activo</Boton>
      </div>
    </div>
  );
}

export default function Patrimonio({ irA }) {
  const { datos } = useDatos();
  const [editando, setEditando] = useState(null);
  const p = patrimonio(datos);
  const pasivos = [
    ...datos.tarjetas.map((t) => ({ id: t.id, nombre: t.nombre, tipo: 'Tarjeta de crédito', saldo: estadoTarjeta(datos, t).saldo, ir: 'tarjetas' })),
    ...datos.deudas.map((d) => ({ id: d.id, nombre: d.nombre, tipo: d.acreedor || 'Deuda', saldo: estadoDeuda(datos, d).saldo, ir: 'deudas' })),
  ].filter((x) => x.saldo > 0);
  const porTipo = TIPOS_ACTIVO.map((t) => ({ t, total: suma(datos.activos.filter((a) => a.tipo === t), (a) => a.valor) })).filter((x) => x.total > 0);
  const evolucion = datos.historialPatrimonio.slice(-12).map((h) => ({ mes: etiquetaMes(h.mes), Activos: h.activos, Pasivos: h.pasivos, 'Patrimonio neto': h.neto }));
  const primero = datos.historialPatrimonio[0];

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Activos" valor={dinero0(p.activos)} tono="ingreso" Icono={Gem} nota={`${datos.activos.length} registrados`} />
        <Indicador etiqueta="Pasivos" valor={dinero0(p.pasivos)} tono={p.pasivos > 0 ? 'gasto' : undefined} Icono={Landmark} nota={`Tarjetas ${dinero0(p.tarjetas)} · Deudas ${dinero0(p.deudas)}`} />
        <Indicador etiqueta="Patrimonio neto" valor={dinero0(p.neto)} tono={p.neto < 0 ? 'gasto' : undefined} Icono={TrendingUp} nota="Lo que tienes menos lo que debes" />
        <Indicador etiqueta="Endeudamiento" valor={pct(p.activos ? p.pasivos / p.activos : 0)} nota={primero && primero.mes < datos.historialPatrimonio.at(-1).mes ? `Neto desde ${etiquetaMes(primero.mes)}: ${p.neto - primero.neto >= 0 ? '+' : ''}${dinero0(p.neto - primero.neto)}` : 'Pasivos entre activos'} />
      </Rejilla>

      <Panel titulo="Evolución del patrimonio" subtitulo="Se guarda una foto cada mes cuando cambian tus activos, tarjetas o deudas">
        {evolucion.length < 2 ? <p className="text-sm text-suave py-6 text-center">La gráfica aparecerá cuando haya al menos dos meses registrados.</p> : (
          <div className="h-[240px]">
            <ResponsiveContainer>
              <AreaChart data={evolucion} margin={{ left: -6, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="mes" {...ejes} />
                <YAxis {...ejes} tickFormatter={corto} width={48} />
                <Tooltip content={<Globo />} />
                <Area dataKey="Activos" stroke="var(--ingreso)" fill="var(--ingreso)" fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} />
                <Area dataKey="Pasivos" stroke="var(--gasto)" fill="var(--gasto)" fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} />
                <Area dataKey="Patrimonio neto" stroke="var(--tinta)" fill="none" strokeWidth={2.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Rejilla className="lg:grid-cols-2">
        <Panel titulo="Activos" subtitulo="Cuentas bancarias, inversiones, vehículos, propiedades y otros bienes" accion={<Boton onClick={() => setEditando({})}><Plus size={15} />Agregar activo</Boton>}>
          {datos.activos.length === 0 ? <Vacio titulo="Sin activos registrados">Agrega tus cuentas, inversiones y bienes con su valor estimado.</Vacio> : (
            <>
              <div className="overflow-x-auto">
                <table className={claseTabla}>
                  <thead><tr>{['Activo', 'Tipo', 'Valor', 'Actualizado', ''].map((h) => <th key={h} className={claseTh}>{h}</th>)}</tr></thead>
                  <tbody>
                    {datos.activos.map((a) => (
                      <tr key={a.id}>
                        <td className={`${claseTd} font-semibold`}>{a.nombre}</td>
                        <td className={`${claseTd} text-suave`}>{a.tipo}</td>
                        <td className={`${claseTd} cifra font-bold`}>{dinero0(a.valor)}</td>
                        <td className={`${claseTd} text-suave`}>{a.fecha ? etiquetaDia(a.fecha) : '—'}</td>
                        <td className={`${claseTd} text-right`}><Boton tam="sm" variante="texto" onClick={() => setEditando(a)}>Editar</Boton></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {porTipo.length > 1 && <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">{porTipo.map((x) => <li key={x.t}>{x.t}: <b className="text-tinta cifra">{pct(x.total / p.activos)}</b></li>)}</ul>}
            </>
          )}
        </Panel>
        <Panel titulo="Pasivos" subtitulo="Tarjetas y deudas con saldo, actualizados automáticamente">
          {pasivos.length === 0 ? <Vacio titulo="Sin pasivos">No tienes saldos pendientes en tarjetas ni deudas registradas.</Vacio> : (
            <ul className="divide-y divide-linea -my-1">
              {pasivos.map((x) => (
                <li key={`${x.ir}-${x.id}`}>
                  <button type="button" onClick={() => irA(x.ir)} className="w-full flex items-center gap-3 py-2.5 text-left hover:text-marca">
                    <span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate">{x.nombre}</span><span className="block text-xs text-suave">{x.tipo}</span></span>
                    <span className="cifra font-bold text-sm text-gasto">{dinero0(x.saldo)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Rejilla>

      {editando && <Hoja titulo={editando.id ? 'Editar activo' : 'Nuevo activo'} onCerrar={() => setEditando(null)}><FormularioActivo activo={editando.id ? editando : null} onListo={() => setEditando(null)} /></Hoja>}
    </div>
  );
}
