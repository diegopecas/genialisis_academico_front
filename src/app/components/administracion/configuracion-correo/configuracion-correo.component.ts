// ========== configuracion-correo.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { ConfiguracionCorreoService } from '../../../services/configuracion-correo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-correo',
  templateUrl: './configuracion-correo.component.html',
  styleUrl: './configuracion-correo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ConfiguracionCorreoComponent implements OnInit {

  public titulo = 'Servicio de Correo';
  public regresar = '/administracion/datos-maestros';
  public guardando: boolean = false;
  public probando: boolean = false;
  public cargando: boolean = true;

  // Lo que hay guardado (sin la API key: solo si existe y sus últimos 4)
  public guardado: any = null;
  public correoPrueba: string = '';

  public model: any = {
    url_api: '',
    responder_a: '',
    activo: false,
    // Solo se manda cuando se escribe de nuevo
    api_key: ''
  };

  constructor(
    private configuracionCorreoService: ConfiguracionCorreoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar() {
    this.configuracionCorreoService.obtener().subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cargando = false;
        if (body.length > 0) {
          this.aplicar(body[0]);
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar el servicio de correo', error);
        Swal.fire('Error', 'No se pudo cargar la configuración del correo.', 'error');
      }
    });
  }

  private aplicar(fila: any) {
    this.guardado = fila;
    this.model = {
      url_api: fila.url_api || '',
      responder_a: fila.responder_a || '',
      activo: Number(fila.activo) === 1,
      api_key: ''
    };
  }

  guardar() {
    this.guardando = true;
    const datos = { ...this.model, activo: this.model.activo ? 1 : 0 };

    this.configuracionCorreoService.actualizar(datos).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        if (Array.isArray(respuesta) && respuesta.length > 0) {
          this.aplicar(respuesta[0]);
        }
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Configuración guardada', showConfirmButton: false, timer: 2000
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al guardar el servicio de correo', error);
        Swal.fire('Error', error?.error?.error || 'No se pudo guardar la configuración.', 'error');
      }
    });
  }

  // Prueba con lo que está guardado, no con lo que hay en pantalla sin grabar
  enviarPrueba() {
    if (!this.correoPrueba.trim()) {
      Swal.fire('Falta el correo', 'Escribe a qué correo mandar la prueba.', 'warning');
      return;
    }
    this.probando = true;
    this.configuracionCorreoService.probar(this.correoPrueba.trim()).subscribe({
      next: () => {
        this.probando = false;
        Swal.fire('Correo enviado', `Se mandó el correo de prueba a ${this.correoPrueba.trim()}.`, 'success');
      },
      error: (error: any) => {
        this.probando = false;
        Swal.fire('No salió el correo', error?.error?.error || 'No se pudo enviar el correo de prueba.', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
