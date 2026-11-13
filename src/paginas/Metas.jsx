import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useDatos } from '../store.jsx';
import { Barra, Boton, Campo, Encabezado, Hoja, Panel, Vacio, claseEntrada } from '../ui.jsx';
import { dinero0, hoyISO, nuevoId, pct } from '../utils.js';

function mesesRestantes(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return null;
  const [y, m] = fecha.split('-').map(Number);
  const [hy, hm] = hoyISO().split('-').map(Number);
  return (y - hy) * 12 + (m - hm);
}

export default function Metas() {
  const { datos, guardarConfig, avisar } = useDatos();
  const [f, setF] = useState(null);
  const [abono, setAbono] = useState('');
  const lista = datos.metas;

  function guardar() {
    if (!f.nombre.trim() || !(Number(f.meta) > 0)) return avisar('Escribe el nombre y el monto de la meta.');
    const fila = { ...f, id: f.id || nuevoId(), nombre: f.nombre.trim(), meta: Number(f.meta), ahorrado: (Number(f.ahorrado) || 0) + (Number(abono) || 0) };
    guardarConfig('metas', f.id ? lista.map((x) => (x.id === f.id ? fila : x)) : [...lista, fila]);
    setF(null); setAbono('');
  }
  const borrar = () => { guardarConfig('metas', lista.filter((x) => x.id !== f.id)); setF(null); };
  const cerrar = () => { setF(null); setAbono(''); };

  return (
    <>
      <Encabezado titulo="Metas de ahorro"><Boton onClick={() => setF({ id: '', nombre: '', meta: '', ahorrado: '', fechaLimite: '' })}><Plus size={16} />Nueva meta</Boton></Encabezado>
      {lista.length === 0 ? (
        <Panel><Vacio titulo="Aún no tienes metas">Un fondo de emergencia, un viaje, el enganche de algo. Ponle monto y fecha, y ve registrando lo que apartas.</Vacio></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((m) => {
            const falta = Math.max(0, m.meta - m.ahorrado);
            const meses = mesesRestantes(m.fechaLimite);
            return (
              <button key={m.id} type="button" onClick={() => setF({ ...m })} className="text-left bg-panel border border-linea rounded-2xl p-5">
                <div className="flex justify-between gap-3 items-baseline">
                  <h2 className="font-semibold truncate">{m.nombre}</h2>
                  <span className="cifra font-bold text-lg">{pct(m.meta > 0 ? m.ahorrado / m.meta : 0)}</span>
                </div>
                <p className="cifra text-2xl font-bold mt-2 mb-2">{dinero0(m.ahorrado)} <span className="text-sm text-suave font-medium">de {dinero0(m.meta)}</span></p>
                <Barra valor={m.ahorrado} tope={m.meta} color="var(--ingreso)" />
                <p className="text-sm text-suave mt-2">
                  {falta === 0 ? 'Meta cumplida.' : meses == null ? `Faltan ${dinero0(falta)}.` : meses <= 0 ? `Faltan ${dinero0(falta)} y la fecha ya llegó.` : `Faltan ${dinero0(falta)}. Aparta ${dinero0(falta / meses)} al mes para llegar a tiempo.`}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {f && (
        <Hoja titulo={f.id ? 'Editar meta' : 'Nueva meta'} onCerrar={cerrar}>
          <div className="space-y-3">
            <Campo etiqueta="Nombre"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Fondo de emergencia" className={claseEntrada} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Monto de la meta"><input inputMode="decimal" value={f.meta} onChange={(e) => setF({ ...f, meta: e.target.value.replace(/[^0-9.]/g, '') })} className={claseEntrada} /></Campo>
              <Campo etiqueta="Ya tengo ahorrado"><input inputMode="decimal" value={f.ahorrado} onChange={(e) => setF({ ...f, ahorrado: e.target.value.replace(/[^0-9.]/g, '') })} className={claseEntrada} /></Campo>
            </div>
            {f.id && <Campo etiqueta="Agregar un abono ahora"><input inputMode="decimal" value={abono} onChange={(e) => setAbono(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={claseEntrada} /></Campo>}
            <Campo etiqueta="Fecha límite (opcional)"><input type="date" value={f.fechaLimite || ''} onChange={(e) => setF({ ...f, fechaLimite: e.target.value })} className={claseEntrada} /></Campo>
            <div className="flex gap-2 pt-1">{f.id && <Boton variante="peligro" onClick={borrar}>Borrar</Boton>}<Boton className="flex-1" onClick={guardar}>Guardar meta</Boton></div>
          </div>
        </Hoja>
      )}
    </>
  );
}
