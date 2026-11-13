import { useMemo, useState } from 'react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { Barra, Boton, Etiqueta, Indicador, Panel, Rejilla, claseEntrada } from '../ui.jsx';
import { dinero0, diasDelMes, hoyISO, mesActual, pct, promedioPrevio, resumenMes, suma } from '../utils.js';

export default function Presupuestos({ mes }) {
  const { datos, guardarConfig } = useDatos();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({});
  const r = useMemo(() => resumenMes(datos, mes), [datos, mes]);
  const previo = useMemo(() => promedioPrevio(datos, mesActual(), 3), [datos]);
  const gasto = Object.fromEntries(r.porCategoria.map((c) => [c.nombre, c.total]));
  const cats = datos.categorias.filter((c) => c.tipo === 'Gasto');
  const conTope = cats.filter((c) => c.presupuesto > 0);
  const totalTope = suma(conTope, (c) => c.presupuesto);
  const totalGasto = suma(conTope, (c) => gasto[c.nombre] || 0);
  const avanceMes = mes === mesActual() ? Number(hoyISO().slice(8)) / diasDelMes(mes) : 1;
  const excedidas = conTope.filter((c) => (gasto[c.nombre] || 0) > c.presupuesto);
  const cerca = conTope.filter((c) => { const g = gasto[c.nombre] || 0; return g <= c.presupuesto && g >= c.presupuesto * 0.8; });

  const abrir = () => { setBorrador(Object.fromEntries(cats.map((c) => [c.nombre, c.presupuesto || '']))); setEditando(true); };
  const usarPromedio = () => setBorrador(Object.fromEntries(cats.map((c) => [c.nombre, Math.ceil((previo.porCat[c.nombre] || 0) / 50) * 50 || ''])));
  const guardar = () => {
    guardarConfig('categorias', datos.categorias.map((c) => (c.tipo === 'Gasto' ? { ...c, presupuesto: Number(borrador[c.nombre]) || 0 } : c)), 'Presupuestos guardados');
    setEditando(false);
  };

  if (editando) {
    return (
      <Panel titulo="Límite mensual por categoría" subtitulo="Deja vacío lo que no quieras limitar"
        accion={previo.meses > 0 && <Boton variante="texto" tam="sm" onClick={usarPromedio}>Llenar con mi promedio</Boton>}>
        <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {cats.map((c) => (
            <li key={c.nombre} className="flex items-center gap-3">
              <label htmlFor={`tope-${c.nombre}`} className="flex-1 min-w-0 text-sm truncate">{c.nombre}{previo.porCat[c.nombre] ? <span className="block text-xs text-suave">Promedio {dinero0(previo.porCat[c.nombre])}</span> : null}</label>
              <input id={`tope-${c.nombre}`} inputMode="numeric" placeholder="Sin límite" value={borrador[c.nombre] ?? ''} onChange={(e) => setBorrador({ ...borrador, [c.nombre]: e.target.value.replace(/\D/g, '').slice(0, 9) })} className={`${claseEntrada} !w-32 text-right cifra`} />
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-5"><Boton variante="secundario" onClick={() => setEditando(false)}>Cancelar</Boton><Boton className="flex-1" onClick={guardar}>Guardar presupuestos</Boton></div>
      </Panel>
    );
  }

  if (!conTope.length) {
    return (
      <Panel>
        <div className="text-center py-10">
          <Wallet size={28} className="mx-auto text-marca mb-3" />
          <p className="font-semibold">Define límites mensuales por categoría</p>
          <p className="text-sm text-suave mt-1 max-w-sm mx-auto">Compara lo presupuestado contra lo que realmente gastas. La app te avisa al llegar al 80% y marca las categorías excedidas.</p>
          <Boton className="mt-5" onClick={abrir}>Definir presupuestos</Boton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Rejilla className="grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Presupuesto total" valor={dinero0(totalTope)} Icono={Wallet} nota={`${conTope.length} categorías con límite`} />
        <Indicador etiqueta="Gastado" valor={dinero0(totalGasto)} tono={totalGasto > totalTope ? 'gasto' : undefined} nota={`${pct(totalTope ? totalGasto / totalTope : 0)} consumido · mes al ${pct(avanceMes)}`} />
        <Indicador etiqueta="Disponible" valor={dinero0(Math.max(0, totalTope - totalGasto))} tono="ingreso" nota="Lo que queda dentro de tus límites" />
        <Indicador etiqueta="Categorías excedidas" valor={String(excedidas.length)} Icono={AlertTriangle} tono={excedidas.length ? 'gasto' : undefined} nota={cerca.length ? `${cerca.length} cerca del límite` : 'Ninguna cerca del límite'} />
      </Rejilla>

      {(excedidas.length > 0 || cerca.length > 0) && (
        <div className="rounded-[10px] border border-linea bg-panel p-4 space-y-1.5 text-sm">
          {excedidas.map((c) => <p key={c.nombre} className="flex gap-2"><AlertTriangle size={15} className="text-gasto shrink-0 mt-0.5" /><span><b>{c.nombre}</b> superó su límite por {dinero0((gasto[c.nombre] || 0) - c.presupuesto)}.</span></p>)}
          {cerca.map((c) => <p key={c.nombre} className="flex gap-2"><AlertTriangle size={15} className="text-aviso shrink-0 mt-0.5" /><span><b>{c.nombre}</b> va al {pct((gasto[c.nombre] || 0) / c.presupuesto)}; te quedan {dinero0(c.presupuesto - (gasto[c.nombre] || 0))}.</span></p>)}
        </div>
      )}

      <Panel titulo="Presupuestos por categoría" subtitulo="Límites mensuales contra lo que llevas gastado" accion={<Boton variante="secundario" onClick={abrir}>Editar límites</Boton>}>
        <Barra valor={totalGasto} tope={totalTope} alto="h-[9px]" />
        <ul className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {conTope.map((c) => {
            const g = gasto[c.nombre] || 0;
            const p = g / c.presupuesto;
            return (
              <li key={c.nombre}>
                <div className="flex justify-between gap-3 text-xs mb-1.5">
                  <span className="font-semibold truncate">{c.nombre} {p > 1 ? <Etiqueta tono="gasto">Excedido</Etiqueta> : p >= 0.8 ? <Etiqueta tono="aviso">Cerca del límite</Etiqueta> : null}</span>
                  <span className="shrink-0 cifra">{dinero0(g)} <span className="text-suave">de {dinero0(c.presupuesto)} · {pct(p)}</span></span>
                </div>
                <Barra valor={g} tope={c.presupuesto} alto="h-[9px]" />
                <p className="text-[11px] mt-1" style={{ color: p > 1 ? 'var(--gasto)' : 'var(--suave)' }}>{p > 1 ? `Has superado tu límite por ${dinero0(g - c.presupuesto)}` : `Disponible: ${dinero0(c.presupuesto - g)}`}</p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
