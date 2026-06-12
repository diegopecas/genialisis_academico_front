import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MensajeIA {
    success: boolean;
    mensaje: string;
    tipo: string;
    razon?: string;
    stats?: {
        mensajes_usados_hoy: number;
        disponibles: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class IaMensajesService {
    private apiUrl = environment.api + 'ia/mensaje-personalizado';

    constructor(private http: HttpClient) { }

    obtenerMensajePersonalizado(nombreUsuario: string): Observable<MensajeIA> {
        const body = { nombre_usuario: nombreUsuario };

        return this.http.post<MensajeIA>(this.apiUrl, body).pipe(
            tap(response => {
                console.log('Mensaje IA recibido:', response);
            }),
            catchError(error => {
                console.error('Error obteniendo mensaje IA:', error);
                return of({
                    success: true,
                    mensaje: `¡Bienvenido ${nombreUsuario}! Que tengas un excelente día 🌟`,
                    tipo: 'fallback_local',
                    razon: 'error_red'
                });
            })
        );
    }
}