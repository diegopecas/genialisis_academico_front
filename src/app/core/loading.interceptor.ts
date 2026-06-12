import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { SpinnerService } from '../services/spinner.service';
import { NotificationService } from '../services/notification.service';

// Contador de solicitudes activas
let activeRequests = 0;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const spinnerService = inject(SpinnerService);
    const notificationService = inject(NotificationService);
    
    // Peticiones silenciosas (polling, background) no activan spinner
    const esSilenciosa = req.headers.has('X-Silent');
    
    if (esSilenciosa) {
        // Remover el header antes de enviar al servidor
        const cleanReq = req.clone({ headers: req.headers.delete('X-Silent') });
        return next(cleanReq).pipe(
            catchError((error) => {
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
            let errorMessage = 'Ocurrió un error inesperado';

            if (error.status === 0) {
                errorMessage = 'No hay conexión con el servidor.';
            } else if (error.status >= 400 && error.status < 500) {
                errorMessage = 'Error en la solicitud. Verifique los datos ingresados.';
            } else if (error.status >= 500) {
                errorMessage = 'Error interno del servidor. Intente más tarde.';
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