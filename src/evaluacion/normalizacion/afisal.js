/* ═══════════════════════════════════════════════════════════════
   evaluacion/normalizacion/afisal.js
   Baremos AFISAL-INEFC (Rodríguez et al., 1998) para las 4 capacidades
   de la batería confirmada. Grupos 18-24 y 25-34 × masculino/femenino
   (población del proyecto: 18-30 años).

   Fuentes:
   - Batería y tablas 8, 9, 11, 12: afisal.pdf (Rodríguez et al.,
     Apunts Educación Física y Deportes 54:54-65).
   - Transcripción de trabajo: "Baremos según afisal por variable.docx"
     (texto para 18-24/25-34 + imágenes de las tablas 8, 9, 11 y 12).

   Derivación de cortes (tipo 'cortes_ordenados', 'inferior_inclusivo'):
   - mayor_mejor (prensión, flexibilidad, salto): cortes = límites
     inferiores de Bajo, Medio, Alto y Muy alto (">X" → X+1).
   - menor_mejor (equilibrio, nº intentos): cortes ascendentes =
     [límite_inf_Alto, límite_inf_Medio, límite_inf_Bajo, X+1 de "Muy
     bajo >X"]. Verificado valor por valor contra los intervalos.

   Correcciones documentadas a la Tabla 9 (equilibrio, erratas de origen):
   - Hombres "Muy bajo <10/<12" → ">10/>12" (a menos intentos mejor;
     las filas de mujeres usan ">" y los intervalos contiguos lo exigen).
   - Hombres 25-34: solape Medio 5-8 / Alto 2-7. La regla de límites
     asigna 7-8 a Medio y 2-4 a Alto; se deja constancia aquí.

   Protocolo de captura (bilateral):
   - Dinamometria: mejor intento de cada mano; el resultado es la SUMA
     de ambas manos. El baremo (Tabla 8) se aplica sobre esa suma.
   - Equilibrio: 2 intentos, uno por pierna; se cuenta cada vez que se
     baja el pie y el resultado es la SUMA de ambas piernas. El baremo
     se aplica sobre ese total.
   ═══════════════════════════════════════════════════════════════ */

const FUENTE_BAREMO = (tabla) => ({
  referencia: `AFISAL-INEFC: ${tabla} (Rodriguez et al., 1998). Transcripcion: Baremos segun afisal por variable.docx.`,
  origen: 'baremo',
});

function grupos2(from18, from25) {
  // from18/from25: { m: [4 cortes], f: [4 cortes] }
  return [
    { sexo: 'masculino', edadMin: 18, edadMax: 24, cortes: from18.m },
    { sexo: 'masculino', edadMin: 25, edadMax: 34, cortes: from25.m },
    { sexo: 'femenino', edadMin: 18, edadMax: 24, cortes: from18.f },
    { sexo: 'femenino', edadMin: 25, edadMax: 34, cortes: from25.f },
  ];
}

export const BAREMOS_AFISAL = [
  {
    id: 'afisal_dinamometria',
    capacidad: 'fuerza',
    version: '1.0-afisal',
    fuente: FUENTE_BAREMO('Tabla 8, fuerza maxima de prension (kg)'),
    tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor',
    limite: 'inferior_inclusivo',
    grupos: grupos2(
      { m: [72, 85, 98, 112], f: [39, 50, 61, 73] },
      { m: [69, 81, 93, 106], f: [32, 44, 56, 69] },
    ),
  },
  {
    id: 'afisal_salto_vertical',
    capacidad: 'fuerza_explosiva',
    version: '1.0-afisal',
    fuente: FUENTE_BAREMO('Tabla 12, salto vertical (cm)'),
    tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor',
    limite: 'inferior_inclusivo',
    grupos: grupos2(
      { m: [46, 53, 60, 68], f: [30, 36, 42, 49] },
      { m: [44, 49, 54, 61], f: [26, 33, 41, 50] },
    ),
  },
  {
    id: 'afisal_sit_and_reach',
    capacidad: 'flexibilidad',
    version: '1.0-afisal',
    fuente: FUENTE_BAREMO('Tabla 11, flexibilidad anterior del tronco (cm)'),
    tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor',
    limite: 'inferior_inclusivo',
    grupos: grupos2(
      { m: [23, 32, 40, 50], f: [31, 38, 45, 53] },
      { m: [20, 28, 37, 47], f: [28, 36, 44, 53] },
    ),
  },
  {
    id: 'afisal_equilibrio_monopodal',
    capacidad: 'equilibrio',
    version: '1.0-afisal',
    fuente: FUENTE_BAREMO('Tabla 9, equilibrio monopodal sin vision (n.º intentos en 1 min), con correcciones documentadas arriba'),
    tipo: 'cortes_ordenados',
    direccion: 'menor_mejor',
    limite: 'inferior_inclusivo',
    grupos: grupos2(
      { m: [2, 5, 7, 11], f: [2, 5, 8, 11] },
      { m: [2, 5, 9, 13], f: [2, 6, 11, 16] },
    ),
  },
];
