import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Crown, Lightbulb, PiggyBank, Wallet } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { generarConsejos } from '../consejos.js';
import { Indicador, Panel, Rejilla, Vacio } from '../ui.jsx';
import { dinero0, etiquetaMes, mesActual, pct, resumenMes, suma } from '../utils.js';
import { estadoTarjeta, proyectar } from '../finanzas.js';

const ESTILO = {
  alerta: { Icono: AlertTriangle, color: 'var(--gasto)', fondo: 'var(--marca-suave)', nombre: 'Atención' },
  idea: { Icono: Lightbulb, color: 'var(--aviso)', fondo: 'var(--aviso-suave)', nombre: 'Recomendación' },
  bien: { Icono: CheckCircle2, color: 'var(--ingreso)', fondo: 'var(--ingreso-suave)', nombre: 'Bien hecho' },
};

export default function Analisis({ mes }) {
  const { datos } = useDatos();
  const lista = useMemo(() => generarConsejos(datos, mes), [datos, mes]);
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const capacidad = useMemo(() => proyectar(datos, 1)[0], [datos]);
  const tarjetas = datos.tarjetas.map((t) => estadoTarjeta(datos, t));
  const limite = suma(tarjetas, (e) => e.limite), usado = suma(tarjetas, (e) => e.saldo);
  const gasto = Object.fromEntries(r.porCategoria.map((c) => [c.nombre, c.total]));
  const excedidos = datos.categorias.filter((c) => c.tipo === 'Gasto' && c.presupuesto > 0 && (gasto[c.nombre] || 0) > c.presupuesto);
  const top = r.porCategoria[0];

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Capacidad de ahorro" valor={dinero0(capacidad.neto)} tono={capacidad.neto < 0 ? 'gasto' : 'ingreso'} Icono={PiggyBank} nota={capacidad.ingresos > 0 ? `${pct(capacidad.neto / capacidad.ingresos)} de tus ingresos esperados` : 'Estimado para el próximo mes'} />
        <Indicador etiqueta="Donde más gastas" valor={top ? dinero0(top.total) : '—'} Icono={Crown} nota={top ? `${top.nombre} · ${pct(top.total / r.gastos)} del gasto` : `Sin gastos en ${etiquetaMes(mes)}`} />
        <Indicador etiqueta="Uso de tarjetas" valor={limite ? pct(usado / limite) : '—'} Icono={CreditCard} tono={limite && usado / limite >= 0.7 ? 'gasto' : limite && usado / limite >= 0.3 ? 'aviso' : undefined} nota={limite ? `${dinero0(usado)} de ${dinero0(limite)}` : 'Sin tarjetas registradas'} />
        <Indicador etiqueta="Presupuestos excedidos" valor={String(excedidos.length)} Icono={Wallet} tono={excedidos.length ? 'gasto' : undefined} nota={excedidos.length ? excedidos.map((c) => c.nombre).slice(0, 2).join(', ') : 'Todo dentro del límite'} />
      </Rejilla>

      <Panel titulo="Alertas y recomendaciones" subtitulo={`Calculadas con tus propios números${mes === mesActual() ? '' : ` de ${etiquetaMes(mes)}`}. Todo se calcula en tu dispositivo.`}>
        {lista.length === 0 ? (
          <Vacio titulo="Nada que señalar">Con más movimientos registrados, aquí aparecerán avisos y recomendaciones basados en tus propios números.</Vacio>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {lista.map((c, i) => {
              const { Icono, color, fondo, nombre } = ESTILO[c.nivel];
              return (
                <li key={i} className="border border-linea rounded-xl p-4 flex gap-3">
                  <span className="h-9 w-9 rounded-[10px] grid place-items-center shrink-0" style={{ background: fondo, color }}><Icono size={17} aria-label={nombre} /></span>
                  <div className="min-w-0"><h3 className="font-semibold text-sm leading-snug">{c.titulo}</h3><p className="text-xs text-suave mt-1 leading-relaxed">{c.texto}</p></div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
