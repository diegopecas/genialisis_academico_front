import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { SpinnerService } from '../services/spinner.service';
import { NotificationService } from '../services/notification.service';

// Contador de solicitudes activas
let activeRequests = 0;

// Mensajes fijos: no dependen de lo que devuelva el backend
const MENSAJE_SIN_CONEXION = 'No hay conexión con el servidor.';
const MENSAJE_4XX_GENERICO = 'Error en la solicitud. Verifique los datos ingresados.';
const MENSAJE_5XX = 'Error interno del servidor. Intente más tarde.';
const MENSAJE_INESPERADO = 'Ocurrió un error inesperado';

/**
 * Extrae el mensaje de negocio que envía el backend en un error 4xx.
 * Formas soportadas: {error: 'texto'}, {message: 'texto'}, {mensaje: 'texto'}
 * y string plano. Si no hay un texto utilizable devuelve null.
 */
const extraerMensajeBackend = (cuerpo: any): string | null => {
    if (!cuerpo) {
        return null;
    }

    if (typeof cuerpo === 'string') {
        return esTextoUtilizable(cuerpo) ? cuerpo.trim() : null;
    }

    if (typeof cuerpo === 'object') {
        // {error: true, message: '...'} trae el texto en message, no en error
        const candidatos = [cuerpo.error, cuerpo.message, cuerpo.mensaje];
        for (const candidato of candidatos) {
            if (typeof candidato === 'string' && esTextoUtilizable(candidato)) {
                return candidato.trim();
            }
        }
    }

    return null;
};

/**
 * Descarta textos vacíos o páginas HTML (p.ej. el 404 por defecto del servidor
 * cuando la ruta no existe), que no sirven como mensaje para el usuario.
 */
const esTextoUtilizable = (texto: string): boolean => {
    const limpio = texto.trim();
    return limpio.length > 0 && !limpio.startsWith('<');
};

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const spinnerService = inject(SpinnerService);
    const notificationService = inject(NotificationService);
    const router = inject(Router);
    
    // Peticiones silenciosas (polling, background) no activan spinner
    const esSilenciosa = req.headers.has('X-Silent');
    
    if (esSilenciosa) {
        // Remover el header antes de enviar al servidor
        const cleanReq = req.clone({ headers: req.headers.delete('X-Silent') });
        return next(cleanReq).pipe(
            catchError((error) => {
                // Aunque sea silenciosa, habeas data pendiente debe cerrar sesion:
                // un polling no puede dejar al usuario dentro sin autorizacion.
                if (error?.status === 403 && error?.error?.code === 'HABEAS_DATA_REQUIRED') {
                    sessionStorage.clear();
                    router.navigate(['/login']);
                }
                // No mostrar notificación en peticiones silenciosas
                return throwError(() => error);
            })
        );
    }
    
    // Incrementar contador y mostrar spinner si es la primera solicitud
    activeRequests++;
    if (activeRequests === 1) {
        //console.log("loadingInterceptor show - Request count:", activeRequests, req.url);
        spinnerService.show();
    }

    return next(req).pipe(
        catchError((error) => {
            // Habeas data pendiente: NO es un error para el usuario. El backend
            // exige aceptar la politica. Se limpia la sesion y se manda al login.
            // Autonomo (sessionStorage.clear + Router): asi el mismo archivo sirve
            // en el portal de padres y en el institucional, sin depender de un
            // AuthService distinto en cada app.
            if (error?.status === 403 && error?.error?.code === 'HABEAS_DATA_REQUIRED') {
                sessionStorage.clear();
                router.navigate(['/login']);
                return throwError(() => error);
            }

            let errorMessage = MENSAJE_INESPERADO;

            if (error.status === 0) {
                errorMessage = MENSAJE_SIN_CONEXION;
            } else if (error.status >= 400 && error.status < 500) {
                // 4xx: errores de negocio redactados para el usuario en el backend
                errorMessage = extraerMensajeBackend(error.error) ?? MENSAJE_4XX_GENERICO;
            } else if (error.status >= 500) {
                // 5xx: mensaje fijo, lo del backend puede exponer detalles de BD
                errorMessage = MENSAJE_5XX;
            }

            notificationService.showError(errorMessage);
            
            return throwError(() => error);
        }),
        finalize(() => {
            // Decrementar contador y ocultar spinner solo si es la última solicitud
            activeRequests--;
            //console.log("loadingInterceptor finalize - Request count:", activeRequests, req.url);
            
            if (activeRequests === 0) {
                //console.log("loadingInterceptor hide - All requests complete");
                spinnerService.hide();
            }
        })
    );
};