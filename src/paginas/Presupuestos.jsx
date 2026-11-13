import { useMemo, useState } from 'react';
import { useDatos } from '../store.jsx';
import { Barra, Boton, Encabezado, Panel, SelectorMes, claseEntrada } from '../ui.jsx';
import { dinero0, mesActual, pct, promedioPrevio, resumenMes, suma } from '../utils.js';

export default function Presupuestos() {
  const { datos, guardarConfig } = useDatos();
  const [mes, setMes] = useState(mesActual());
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({});
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const previo = useMemo(() => promedioPrevio(datos, mesActual(), 3), [datos]);
  const gasto = Object.fromEntries(r.porCategoria.map((c) => [c.nombre, c.total]));
  const cats = datos.categorias.filter((c) => c.tipo === 'Gasto');
  const conTope = cats.filter((c) => c.presupuesto > 0);
  const totalTope = suma(conTope, (c) => c.presupuesto);
  const totalGasto = suma(conTope, (c) => gasto[c.nombre] || 0);

  const abrir = () => { setBorrador(Object.fromEntries(cats.map((c) => [c.nombre, c.presupuesto || '']))); setEditando(true); };
  const usarPromedio = () => setBorrador(Object.fromEntries(cats.map((c) => [c.nombre, Math.ceil((previo.porCat[c.nombre] || 0) / 50) * 50 || ''])));
  const guardar = () => {
    guardarConfig('categorias', datos.categorias.map((c) => (c.tipo === 'Gasto' ? { ...c, presupuesto: Number(borrador[c.nombre]) || 0 } : c)));
    setEditando(false);
  };

  return (
    <>
      <Encabezado titulo="Presupuestos">{!editando && <SelectorMes mes={mes} onCambio={setMes} />}</Encabezado>

      {editando ? (
        <Panel titulo="Tope mensual por categoría" accion={previo.meses > 0 && <button type="button" className="text-sm font-semibold text-marca" onClick={usarPromedio}>Llenar con mi promedio</button>}>
          <ul className="space-y-2">
            {cats.map((c) => (
              <li key={c.nombre} className="flex items-center gap-3">
                <label htmlFor={`tope-${c.nombre}`} className="flex-1 min-w-0 text-sm truncate">{c.nombre}{previo.porCat[c.nombre] ? <span className="block text-xs text-suave">Promedio {dinero0(previo.porCat[c.nombre])}</span> : null}</label>
                <input id={`tope-${c.nombre}`} inputMode="numeric" placeholder="Sin tope" value={borrador[c.nombre] ?? ''} onChange={(e) => setBorrador({ ...borrador, [c.nombre]: e.target.value.replace(/\D/g, '') })} className={`${claseEntrada} !w-32 text-right cifra`} />
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-4"><Boton variante="suave" onClick={() => setEditando(false)}>Cancelar</Boton><Boton className="flex-1" onClick={guardar}>Guardar presupuestos</Boton></div>
        </Panel>
      ) : conTope.length === 0 ? (
        <Panel>
          <div className="text-center py-8">
            <p className="font-semibold">Ponle tope a tus categorías</p>
            <p className="text-sm text-suave mt-1 max-w-sm mx-auto">Define cuánto quieres gastar al mes en cada una. La app te avisa en Consejos cuando llegues al 80%.</p>
            <Boton className="mt-4" onClick={abrir}>Definir presupuestos</Boton>
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel>
            <div className="flex items-end justify-between mb-2">
              <div><p className="text-sm text-suave">Usado del presupuesto total</p><p className="cifra text-3xl font-bold">{dinero0(totalGasto)} <span className="text-base text-suave font-medium">de {dinero0(totalTope)}</span></p></div>
              <p className="cifra text-xl font-bold">{pct(totalGasto / totalTope)}</p>
            </div>
            <Barra valor={totalGasto} tope={totalTope} />
          </Panel>
          <Panel titulo="Por categoría" accion={<button type="button" className="text-sm font-semibold text-marca" onClick={abrir}>Cambiar topes</button>}>
            <ul className="space-y-4">
              {conTope.map((c) => {
                const g = gasto[c.nombre] || 0;
                const resto = c.presupuesto - g;
                return (
                  <li key={c.nombre}>
                    <div className="flex justify-between gap-3 text-sm mb-1.5">
                      <span className="font-medium truncate">{c.nombre}</span>
                      <span className="shrink-0"><span className="cifra font-bold">{dinero0(g)}</span> <span className="text-suave">de {dinero0(c.presupuesto)}</span></span>
                    </div>
                    <Barra valor={g} tope={c.presupuesto} />
                    <p className="text-xs mt-1" style={{ color: resto < 0 ? 'var(--gasto)' : 'var(--suave)' }}>{resto < 0 ? `Te pasaste por ${dinero0(-resto)}` : `Te quedan ${dinero0(resto)}`}</p>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
