import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class IaTranscripcionAudioService {
  private servicio = environment.api + 'ia-transcripcion-audio';

  constructor(private http: HttpClient) {}

  transcribir(audio: Blob, idioma: string = 'es') {
    const formData = new FormData();
    const extension = this.obtenerExtensionDesdeMimeType(audio.type);
    formData.append('audio', audio, `grabacion.${extension}`);
    formData.append('idioma', idioma);

    return this.http.post<any>(this.servicio + '/transcribir', formData).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private obtenerExtensionDesdeMimeType(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}