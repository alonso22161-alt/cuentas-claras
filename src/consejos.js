// Recomendaciones por reglas: todo se calcula en tu dispositivo, sin costo y sin mandar tus datos a nadie.
import { dinero0, pct, resumenMes, promedioPrevio, mesActual, diasDelMes, hoyISO, suma, etiquetaMes } from './utils.js';

/** Devuelve una lista de { nivel: 'alerta' | 'idea' | 'bien', titulo, texto } para el mes indicado. */
export function generarConsejos(datos, ym) {
  const lista = [];
  const r = resumenMes(datos, ym);
  if (!r.movs.length) return lista;
  const previo = promedioPrevio(datos, ym, 3);
  const esMesActual = ym === mesActual();
  const dias = diasDelMes(ym);
  const avance = esMesActual ? Number(hoyISO().slice(8)) / dias : 1;
  const mes = etiquetaMes(ym);

  // Los gastos fijos no avanzan "parejo" en el mes, así que se separan de lo variable
  const esFijo = (m) => String(m.id).startsWith('FIJO-');
  const grupoDe = Object.fromEntries(datos.categorias.map((c) => [c.nombre, c.grupo]));
  const gastosMes = r.movs.filter((m) => m.tipo === 'Gasto' && grupoDe[m.categoria] !== 'Ahorro');
  const fijosHechos = suma(gastosMes.filter(esFijo), (m) => m.monto);
  const variable = r.consumo - fijosHechos;
  const fijosPorVenir = esMesActual
    ? suma(datos.recurrentes.filter((f) => f.activo && f.tipo === 'Gasto' && grupoDe[f.categoria] !== 'Ahorro' && !r.movs.some((m) => m.id === `FIJO-${f.id}-${ym}`)), (f) => f.monto)
    : 0;

  // 1. Ritmo del mes
  if (esMesActual && avance > 0.2 && avance < 1) {
    const proyeccion = fijosHechos + fijosPorVenir + variable / avance;
    const ingresoBase = Math.max(r.ingresos, previo.ingresos);
    const diasRestantes = dias * (1 - avance);
    if (ingresoBase > 0 && proyeccion > ingresoBase) {
      lista.push({ nivel: 'alerta', titulo: 'A este ritmo gastarás más de lo que ganas',
        texto: `Llevas ${dinero0(r.consumo)} y el mes va al ${pct(avance)}. Si sigues igual cerrarás cerca de ${dinero0(proyeccion)}, arriba de tus ingresos de ${dinero0(ingresoBase)}. Para cerrar parejo tendrías que gastar máximo ${dinero0(Math.max(0, (ingresoBase - r.consumo - fijosPorVenir) / diasRestantes))} por día.` });
    } else if (previo.meses && proyeccion > previo.consumo * 1.15) {
      lista.push({ nivel: 'alerta', titulo: 'Vas gastando más rápido que de costumbre',
        texto: `Tu proyección para ${mes} es ${dinero0(proyeccion)}; tu promedio reciente es ${dinero0(previo.consumo)}.` });
    } else if (ingresoBase > 0) {
      lista.push({ nivel: 'bien', titulo: 'Vas dentro de tus ingresos',
        texto: `Tu proyección para cerrar ${mes} es ${dinero0(proyeccion)} contra ingresos de ${dinero0(ingresoBase)}. Si mantienes el ritmo te sobrarían cerca de ${dinero0(ingresoBase - proyeccion)}.` });
    }
  }

  // 2. Presupuestos
  const gastoCat = Object.fromEntries(r.porCategoria.map((c) => [c.nombre, c.total]));
  const variableCat = {};
  gastosMes.filter((m) => !esFijo(m)).forEach((m) => { variableCat[m.categoria] = (variableCat[m.categoria] || 0) + m.monto; });
  datos.categorias.filter((c) => c.tipo === 'Gasto' && c.presupuesto > 0).forEach((c) => {
    const g = gastoCat[c.nombre] || 0;
    if (g > c.presupuesto) {
      lista.push({ nivel: 'alerta', titulo: `Te pasaste en ${c.nombre}`, texto: `Gastaste ${dinero0(g)} de un presupuesto de ${dinero0(c.presupuesto)} (${dinero0(g - c.presupuesto)} de más).` });
    } else if (esMesActual && g >= c.presupuesto * 0.8 && avance < 0.8 && variableCat[c.nombre] > 0) {
      lista.push({ nivel: 'alerta', titulo: `${c.nombre} está por agotarse`, texto: `Ya usaste ${pct(g / c.presupuesto)} del presupuesto y el mes va al ${pct(avance)}. Te quedan ${dinero0(c.presupuesto - g)}.` });
    }
  });

  // 3. Categorías que ya rebasaron lo que sueles gastar en un mes completo
  if (previo.meses >= 1) {
    r.porCategoria
      .map((c) => ({ ...c, base: previo.porCat[c.nombre] || 0 }))
      .filter((c) => c.base > 0 && c.total > c.base * 1.2 && c.total - c.base > 300)
      .slice(0, 3)
      .forEach((c) => lista.push({ nivel: 'alerta', titulo: `${c.nombre} subió ${pct(c.total / c.base - 1)}`,
        texto: `${esMesActual ? 'Llevas' : 'Gastaste'} ${dinero0(c.total)}; en un mes completo sueles gastar ${dinero0(c.base)}. Revisa en Movimientos qué cambió.` }));
  }

  // 4. Regla 50/30/20
  if (r.ingresos > 0) {
    const g = Object.fromEntries(r.porGrupo.map((x) => [x.nombre, x.total]));
    const nec = (g.Necesidad || 0) / r.ingresos, gus = (g.Gusto || 0) / r.ingresos;
    if (gus > 0.35) {
      lista.push({ nivel: 'idea', titulo: 'Tus gustos se llevan más del 30% de tu ingreso',
        texto: `Van en ${pct(gus)} (${dinero0(g.Gusto)}). La regla 50/30/20 sugiere tope de ${dinero0(r.ingresos * 0.3)}. Bajar ${dinero0(g.Gusto - r.ingresos * 0.3)} ahí es lo más fácil de mover a ahorro.` });
    }
    if (nec > 0.6) {
      lista.push({ nivel: 'idea', titulo: 'Tus gastos básicos pesan más del 50%',
        texto: `Representan ${pct(nec)} de tu ingreso. Aquí lo que más mueve la aguja es renegociar lo fijo: renta, planes de celular e internet, seguros y deudas.` });
    }
    // 5. Tasa de ahorro
    if (!esMesActual || avance > 0.9) {
      if (r.tasaAhorro < 0) lista.push({ nivel: 'alerta', titulo: `En ${mes} gastaste más de lo que ganaste`, texto: `La diferencia fue de ${dinero0(r.consumo - r.ingresos)}. Si se cubrió con tarjeta, dale prioridad a liquidarla antes de que genere intereses.` });
      else if (r.tasaAhorro < 0.1) lista.push({ nivel: 'idea', titulo: 'Tu ahorro está por debajo del 10%', texto: `Te quedó ${pct(r.tasaAhorro)} de tu ingreso. Prueba apartar el ahorro el mismo día que cobras, como si fuera un gasto fijo, y vivir con el resto.` });
      else if (r.tasaAhorro >= 0.2) lista.push({ nivel: 'bien', titulo: `Ahorraste ${pct(r.tasaAhorro)} de tu ingreso`, texto: `Son ${dinero0(r.ingresos - r.consumo)}. Estás en la meta del 20% o arriba. Lo que no tenga destino, llévalo a una meta o a un instrumento que te pague rendimiento.` });
    }
    // 6. Dinero parado
    if (r.balance > r.ingresos * 0.15 && r.apartado < r.ingresos * 0.05 && (!esMesActual || avance > 0.9)) {
      lista.push({ nivel: 'idea', titulo: 'Te sobró dinero sin destino', texto: `Quedaron ${dinero0(r.balance)} que no registraste como ahorro. Regístralo en la categoría de ahorro para que cuente en tus metas y no se diluya el mes siguiente.` });
    }
  }

  // 7. Gastos hormiga
  const hormiga = gastosMes.filter((m) => m.monto <= 150 && !esFijo(m));
  const totalHormiga = suma(hormiga, (m) => m.monto);
  if (hormiga.length >= 8 && totalHormiga > r.consumo * 0.05) {
    lista.push({ nivel: 'idea', titulo: `${hormiga.length} gastos chicos suman ${dinero0(totalHormiga)}`,
      texto: `Son compras de $150 o menos (${pct(totalHormiga / r.consumo)} de tu gasto). Al año serían cerca de ${dinero0(totalHormiga / avance * 12)}.` });
  }

  // 8. Crédito
  if (r.consumo > 0 && r.aCredito / r.consumo > 0.4) {
    lista.push({ nivel: 'idea', titulo: `${pct(r.aCredito / r.consumo)} de tu gasto va a crédito`,
      texto: `Llevas ${dinero0(r.aCredito)} con tarjeta de crédito. Asegúrate de tener ese monto apartado para pagar el total al corte y no financiarte con intereses.` });
  }

  // 9. Lo que más se repite
  const repetidos = {};
  r.movs.filter((m) => m.tipo === 'Gasto' && m.descripcion && !String(m.id).startsWith('FIJO-')).forEach((m) => {
    const k = m.descripcion.trim().toLowerCase();
    repetidos[k] = repetidos[k] || { nombre: m.descripcion.trim(), veces: 0, total: 0 };
    repetidos[k].veces++; repetidos[k].total += m.monto;
  });
  const top = Object.values(repetidos).filter((x) => x.veces >= 4).sort((a, b) => b.total - a.total)[0];
  if (top && r.consumo > 0 && top.total > r.consumo * 0.04) {
    lista.push({ nivel: 'idea', titulo: `"${top.nombre}" aparece ${top.veces} veces`, texto: `En total ${dinero0(top.total)}, unos ${dinero0(top.total / top.veces)} cada vez.` });
  }

  // 10. Estructura que falta
  const conPresupuesto = datos.categorias.filter((c) => c.tipo === 'Gasto' && c.presupuesto > 0).length;
  if (!conPresupuesto && previo.meses >= 1) {
    lista.push({ nivel: 'idea', titulo: 'Aún no tienes presupuestos', texto: 'En Presupuestos puedes llenarlos con un toque usando tu promedio de los últimos meses, y la app te avisará cuando llegues al 80%.' });
  }
  if (!datos.metas.length && previo.consumo > 0) {
    lista.push({ nivel: 'idea', titulo: 'Empieza por un fondo de emergencia', texto: `Tres meses de tus gastos son cerca de ${dinero0(previo.consumo * 3)}. Créalo como meta y ve registrando lo que apartes.` });
  }

  const orden = { alerta: 0, idea: 1, bien: 2 };
  return lista.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}
