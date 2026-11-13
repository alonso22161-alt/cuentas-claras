import { useDatos } from '../store.jsx';
import { Panel, Rejilla } from '../ui.jsx';
import { FilaCompromiso } from './Calendario.jsx';
import { ListaMovs } from './Movimientos.jsx';
import { dinero0, etiquetaMes, suma } from '../utils.js';
import { estadoFijos, quincenas } from '../finanzas.js';

function Cifra({ etiqueta, valor, color }) {
  return <div className="rounded-[10px] bg-hundido/70 p-3 min-w-0"><p className="text-[11px] text-suave">{etiqueta}</p><p className="cifra font-bold text-base truncate" style={color ? { color } : undefined}>{dinero0(valor)}</p></div>;
}

export default function Quincenas({ mes }) {
  const { datos } = useDatos();
  const qs = quincenas(datos, mes);
  const esperados = estadoFijos(datos, mes, 'Ingreso');

  return (
    <div className="space-y-4">
      <Rejilla className="lg:grid-cols-2">
        {qs.map((q) => (
          <Panel key={q.nombre} titulo={q.nombre} subtitulo={`${q.rango} de ${etiquetaMes(mes)}`}>
            <div className="grid grid-cols-3 gap-2">
              <Cifra etiqueta="Ingresos" valor={q.ingresos} color="var(--ingreso)" />
              <Cifra etiqueta="Gastos" valor={q.gastos} color="var(--gasto)" />
              <Cifra etiqueta="Balance" valor={q.balance} color={q.balance < 0 ? 'var(--gasto)' : undefined} />
            </div>
            <div className="mt-3 rounded-[10px] border border-linea p-3 text-xs space-y-1">
              <p className="flex justify-between"><span className="text-suave">Ingresos esperados por recibir</span><b className="cifra text-ingreso">+{dinero0(q.esperado)}</b></p>
              <p className="flex justify-between"><span className="text-suave">Compromisos pendientes (fijos y deudas)</span><b className="cifra text-gasto">−{dinero0(q.pendiente)}</b></p>
              <p className="flex justify-between border-t border-linea pt-1.5 mt-1.5 text-sm"><span className="font-semibold">Disponible estimado</span><b className="cifra" style={{ color: q.disponible < 0 ? 'var(--gasto)' : 'var(--ingreso)' }}>{dinero0(q.disponible)}</b></p>
            </div>
            <h3 className="text-xs font-bold mt-5 mb-1">Compromisos del periodo</h3>
            {q.compromisos.length === 0 ? <p className="text-sm text-suave py-2">Sin compromisos programados.</p>
              : <ul className="divide-y divide-linea">{q.compromisos.map((c) => <FilaCompromiso key={c.clave} c={c} colorear />)}</ul>}
            <h3 className="text-xs font-bold mt-5 mb-2">Movimientos ({q.movs.length})</h3>
            <ListaMovs movs={[...q.movs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))} vacio="Sin movimientos en este periodo." />
          </Panel>
        ))}
      </Rejilla>
      <p className="text-[11px] text-suave">El disponible estimado suma lo que esperas recibir y resta lo que falta pagar en cada quincena. Los pagos de tarjeta se muestran como recordatorio pero no se restan, porque las compras ya contaron como gasto. {esperados.length === 0 && 'Agrega tus ingresos esperados en Ingresos para mejorar la estimación.'} Total esperado del mes: {dinero0(suma(esperados, (o) => o.fijo.monto))}.</p>
    </div>
  );
}
