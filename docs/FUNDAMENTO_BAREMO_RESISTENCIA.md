# Fundamento del baremo de resistencia aeróbica (test de Léger)

Documento de respaldo metodológico. Código: `src/evaluacion/normalizacion/leger.js`. Datos y cálculo: `Baremo_Leger_PhysicalPicking.xlsx`.

## 1. Qué se mide y cómo se estima el VO2máx
- Prueba: course navette de 20 m con etapas de 1 minuto. La velocidad del nivel `n` es `V = 8 + 0,5 × n` km/h (nivel 1 = 8,5 km/h). Se registra el último nivel completado (entero, 1-21).
- Estimación: `VO2máx = 6,0 × V − 27,4` ml/kg/min. Es la ecuación de adultos de Léger et al. (1988): la ecuación general depende de la edad y para adultos se fija la edad en 18, lo que da 6,0 × V − 27,4 (la validación en adultos de Léger y Gadoury, 1989, informa esa misma ecuación).
- Validez: en adultos, el metaanálisis de Mayorga-Vega et al. (2015) estima una validez de criterio alta frente al VO2máx medido (r ≈ 0,94; IC 0,87-1,00). Es una estimación, no una medición directa.
- Corrección R-BAR-02 (oct. 2026): la versión anterior usaba −24,4, una constante sin fuente verificada. Al ser el baremo relativo a la muestra, el cambio desplaza el VO2 de cada nivel y los cortes por igual (−3,0): ningún nivel cambia de categoría.

## 2. Por qué un baremo propio
- AFISAL-INEFC no baremiza el test de Léger: su Tabla 13 corresponde al VO2máx estimado con caminata de 2 km.
- Las normas Eurofit del test de 20 m que se hallaron son para 9-17 años, fuera de la población objetivo (18-30).
- No se encontraron normas publicadas de Léger para adultos jóvenes de la población objetivo. Se construye un baremo con el mismo método que usa AFISAL.
- La Tabla 13 no se aplica a Léger porque proviene de otra prueba y no hay evidencia de equivalencia entre ambas estimaciones.

## 3. Método (el de AFISAL)
Rodríguez et al. (1998, parte II) definen cinco categorías por puntuación z dentro de cada sexo: z < −1,5 muy bajo; −1,5 ≤ z < −0,5 bajo; −0,5 ≤ z ≤ 0,5 medio; 0,5 < z ≤ 1,5 alto; z > 1,5 muy alto. Aquí cada corte es `media + z × DE` del VO2 estimado de la muestra, por sexo (DE muestral). Se verificó la normalidad (Shapiro-Wilk, p > 0,05 en ambos sexos). Por construcción, cada categoría agrupa aproximadamente 7 / 24 / 38 / 24 / 7 % de la muestra.

## 4. Cortes resultantes (VO2máx, ml/kg/min)
| Sexo | n | Bajo desde | Medio desde | Alto desde | Muy alto desde |
|---|---|---|---|---|---|
| Hombres | 41 | 31,41 (nivel 4) | 38,50 (nivel 6) | 45,58 (nivel 9) | 52,67 (nivel 11) |
| Mujeres | 17 | 25,84 (nivel 2) | 31,64 (nivel 4) | 37,44 (nivel 6) | 43,25 (nivel 8) |

Entre paréntesis, el menor nivel de Léger que alcanza cada categoría. `test/baremos.test.js` reproduce estos cortes a partir de los 58 niveles de la muestra y la clasificación de cada registro del Excel.

## 5. Comprobación de plausibilidad (no es validación)
Con la ecuación publicada, el VO2 medio de la muestra es 42,0 ml/kg/min en hombres y 34,5 en mujeres. En la Tabla 13 de AFISAL esos valores caen en la categoría Medio para ambos sexos (hombres: 40-49 a los 18-24 años y 35-44 a los 25-34; mujeres: 30-39 a los 18-24 y en el límite Medio/Alto a los 25-34). La muestra no es atípica frente a la referencia publicada, aunque son pruebas distintas.

## 6. Limitaciones que deben declararse
- Baremo provisional, sin validación externa ni juicio de expertos (prototipo).
- Es relativo a la muestra: indica la posición frente a ella, no aptitud absoluta ni estado de salud.
- Muestra por conveniencia; el grupo femenino (n = 17) es preliminar. [Completar: institución y fechas de recolección.]
- Edad 18-30 años; nivel entero (las idas del último nivel no se usan).
- Verificar que el audio usado empieza igual: la guía de la Diputación de Málaga arranca la fase 1 en 8,0 km/h (el código usa 8,5); desde la fase 2 coinciden, así que solo afectaría al nivel 1.
- Trabajo futuro: sustituir por normas poblacionales de adultos cuando existan.

## 7. Texto sugerido para la monografía
> El test de Léger no cuenta con baremo en AFISAL-INEFC, cuya referencia de VO2máx corresponde a la caminata de 2 km, ni con normas Eurofit para adultos de 18 a 30 años. Se estimó el VO2máx con la ecuación de adultos de Léger et al. (1988), VO2máx = 6,0 × V − 27,4, y se construyó un baremo provisional por sexo con el método de puntuaciones z de AFISAL-INEFC (Rodríguez et al., 1998) sobre una muestra de 58 personas. Los niveles expresan la posición relativa respecto a esa muestra y no constituyen un estándar validado externamente; esta limitación se declara y se propone su sustitución por normas poblacionales.

## Referencias
- Léger LA, Mercier D, Gadoury C, Lambert J. The multistage 20 metre shuttle run test for aerobic fitness. J Sports Sci. 1988;6(2):93-101.
- Léger LA, Gadoury C. Validity of the 20 m shuttle run test with 1 min stages to predict VO2max in adults. PMID 2924218.
- Mayorga-Vega D, Aguilar-Soto P, Viciana J. Criterion-related validity of the 20-m shuttle run test for estimating cardiorespiratory fitness: a meta-analysis. J Sports Sci Med. 2015;14:536-547.
- Rodríguez FA, Valenzuela A, Gusi N, Nàcher S, Gallardo I. Valoración de la condición física saludable en adultos (II): fiabilidad, aplicabilidad y valores normativos de la batería AFISAL-INEFC. Apunts Educ Fís Deportes. 1998;54:54-65.
- Normas europeas Eurofit para 9-17 años. Br J Sports Med, doi:10.1136/bjsports-2017-098253.
