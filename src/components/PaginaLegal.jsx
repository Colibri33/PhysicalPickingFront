/* ─── PaginaLegal.jsx ───
   Vista independiente para Terminos y Condiciones / Politica de
   Tratamiento de Datos. Se abre desde la pantalla de consentimiento
   (enlaces clicables) o desde el login/registro.

   IMPORTANTE: donde el proyecto no tiene aun una definicion juridica
   especifica (razon social, NIT, domicilio, canal de contacto formal,
   tiempos de conservacion exactos), se deja marcado explicitamente
   con [PENDIENTE DE REVISION LEGAL] en vez de inventar informacion.
*/
import Icono from './Icono';
const FECHA_ACTUALIZACION = '2026-08';

function Seccion({ titulo, children }) {
  return (
    <section className="legal-seccion">
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

function Pendiente({ children }) {
  return <span className="legal-pendiente">[PENDIENTE DE REVISION LEGAL: {children}]</span>;
}

function TerminosCondiciones() {
  return (
    <>
      <Seccion titulo="1. Objeto">
        <p>
          PhysicalPicking es un sistema de evaluacion multivariable que analiza
          variables fisicas y antropometricas de participantes adultos (18 a 30 años)
          para generar un perfil funcional y una orientacion de afinidad hacia
          familias de actividad fisica y deportiva.
        </p>
      </Seccion>
      <Seccion titulo="2. Requisitos de uso">
        <p>
          El uso de PhysicalPicking esta reservado a personas mayores de edad,
          especificamente entre 18 y 30 años. Al registrarte, declaras que tu
          edad se encuentra dentro de ese rango.
        </p>
      </Seccion>
      <Seccion titulo="3. Naturaleza de los resultados">
        <p>
          Los resultados generados son orientativos y describen tendencias de
          perfil funcional, no un diagnostico clinico ni una evaluacion de alto
          rendimiento deportivo. No sustituyen la valoracion de un profesional
          en ciencias del deporte, medicina deportiva o areas afines.
        </p>
      </Seccion>
      <Seccion titulo="4. Cuenta de usuario">
        <p>
          Eres responsable de mantener la confidencialidad de tu contraseña y
          de toda actividad realizada desde tu cuenta. PhysicalPicking usa
          Supabase Auth para la gestion de credenciales; las contraseñas nunca
          se almacenan en texto plano.
        </p>
      </Seccion>
      <Seccion titulo="5. Uso del modo invitado">
        <p>
          El modo invitado permite usar la aplicacion sin crear una cuenta. Los
          datos generados en este modo se guardan unicamente en el navegador
          del dispositivo utilizado y se pierden si se borran los datos del
          navegador, se cambia de navegador o de dispositivo.
        </p>
      </Seccion>
      <Seccion titulo="6. Limitacion de responsabilidad">
        <p>
          <Pendiente>
            texto de limitacion de responsabilidad, jurisdiccion aplicable y
            resolucion de controversias definido por el equipo legal del
            responsable del tratamiento
          </Pendiente>.
        </p>
      </Seccion>
      <Seccion titulo="7. Modificaciones">
        <p>
          Estos terminos pueden actualizarse. La fecha de la version vigente
          se indica al final de este documento.
        </p>
      </Seccion>
    </>
  );
}

function PoliticaPrivacidad() {
  return (
    <>
      <Seccion titulo="1. Responsable del tratamiento">
        <p>
          <Pendiente>razon social, NIT, domicilio y canal de contacto formal del responsable del tratamiento</Pendiente>.
        </p>
      </Seccion>

      <Seccion titulo="2. Que datos recopila PhysicalPicking">
        <ul>
          <li><strong>Datos de cuenta:</strong> nombre, correo electronico, contraseña (almacenada como hash, nunca en texto plano).</li>
          <li><strong>Datos del participante evaluado:</strong> nombre, edad (18-30 años), genero, tipo de perfil, actividad o deporte.</li>
          <li><strong>Datos de las pruebas:</strong> mediciones fisicas (fuerza prensil, fuerza explosiva, resistencia aeróbica, flexibilidad, equilibrio), variables antropometricas, cuestionarios (PAR-Q+, BREQ-3, BBAQ-21, IPAQ, PSQI) y el resultado/interpretacion generado.</li>
          <li><strong>Metadatos tecnicos:</strong> direccion IP y fecha/hora al momento de aceptar el consentimiento, para dejar evidencia de la autorizacion.</li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Que datos se consideran personales y cuales sensibles">
        <p>
          El nombre, correo, edad, genero y actividad son <strong>datos
          personales</strong>. Las mediciones fisicas y antropometricas de las
          pruebas se relacionan con la condicion fisica del participante y se
          tratan con el mismo estandar de proteccion reforzada aplicable a
          <strong> datos sensibles de salud/condicion fisica</strong>, aunque no
          constituyan un diagnostico medico.
        </p>
      </Seccion>

      <Seccion titulo="4. Para que se utilizan">
        <ul>
          <li>Crear y administrar tu cuenta.</li>
          <li>Aplicar las pruebas fisicas y antropometricas que selecciones.</li>
          <li>Calcular tu perfil funcional y la orientacion de afinidad deportiva.</li>
          <li>Guardar tu historial de evaluaciones para tu propia consulta.</li>
          <li>Atender solicitudes de acceso, correccion o eliminacion de tus datos.</li>
        </ul>
        <p>Tus datos no se usan con fines publicitarios ni se venden a terceros.</p>
      </Seccion>

      <Seccion titulo="5. Como se almacenan">
        <p>
          Los datos de cuenta se gestionan mediante Supabase Auth. Los
          resultados de las pruebas se cifran (AES-256-GCM) antes de guardarse
          en la base de datos; la llave de cifrado vive unicamente en el
          servidor backend, nunca en la aplicacion que usas ni en la base de
          datos misma.
        </p>
      </Seccion>

      <Seccion titulo="6. Como se protegen">
        <ul>
          <li>Cifrado en transito (HTTPS) en todas las comunicaciones.</li>
          <li>Contraseñas almacenadas solo como hash criptografico.</li>
          <li>Cifrado en reposo de los resultados de las pruebas.</li>
          <li>Control de acceso a nivel de base de datos: cada usuario solo puede leer o eliminar sus propios registros.</li>
          <li>Registro de auditoria de accesos a datos sensibles.</li>
        </ul>
      </Seccion>

      <Seccion titulo="7. Quien puede acceder a tus datos">
        <p>
          Unicamente tu, a traves de tu cuenta autenticada, y el personal
          tecnico estrictamente necesario para operar y mantener la
          plataforma, bajo obligacion de confidencialidad. <Pendiente>detalle de
          terceros encargados del tratamiento (proveedor de hosting, base de
          datos), si aplica</Pendiente>.
        </p>
      </Seccion>

      <Seccion titulo="8. Tus derechos">
        <p>Como titular de tus datos, tienes derecho a:</p>
        <ul>
          <li><strong>Acceso:</strong> conocer y descargar los datos que tenemos sobre ti.</li>
          <li><strong>Rectificacion:</strong> corregir datos inexactos o desactualizados.</li>
          <li><strong>Supresion:</strong> solicitar la eliminacion de tus datos.</li>
          <li><strong>Oposicion:</strong> oponerte al tratamiento de tus datos para fines especificos.</li>
          <li>Revocar tu autorizacion en cualquier momento, salvo obligacion legal de conservacion.</li>
        </ul>
      </Seccion>

      <Seccion titulo="9. Como solicitar acceso a tus datos">
        <p>
          Desde tu Historial, boton "Descargar mis datos", que genera un
          documento con toda la informacion asociada a tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="10. Como solicitar correccion de tus datos">
        <p>
          Puedes editar los datos del participante (nombre, edad, genero,
          perfil, actividad) directamente desde el historial de cada registro
          guardado.
        </p>
      </Seccion>

      <Seccion titulo="11. Como solicitar eliminacion de tus datos">
        <p>
          Desde tu Historial, boton "Eliminar mi cuenta y mis datos". Esta
          accion es permanente e irreversible.
        </p>
      </Seccion>

      <Seccion titulo="12. Informacion de contacto">
        <p><Pendiente>correo o canal oficial de contacto para temas de proteccion de datos</Pendiente></p>
      </Seccion>

      <Seccion titulo="13. Vigencia">
        <p>
          Esta version de la politica es la vigente desde su fecha de
          actualizacion, indicada al final de este documento, y permanece
          vigente mientras la aplicacion este en funcionamiento.
        </p>
      </Seccion>
    </>
  );
}

export default function PaginaLegal({ tipo, onVolver }) {
  const titulo = tipo === 'privacidad' ? 'Politica de Tratamiento de Datos Personales' : 'Terminos y Condiciones';
  return (
    <div className="legal-screen">
      <div className="legal-card">
        <button className="legal-volver" onClick={onVolver} type="button"><Icono n="izquierda" /> Volver</button>
        <h2 className="legal-title">PHYSICALPICKING</h2>
        <h3 className="legal-subtitle">{titulo}</h3>

        {tipo === 'privacidad' ? <PoliticaPrivacidad /> : <TerminosCondiciones />}

        <p className="legal-fecha">Ultima actualizacion: {FECHA_ACTUALIZACION}</p>
      </div>
    </div>
  );
}
