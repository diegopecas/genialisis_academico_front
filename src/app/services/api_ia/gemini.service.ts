import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; // Ajusta esta ruta según tu proyecto

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = environment.geminiApiUrl;
  private apiKey = environment.geminiApiKey;

  constructor(private http: HttpClient) { }

  /**
   * Mejora la redacción de un texto utilizando la API de Gemini
   * @param texto Texto original que necesita mejorarse
   * @returns Observable con la respuesta de la API
   */
  mejorarRedaccion(texto: string): Observable<any> {
    // La URL ya incluye el key como parámetro
    const url = `${this.apiUrl}?key=${this.apiKey}`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = {
      contents: [
        {
          parts: [
            {
              text: `Mejora la siguiente observación académica para que tenga un lenguaje técnico docente, 
                     sea objetiva y profesional. Mantén todos los hechos del texto original pero mejora su 
                     redacción y claridad. Evita juicios de valor injustificados, terminos que puedan generar 
                     incomodidad en la persona que lo lea, por ejemplo el terminos como: agresión, ataque,etc. 
                     Mantén aproximadamente la misma longitud:

                     No incluyas prefijos como "Observación:" ni formato markdown como asteriscos o negritas.
                     Responde solo con el texto mejorado, sin comentarios adicionales.
                     "${texto}"`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000
      }
    };

    return this.http.post(url, body, { headers });
  }
}