import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { InformesConfiguracionService } from '../../../../services/informes-configuracion.service';
import { ParametrosCalificacionesService } from '../../../../services/parametros-calificaciones.service';
import Swal from 'sweetalert2';

/**
 * Configuración general del informe del jardín.
 *
 * Es una sola fila por tenant, así que no hay listado ni crear/editar
 * separados: la pantalla carga lo que haya y guarda creando o actualizando
 * según exista o no.
 */
@Component({
  selector: 'app-informes-configuracion',
  templateUrl: './informes-configuracion.component.html',
  styleUrl: './informes-configuracion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InformesConfiguracionComponent implements OnInit {

  titulo = "Configuración del Informe";
  regresar = '/academico';
  editable: boolean = true;
  submitted: boolean = false;
  cargando: boolean = true;

  parametros: any[] = [];

  model = {
    id: null,
    id_parametro_evaluacion: null,
    muestra_ausencias: 0,
    titulo_informe: '',
    encabezado: '',
    pie_pagina: '',
    firma_uno: '',
    firma_dos: '',
    firma_acudiente: 0
  } as any;

  constructor(
    private informesConfiguracionService: InformesConfiguracionService,
    private parametrosCalificacionesService: ParametrosCalificacionesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarParametros();
    this.cargarConfiguracion();
  }

  cargarParametros() {
    this.parametrosCalificacionesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.parametros = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar los parámetros", error)
    });
  }

  cargarConfiguracion() {
    this.informesConfiguracionService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        console.log("consumo servicio configuracion informe", body);
        if (body.length > 0) {
          this.model = body[0];
        }
        this.cargando = false;
      },
      error: (error: any) => {
        console.error("Error al cargar la configuración del informe", error);
        this.cargando = false;
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.id_parametro_evaluacion) {
      Swal.fire('Advertencia', 'Debe seleccionar el parámetro de evaluación que alimenta el informe', 'warning');
      return;
    }

    const data = {
      id_parametro_evaluacion: this.model.id_parametro_evaluacion,
      muestra_ausencias: this.model.muestra_ausencias ? 1 : 0,
      titulo_informe: this.model.titulo_informe || null,
      encabezado: this.model.encabezado || null,
      pie_pagina: this.model.pie_pagina || null,
      firma_uno: this.model.firma_uno || null,
      firma_dos: this.model.firma_dos || null,
      firma_acudiente: this.model.firma_acudiente ? 1 : 0
    } as any;

    // Sin id todavía no existe la fila del jardín: se crea la primera vez
    if (!this.model.id) {
      this.informesConfiguracionService.crear(data).subscribe({
        next: (response: any) => {
          this.model.id = response.id;
          Swal.fire('Éxito', 'Configuración guardada correctamente', 'success');
        },
        error: (error: any) => {
          console.error("Error al crear la configuración", error);
          Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
        }
      });
    } else {
      data.id = this.model.id;
      this.informesConfiguracionService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Configuración actualizada correctamente', 'success');
        },
        error: (error: any) => {
          console.error("Error al actualizar la configuración", error);
          Swal.fire('Error', 'No se pudo actualizar la configuración', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
