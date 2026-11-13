import { useState } from 'react';
import { CalendarCheck, Clock, Plus, Repeat } from 'lucide-react';
import { useDatos } from '../store.jsx';
import FormularioFijo, { movDeOcurrencia } from '../FormularioFijo.jsx';
import { BotonConfirmar, Boton, Etiqueta, Hoja, Indicador, Panel, Rejilla, Vacio, claseTabla, claseTd, claseTh } from '../ui.jsx';
import { MESES, dinero0, etiquetaMes, suma } from '../utils.js';
import { equivalenteMensual, estadoFijos, ocurrencias } from '../finanzas.js';

function cuando(f) {
  if (f.frecuencia === 'Anual') return `${f.dia} de ${MESES[(Number(f.mes) || 1) - 1]}`;
  if (f.frecuencia === 'Quincenal') { const otro = f.dia <= 15 ? f.dia + 15 : f.dia - 15; return `Días ${Math.min(f.dia, otro)} y ${Math.max(f.dia, otro)}`; }
  if (f.frecuencia === 'Semanal') return `Cada 7 días desde el ${((f.dia - 1) % 7) + 1}`;
  return `Día ${f.dia}`;
}

/** Tabla de fijos de un tipo con su estado en el mes: pagado/recibido o pendiente. */
export function TablaFijos({ tipo, mes }) {
  const { datos, guardarMov, borrarMov, guardarConfig } = useDatos();
  const [editando, setEditando] = useState(null);
  const porId = new Map(datos.movimientos.map((m) => [m.id, m]));
  const lista = datos.recurrentes.filter((f) => f.tipo === tipo);
  const hecho = tipo === 'Ingreso' ? 'Recibido' : 'Pagado';
  const corta = (fecha) => `${Number(fecha.slice(8))} ${MESES[Number(fecha.slice(5, 7)) - 1]}`;

  const filas = lista.map((f) => {
    const oc = ocurrencias(f, mes).map((o) => ({ ...o, fijo: f, mov: porId.get(o.id), pagado: porId.has(o.id) }));
    const pendientes = oc.filter((o) => !o.pagado);
    const pagadas = oc.filter((o) => o.pagado);
    // Cómo y cuándo quedó pagado: así se distingue lo que registró el script solo
    const ultimo = pagadas.at(-1)?.mov;
    const detalle = ultimo && <span className="block text-[10px] text-suave mt-0.5">{/automático/i.test(ultimo.notas) ? 'Automático' : 'Registrado'} el {corta(ultimo.fecha)}</span>;
    let estado;
    if (!oc.length) estado = <Etiqueta>No toca este mes</Etiqueta>;
    else if (!pendientes.length) estado = <><Etiqueta tono="ingreso">{hecho}</Etiqueta>{detalle}</>;
    else if (!f.activo && !pagadas.length) estado = <Etiqueta>Pausado</Etiqueta>;
    else estado = <><Etiqueta tono="aviso">Pendiente{oc.length > 1 ? ` ${pagadas.length}/${oc.length}` : ''}</Etiqueta>{detalle}</>;
    return { f, oc, pendientes, ultimo, estado };
  });
  const marcar = (o) => guardarMov(movDeOcurrencia(o), undefined, `${o.fijo.descripcion}: ${hecho.toLowerCase()}`);
  const desmarcar = (mov) => borrarMov(mov);
  const quitar = (ultimo) => ultimo && <BotonConfirmar tam="sm" variante="secundario" pregunta="¿Quitar el pago?" onConfirmar={() => desmarcar(ultimo)}>Desmarcar</BotonConfirmar>;
  const pausar = (f) => guardarConfig('recurrentes', datos.recurrentes.map((x) => (x.id === f.id ? { ...x, activo: !x.activo } : x)), f.activo ? 'Pausado' : 'Activado');

  if (!lista.length) return <Vacio titulo={tipo === 'Ingreso' ? 'Sin ingresos esperados' : 'Sin gastos fijos'}>{tipo === 'Ingreso' ? 'Registra tu sueldo, comisiones u otros ingresos que recibes con regularidad.' : 'Agrega renta, servicios, seguros, suscripciones o colegiaturas.'}</Vacio>;

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className={claseTabla}>
          <thead><tr>{['Concepto', 'Categoría', 'Frecuencia', 'Cuándo', 'Importe', 'Registro', `Estado en ${etiquetaMes(mes)}`, ''].map((h) => <th key={h} className={claseTh}>{h}</th>)}</tr></thead>
          <tbody>
            {filas.map(({ f, pendientes, ultimo, estado }) => (
              <tr key={f.id} className={f.activo ? '' : 'opacity-55'}>
                <td className={claseTd}><b className="font-semibold">{f.descripcion}</b></td>
                <td className={`${claseTd} text-suave`}>{f.categoria}</td>
                <td className={claseTd}>{f.frecuencia}</td>
                <td className={claseTd}>{cuando(f)}</td>
                <td className={`${claseTd} cifra font-bold`}>{dinero0(f.monto)}{f.frecuencia !== 'Mensual' && <span className="block text-[10px] text-suave font-normal">{dinero0(equivalenteMensual(f))} al mes</span>}</td>
                <td className={`${claseTd} text-suave`}>{f.automatico ? 'Automático' : 'Manual'}</td>
                <td className={claseTd}>{estado}</td>
                <td className={`${claseTd} text-right space-x-1`}>
                  {f.activo && pendientes.length > 0 && <Boton tam="sm" variante="secundario" onClick={() => marcar(pendientes[0])}>Marcar {hecho.toLowerCase()}</Boton>}
                  {quitar(ultimo)}
                  <Boton tam="sm" variante="texto" onClick={() => pausar(f)}>{f.activo ? 'Pausar' : 'Activar'}</Boton>
                  <Boton tam="sm" variante="texto" onClick={() => setEditando(f)}>Editar</Boton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-linea -my-1">
        {filas.map(({ f, pendientes, ultimo, estado }) => (
          <li key={f.id} className={`py-3 ${f.activo ? '' : 'opacity-55'}`}>
            <button type="button" onClick={() => setEditando(f)} className="w-full flex items-start gap-3 text-left">
              <span className="h-10 w-10 rounded-[10px] grid place-items-center bg-hundido shrink-0 text-xs font-bold cifra">{f.dia}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold text-sm truncate">{f.descripcion}</span><span className="block text-xs text-suave truncate">{f.frecuencia} · {cuando(f)} · {f.automatico ? 'Automático' : 'Manual'}</span><span className="block mt-1">{estado}</span></span>
              <span className="cifra font-bold text-sm">{dinero0(f.monto)}</span>
            </button>
            {((f.activo && pendientes.length > 0) || ultimo) && (
              <div className="mt-2 pl-[52px] flex flex-wrap gap-1.5">
                {f.activo && pendientes.length > 0 && <Boton tam="sm" variante="secundario" onClick={() => marcar(pendientes[0])}>Marcar {hecho.toLowerCase()}</Boton>}
                {quitar(ultimo)}
              </div>
            )}
          </li>
        ))}
      </ul>
      {editando && <Hoja titulo="Editar" onCerrar={() => setEditando(null)}><FormularioFijo fijo={editando} onListo={() => setEditando(null)} /></Hoja>}
    </>
  );
}

export default function Fijos({ mes }) {
  const { datos } = useDatos();
  const [nuevo, setNuevo] = useState(false);
  const activos = datos.recurrentes.filter((f) => f.activo && f.tipo === 'Gasto');
  const oc = estadoFijos(datos, mes);
  const pagado = suma(oc.filter((o) => o.pagado), (o) => o.fijo.monto);
  const total = suma(oc, (o) => o.fijo.monto);

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Compromiso mensual" valor={dinero0(suma(activos, equivalenteMensual))} Icono={Repeat} nota={`${activos.length} gastos fijos activos`} />
        <Indicador etiqueta={`Programado en ${etiquetaMes(mes)}`} valor={dinero0(total)} Icono={CalendarCheck} nota={`${oc.length} pagos en el mes`} />
        <Indicador etiqueta="Pagado" valor={dinero0(pagado)} tono="ingreso" nota={`${oc.filter((o) => o.pagado).length} de ${oc.length} pagos`} />
        <Indicador etiqueta="Pendiente" valor={dinero0(total - pagado)} tono={total - pagado > 0 ? 'gasto' : undefined} Icono={Clock} nota="Por cubrir este mes" />
      </Rejilla>
      <Panel titulo="Gastos fijos y recurrentes" subtitulo="Renta, servicios, seguros, suscripciones, colegiaturas y otros compromisos"
        accion={<Boton onClick={() => setNuevo(true)}><Plus size={15} />Nuevo gasto fijo</Boton>}>
        <TablaFijos tipo="Gasto" mes={mes} />
        <p className="text-[11px] text-suave mt-4">Los automáticos se registran solos el día que toca. Los manuales son planeación: no se descuentan del balance hasta que los marques como pagados. Ambos aparecen en el calendario y en las proyecciones.</p>
      </Panel>
      {nuevo && <Hoja titulo="Nuevo gasto fijo" onCerrar={() => setNuevo(false)}><FormularioFijo tipo="Gasto" onListo={() => setNuevo(false)} /></Hoja>}
    </div>
  );
}
