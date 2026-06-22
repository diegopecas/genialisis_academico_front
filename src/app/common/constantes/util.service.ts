import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class UtilService {
    constructor(private router: Router) { }

    /**
     * Obtiene el ID del usuario almacenado en sessionStorage.
     * @returns {number | null} ID del usuario o null si no existe.
     */
    obtenerIdUsuarioActual(): string | null {
        let usuario = sessionStorage.getItem('usuario');
        // Si no hay usuario en sessionStorage, redirigir al login
        if (!usuario) {
            this.router.navigate(['/login']);  // Redirige al login usando rutas de Angular
            throw new Error('Usuario no encontrado. Redirigiendo al login'); // Lanza un error para detener la ejecución
        }

        try {
            let userData = JSON.parse(usuario);
            return userData.id ?? null;
        } catch (error) {
            console.error('Error al parsear usuario desde sessionStorage', error);
            this.router.navigate(['/login']);  // Redirige al login si ocurre un error
            return null;
        }
    }
    obtenerUsuarioActual(): any | null {
        let usuario = sessionStorage.getItem('usuario');
        if (!usuario) {
            this.router.navigate(['/login']);
            return null;
        }
        if (usuario) {
            try {
                return JSON.parse(usuario);
            } catch (error) {
                console.error('Error al parsear usuario desde sessionStorage', error);
                return null;
            }
        }
        return null;
    }

    obtenerIdColaboradorActual(): number | null {
        const usuario = this.obtenerUsuarioActual();
        return usuario?.id_colaborador ?? null;
    }

    obtenerIdPersonaActual(): number | null {
        const usuario = this.obtenerUsuarioActual();
        return usuario?.id_persona ?? null;
    }
    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD HH:mm:ss.
     * @returns {string} Fecha actual formateada.
     */
/*     obtenerFechaActual(): string {
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0'); // Meses van de 0-11
        const dia = String(ahora.getDate()).padStart(2, '0');
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const segundos = String(ahora.getSeconds()).padStart(2, '0');

        return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
    } */
    // Agrega esto como un método en tu clase
    obtenerFechaActual(): string {
        // Crear una fecha usando explícitamente la zona horaria de Colombia
        const fechaColombia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));

        // Extraer los componentes de la fecha
        const año = fechaColombia.getFullYear();
        const mes = String(fechaColombia.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaColombia.getDate()).padStart(2, '0');

        // Crear string de fecha en formato yyyy-mm-dd
        return `${año}-${mes}-${dia}`;
    }
    obtenerFechaActualFull(): string {
        // Crear una fecha usando explícitamente la zona horaria de Colombia
        const fechaHoraColombia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        
        // Extraer los componentes de la fecha y hora
        const año = fechaHoraColombia.getFullYear();
        const mes = String(fechaHoraColombia.getMonth() + 1).padStart(2, '0'); // Meses van de 0-11
        const dia = String(fechaHoraColombia.getDate()).padStart(2, '0');
        const horas = String(fechaHoraColombia.getHours()).padStart(2, '0');
        const minutos = String(fechaHoraColombia.getMinutes()).padStart(2, '0');
        const segundos = String(fechaHoraColombia.getSeconds()).padStart(2, '0');
    
        return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
    }
    /**
   * Obtiene solo la fecha actual en formato YYYY-MM-DD (sin hora).
   * @returns {string} Fecha actual formateada.
   */
    obtenerFechaActualSimple(): string {
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0'); // Meses van de 0-11
        const dia = String(ahora.getDate()).padStart(2, '0');

        return `${año}-${mes}-${dia}`;
    }
}