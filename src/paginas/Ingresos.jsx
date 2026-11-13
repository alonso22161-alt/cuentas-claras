import { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarClock, Plus, Scale, Target } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatos } from '../store.jsx';
import FormularioFijo from '../FormularioFijo.jsx';
import { Boton, Hoja, Indicador, Panel, Rejilla } from '../ui.jsx';
import { ListaMovs } from './Movimientos.jsx';
import { TablaFijos } from './Fijos.jsx';
import { Globo, corto, ejes } from './Dashboard.jsx';
import { MESES, dinero0, etiquetaMes, moverMes, pct, resumenMes, suma } from '../utils.js';
import { estadoFijos } from '../finanzas.js';

export default function Ingresos({ mes, abrirMov }) {
  const { datos } = useDatos();
  const [nuevo, setNuevo] = useState(false);
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const recibidos = r.movs.filter((m) => m.tipo === 'Ingreso').sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const esperados = estadoFijos(datos, mes, 'Ingreso');
  const esperado = suma(esperados, (o) => o.fijo.monto);
  const porRecibir = suma(esperados.filter((o) => !o.pagado), (o) => o.fijo.monto);
  const extra = suma(recibidos.filter((m) => !String(m.id).startsWith('FIJO-')), (m) => m.monto);

  const historial = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const ym = moverMes(mes, i - 5);
    return {
      mes: MESES[Number(ym.slice(5)) - 1],
      Recibido: resumenMes(datos, ym).ingresos,
      Esperado: suma(estadoFijos(datos, ym, 'Ingreso'), (o) => o.fijo.monto) || null,
    };
  }), [datos, mes]);

  const porCategoria = Object.entries(recibidos.reduce((o, m) => ({ ...o, [m.categoria]: (o[m.categoria] || 0) + m.monto }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Recibido este mes" valor={dinero0(r.ingresos)} tono="ingreso" Icono={ArrowUpRight} nota={`${recibidos.length} ingresos registrados`} />
        <Indicador etiqueta="Esperado este mes" valor={dinero0(esperado)} Icono={Target} nota={esperado ? `Llevas ${pct(Math.min(r.ingresos, esperado) / esperado)} de lo esperado` : 'Agrega tus ingresos esperados'} />
        <Indicador etiqueta="Por recibir" valor={dinero0(porRecibir)} Icono={CalendarClock} tono={porRecibir > 0 ? 'aviso' : undefined} nota={`${esperados.filter((o) => !o.pagado).length} pagos pendientes`} />
        <Indicador etiqueta="Ingresos adicionales" valor={dinero0(extra)} Icono={Scale} nota="Bonos, comisiones y otros no programados" />
      </Rejilla>

      <Panel titulo="Ingresos mensuales esperados" subtitulo="Sueldo, comisiones u otros ingresos que recibes con regularidad. Se comparan con lo realmente recibido."
        accion={<Boton variante="secundario" onClick={() => setNuevo(true)}><Plus size={15} />Ingreso esperado</Boton>}>
        <TablaFijos tipo="Ingreso" mes={mes} />
      </Panel>

      <Rejilla className="lg:grid-cols-[1.4fr_0.6fr]">
        <Panel titulo="Ingresos recibidos" subtitulo={`Sueldo, ingresos extra, bonos y otras entradas · ${etiquetaMes(mes)}`}
          accion={<Boton onClick={() => abrirMov('Ingreso')}><Plus size={15} />Agregar ingreso</Boton>}>
          <ListaMovs movs={recibidos} vacio="No hay ingresos registrados en este mes." />
        </Panel>
        <div className="space-y-4 min-w-0">
          <Panel titulo="Por categoría">
            {porCategoria.length === 0 ? <p className="text-sm text-suave">Sin ingresos este mes.</p> : (
              <ul className="space-y-2 text-sm">{porCategoria.map(([c, t]) => <li key={c} className="flex justify-between gap-2"><span className="truncate">{c}</span><span className="cifra font-semibold">{dinero0(t)}</span></li>)}</ul>
            )}
          </Panel>
          <Panel titulo="Historial" subtitulo="Recibido contra esperado, últimos 6 meses">
            <div className="h-44">
              <ResponsiveContainer>
                <ComposedChart data={historial} margin={{ left: -14, right: 4, top: 6 }}>
                  <CartesianGrid stroke="var(--linea)" vertical={false} />
                  <XAxis dataKey="mes" {...ejes} />
                  <YAxis {...ejes} tickFormatter={corto} width={44} />
                  <Tooltip cursor={{ fill: 'var(--hundido)' }} content={<Globo />} />
                  <Bar dataKey="Recibido" fill="var(--ingreso)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Line dataKey="Esperado" stroke="var(--suave)" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </Rejilla>

      {nuevo && <Hoja titulo="Nuevo ingreso esperado" onCerrar={() => setNuevo(false)}><FormularioFijo tipo="Ingreso" onListo={() => setNuevo(false)} /></Hoja>}
    </div>
  );
}
