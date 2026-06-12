import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IaMensajesService, MensajeIA } from '../../services/ia-mensajes.service';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-daily-message',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './daily-message.component.html',
    styleUrl: './daily-message.component.scss'
})
export class DailyMessageComponent implements OnInit {
    mensaje: MensajeIA | null = null;
    currentTheme: any;
    mostrar = false;

    private readonly STORAGE_KEY = 'ultimo_mensaje_ia';

    constructor(
        private iaService: IaMensajesService,
        private themeService: ThemeService
    ) {
        this.currentTheme = this.themeService.getCurrentTheme();
    }

    async ngOnInit() {
        if (!this.deberMostrarMensaje()) {
            this.mostrar = false;
            return;
        }

        const usuarioStr = sessionStorage.getItem('usuario');
        let nombreUsuario = 'Estudiante';

        if (usuarioStr) {
            try {
                const usuario = JSON.parse(usuarioStr);
                nombreUsuario = usuario.sobrenombre || usuario.primer_nombre || usuario.usuario || 'Estudiante';
            } catch (e) {
                console.error('Error parseando usuario:', e);
            }
        }

        this.iaService.obtenerMensajePersonalizado(nombreUsuario).subscribe({
            next: (response) => {
                this.mensaje = response;
                this.mostrar = true;
                this.guardarTimestamp();
            },
            error: (error) => {
                console.error('Error obteniendo mensaje:', error);
                this.mostrar = false;
            }
        });
    }

    /**
     * Verifica si ya se mostró el mensaje hoy
     */
    private deberMostrarMensaje(): boolean {
        const ultimaFechaStr = localStorage.getItem(this.STORAGE_KEY);
        
        if (!ultimaFechaStr) {
            return true;
        }

        const ultimaFecha = new Date(ultimaFechaStr);
        const hoy = new Date();
        
        const mismoDia = 
            ultimaFecha.getFullYear() === hoy.getFullYear() &&
            ultimaFecha.getMonth() === hoy.getMonth() &&
            ultimaFecha.getDate() === hoy.getDate();

        return !mismoDia;
    }

    private guardarTimestamp(): void {
        localStorage.setItem(this.STORAGE_KEY, new Date().toISOString());
    }

    getIconoPorTipo(): string {
        if (!this.mensaje) return '✨';

        const iconos: Record<string, string> = {
            'dato_curioso': '🧠',
            'noticia_educativa': '📰',
            'mensaje_motivacional': '💪',
            'chiste_educativo': '😄',
            'frase_inspiradora': '💡',
            'cumpleaños': '🎂',
            'navidad': '🎄',
            'año_nuevo': '🎆',
            'fallback': '🌟'
        };

        return iconos[this.mensaje.tipo] || '✨';
    }

    getTipoTexto(): string {
        if (!this.mensaje) return '';

        const textos: Record<string, string> = {
            'dato_curioso': 'Dato Curioso',
            'noticia_educativa': 'Noticia Educativa',
            'mensaje_motivacional': 'Motivación',
            'chiste_educativo': 'Humor Inteligente',
            'frase_inspiradora': 'Inspiración',
            'cumpleaños': '¡Feliz Cumpleaños!',
            'navidad': 'Feliz Navidad',
            'año_nuevo': '¡Feliz Año Nuevo!',
            'fallback': 'Mensaje del Día'
        };

        return textos[this.mensaje.tipo] || 'Mensaje';
    }

    cerrar() {
        this.mostrar = false;
    }
}