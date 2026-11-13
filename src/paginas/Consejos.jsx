import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { generarConsejos } from '../consejos.js';
import { Encabezado, Panel, SelectorMes, Vacio } from '../ui.jsx';
import { mesActual } from '../utils.js';

const ESTILO = {
  alerta: { Icono: AlertTriangle, color: 'var(--gasto)', nombre: 'Atención' },
  idea: { Icono: Lightbulb, color: 'var(--aviso)', nombre: 'Idea' },
  bien: { Icono: CheckCircle2, color: 'var(--ingreso)', nombre: 'Bien hecho' },
};

export default function Consejos() {
  const { datos } = useDatos();
  const [mes, setMes] = useState(mesActual());
  const lista = useMemo(() => generarConsejos(datos, mes), [datos, mes]);
  return (
    <>
      <Encabezado titulo="Consejos"><SelectorMes mes={mes} onCambio={setMes} /></Encabezado>
      {lista.length === 0 ? (
        <Panel><Vacio titulo="Nada que señalar">Con más movimientos registrados, aquí aparecerán avisos y recomendaciones basados en tus propios números.</Vacio></Panel>
      ) : (
        <ul className="space-y-3 max-w-2xl">
          {lista.map((c, i) => {
            const { Icono, color, nombre } = ESTILO[c.nivel];
            return (
              <li key={i} className="bg-panel border border-linea rounded-2xl p-4 flex gap-3" style={{ borderLeft: `4px solid ${color}` }}>
                <Icono size={20} style={{ color }} className="shrink-0 mt-0.5" aria-label={nombre} />
                <div><h2 className="font-semibold leading-snug">{c.titulo}</h2><p className="text-sm text-suave mt-1 leading-relaxed">{c.texto}</p></div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
