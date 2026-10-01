// hora.utils.ts
// Conversión entre la hora que digita el usuario (12 horas con AM/PM) y la
// que se guarda en el sistema ("HH:mm" en 24 horas). La usa el componente
// app-hora-input y también los formularios armados en HTML plano (SweetAlert),
// donde no se puede meter un componente de Angular.

export type PeriodoHora = 'AM' | 'PM';

export interface Hora12 {
  texto: string;        // "7:30"
  periodo: PeriodoHora; // "AM"
}

export interface HoraInterpretada {
  valor: string;        // "07:30" en 24 horas, o '' si el campo quedó vacío
  periodo: PeriodoHora; // periodo final (puede cambiar si digitaron en 24 horas)
}

/**
 * "HH:mm" o "HH:mm:ss" en 24 horas → { texto: "h:mm", periodo }.
 * Devuelve null si el valor viene vacío o no es una hora.
 */
export function horaA12(valor: string | null | undefined): Hora12 | null {
  const coincidencia = /^(\d{1,2}):(\d{2})/.exec((valor || '').trim());
  if (!coincidencia) {
    return null;
  }

  const hora24 = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (hora24 > 23 || minutos > 59) {
    return null;
  }

  return {
    texto: (hora24 % 12 || 12) + ':' + coincidencia[2],
    periodo: hora24 >= 12 ? 'PM' : 'AM'
  };
}

/**
 * Interpreta lo que digitó el usuario con el periodo seleccionado.
 * Acepta: "7" → 7:00, "730" → 7:30, "0730", "7:30", "7.30", "7:5" → 7:05,
 * y también "7:30pm" o "7p". Si digitan en 24 horas ("15:30", "0:15")
 * el periodo se corrige solo. Con "12" sin letra se asume mediodía (PM),
 * salvo que se pase mediodiaPorDefecto = false (cuando el usuario acaba de
 * escoger el periodo con el botón y hay que respetarlo).
 * Devuelve { valor: '' } si el texto está vacío y null si no se entiende.
 */
export function interpretarHora(
  texto: string | null | undefined,
  periodo: PeriodoHora,
  mediodiaPorDefecto: boolean = true
): HoraInterpretada | null {
  let limpio = (texto || '').trim().toLowerCase();
  if (limpio === '') {
    return { valor: '', periodo };
  }

  // Letra de periodo escrita a mano: "7:30pm", "7:30 p.m.", "7a"
  let periodoEscrito: PeriodoHora | null = null;
  const letra = /\s*([ap])\.?\s*(m\.?)?$/.exec(limpio);
  if (letra) {
    periodoEscrito = letra[1] === 'p' ? 'PM' : 'AM';
    limpio = limpio.substring(0, letra.index).trim();
  }

  let textoHora: string;
  let textoMinutos: string;

  const separado = /^(\d{1,2})\s*[:.h\s]\s*(\d{1,2})$/.exec(limpio);
  if (separado) {
    textoHora = separado[1];
    textoMinutos = separado[2].padStart(2, '0');
  } else if (/^\d{1,4}$/.test(limpio)) {
    // Solo números, que es lo que sale del teclado numérico del celular
    if (limpio.length <= 2) {
      textoHora = limpio;
      textoMinutos = '00';
    } else {
      textoHora = limpio.substring(0, limpio.length - 2);
      textoMinutos = limpio.substring(limpio.length - 2);
    }
  } else {
    return null;
  }

  const hora = Number(textoHora);
  const minutos = Number(textoMinutos);
  if (hora > 23 || minutos > 59) {
    return null;
  }

  let periodoFinal: PeriodoHora;
  if (hora === 0 || hora > 12) {
    // Digitada en 24 horas: manda la hora, no el botón
    if (periodoEscrito && hora > 12 && periodoEscrito === 'AM') {
      return null;
    }
    periodoFinal = hora === 0 ? 'AM' : 'PM';
  } else if (periodoEscrito) {
    periodoFinal = periodoEscrito;
  } else if (hora === 12 && mediodiaPorDefecto) {
    periodoFinal = 'PM';
  } else {
    periodoFinal = periodo;
  }

  const hora12 = hora % 12;
  const hora24 = periodoFinal === 'PM' ? hora12 + 12 : hora12;

  return {
    valor: String(hora24).padStart(2, '0') + ':' + textoMinutos,
    periodo: periodoFinal
  };
}
