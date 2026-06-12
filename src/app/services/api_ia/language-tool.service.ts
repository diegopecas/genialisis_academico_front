import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // Ajusta esta ruta según tu proyecto

@Injectable({
  providedIn: 'root'
})
export class LanguageToolService {
  private apiUrl = environment.languageToolApiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Mejora la redacción de un texto utilizando la API de LanguageTool
   * @param texto Texto original que necesita mejorarse
   * @returns Observable con la respuesta de la API
   */
  mejorarRedaccion(texto: string): Observable<any> {
    // Creamos los parámetros para la petición
    const params = new HttpParams()
      .set('text', texto)
      .set('language', 'es')  // Idioma español
      .set('enabledOnly', 'false'); // Mostrar todas las reglas disponibles

    // Configuramos las cabeceras
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    // Realizamos la petición POST a LanguageTool
    return this.http.post(this.apiUrl, params.toString(), { headers });
  }

  /**
   * Procesa los resultados de LanguageTool y mejora el texto original
   * @param texto Texto original
   * @param languageToolResponse Respuesta de la API de LanguageTool
   * @returns Texto mejorado con correcciones aplicadas
   */
  procesarYMejorarTexto(texto: string, languageToolResponse: any): string {
    if (!languageToolResponse || !languageToolResponse.matches || languageToolResponse.matches.length === 0) {
      return texto;
    }

    let textoMejorado = texto;
    
    // Ordenamos los matches por offset (de mayor a menor) para que los reemplazos
    // no afecten a las posiciones de los siguientes reemplazos
    const matchesOrdenados = [...languageToolResponse.matches]
      .sort((a, b) => b.offset - a.offset);

    // Procesamos cada error/sugerencia
    for (const match of matchesOrdenados) {
      if (match.replacements && match.replacements.length > 0) {
        // Obtenemos la mejor sugerencia
        const mejorSugerencia = match.replacements[0].value;
        
        // Reemplazamos el texto original con la sugerencia
        const inicio = match.offset;
        const fin = match.offset + match.length;
        
        textoMejorado = 
          textoMejorado.substring(0, inicio) + 
          mejorSugerencia + 
          textoMejorado.substring(fin);
      }
    }

    // Aplicamos transformaciones adicionales para mejorar el estilo técnico docente
    textoMejorado = this.aplicarEstiloTecnicoDocente(textoMejorado);

    return textoMejorado;
  }

  /**
   * Aplica transformaciones para dar un estilo técnico docente al texto
   * @param texto Texto a transformar
   * @returns Texto con estilo técnico docente
   */
  private aplicarEstiloTecnicoDocente(texto: string): string {
    // Términos problemáticos y sus alternativas
    const terminosProblematicos: {[key: string]: string[]} = {
      'agresión': ['comportamiento disruptivo', 'conducta inapropiada'],
      'agresivo': ['disruptivo', 'inadecuado'],
      'agresivamente': ['de manera inapropiada', 'con actitud disruptiva'],
      'ataque': ['incidente', 'confrontación'],
      'atacó': ['confrontó', 'presentó una actitud inadecuada hacia'],
      'pelea': ['conflicto', 'desacuerdo'],
      'violento': ['inadecuado', 'disruptivo'],
      'violencia': ['comportamiento inadecuado', 'actitud disruptiva'],
      'gritó': ['elevó la voz', 'se comunicó inapropiadamente'],
      'gritos': ['comunicación inadecuada', 'elevación de voz'],
      'malo': ['inadecuado', 'mejorable'],
      'terrible': ['preocupante', 'que requiere atención'],
      'pésimo': ['insuficiente', 'que necesita mejora'],
      'fatal': ['insatisfactorio', 'con dificultades significativas'],
      'inútil': ['con dificultades', 'que necesita apoyo'],
      'tonto': ['que muestra confusión', 'que requiere orientación'],
    };

    let textoMejorado = texto;

    // Reemplazar términos problemáticos
    Object.keys(terminosProblematicos).forEach(termino => {
      const regex = new RegExp(`\\b${termino}\\b`, 'gi');
      if (textoMejorado.match(regex)) {
        const alternativas = terminosProblematicos[termino];
        const alternativaSeleccionada = alternativas[Math.floor(Math.random() * alternativas.length)];
        textoMejorado = textoMejorado.replace(regex, alternativaSeleccionada);
      }
    });

    return textoMejorado;
  }
}