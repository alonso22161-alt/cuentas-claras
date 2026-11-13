import { useDatos } from '../store.jsx';
import FormularioMov from '../FormularioMov.jsx';
import { Panel } from '../ui.jsx';
import { FilaMov } from './Movimientos.jsx';
import { dinero0, hoyISO, mesActual, resumenMes, suma } from '../utils.js';

export default function Capturar({ irA }) {
  const { datos } = useDatos();
  const r = resumenMes(datos, mesActual());
  const hoy = datos.movimientos.filter((m) => m.fecha === hoyISO() && m.tipo === 'Gasto');
  const recientes = [...datos.movimientos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Panel className="min-w-0"><FormularioMov /></Panel>
      <div className="space-y-4 min-w-0">
        <Panel>
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="text-sm text-suave">Gastado hoy</dt><dd className="cifra text-2xl font-bold">{dinero0(suma(hoy, (m) => m.monto))}</dd></div>
            <div><dt className="text-sm text-suave">Te queda este mes</dt><dd className="cifra text-2xl font-bold" style={{ color: r.balance < 0 ? 'var(--gasto)' : 'var(--ingreso)' }}>{dinero0(r.balance)}</dd></div>
          </dl>
        </Panel>
        {recientes.length > 0 && (
          <Panel titulo="Lo último que registraste" accion={<button type="button" className="text-sm font-semibold text-marca" onClick={() => irA('movimientos')}>Ver todo</button>}>
            <ul className="divide-y divide-linea -my-2">{recientes.map((m) => <FilaMov key={m.id} mov={m} conFecha />)}</ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
