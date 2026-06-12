import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ClaudeService {
  private apiUrl = environment.claudeApiUrl;
  private apiKey = environment.claudeApiKey;

  constructor(private http: HttpClient) { }

  /**
   * Mejora la redacción de un texto utilizando la API de Claude
   * @param texto Texto original que necesita mejorarse
   * @returns Observable con la respuesta de la API
   */
  mejorarRedaccion(texto: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    });

    const body = {
      model: "claude-3-sonnet-20240229",
      messages: [
        {
          role: "user",
          content: `Mejora la siguiente observación académica para que tenga un lenguaje técnico docente, 
                   sea objetiva y profesional. Mantén todos los hechos del texto original pero mejora su 
                   redacción y claridad. Evita juicios de valor injustificados. Mantén aproximadamente 
                   la misma longitud:
                   
                   "${texto}"`
        }
      ],
      max_tokens: 1000
    };

    return this.http.post(this.apiUrl, body, { headers });
  }
}