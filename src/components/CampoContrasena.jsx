/* CampoContrasena.jsx — input de contraseña con opción mostrar/ocultar (ojito).
   Se usa en login, registro y restablecimiento para que la persona
   verifique lo que digitó. No usa emojis: iconos SVG en línea. */

import { useState } from 'react';

function IconoOjo({ abierto }) {
  if (abierto) {
    // Ojo abierto
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  // Ojo tachado (oculto)
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    </svg>
  );
}

export default function CampoContrasena({ classNameInput = 'auth-input', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="pass-wrap">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={classNameInput}
      />
      <button
        type="button"
        className="pass-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={-1}
      >
        <IconoOjo abierto={visible} />
      </button>
    </span>
  );
}
