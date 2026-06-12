import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import Swal from 'sweetalert2';
import { ProcesarNominaComponent } from '../procesar-nomina/procesar-nomina.component';
import { UtilService } from '../../../../common/constantes/util.service';
import { HeaderComponent } from '../../../../common/header/header.component';
import { NominasService } from '../../../../services/nominas.service';

@Component({
  selector: 'app-crear-nomina',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HeaderComponent, ProcesarNominaComponent],
  templateUrl: './crear-nomina.component.html',
  styleUrl: './crear-nomina.component.scss'
})
export class CrearNominaComponent implements OnInit {
  public id = "0";
  public accion = "";
  public editable = true;
  public titulo = "Crear Nómina";
  public regresar = '/administracion/nominas';
  
  formulario!: FormGroup;
  idNomina: any = null;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private nominasService: NominasService,
    private utilService: UtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.construirFormulario();
  }

  ngOnInit(): void {
    // Obtener parámetros de la ruta
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      // Configurar el componente según la acción
      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = "Crear Nómina";
          // Establecer fecha actual para nueva nómina
          const fechaActual = this.utilService.obtenerFechaActual();
          this.formulario.patchValue({
            fecha_inicio: fechaActual
          });
          break;
          
        case 'editar':
          this.editable = true;
          this.titulo = "Editar Nómina";
          this.idNomina = this.id;
          this.cargarNomina();
          break;
          
        case 'consultar':
          this.editable = false;
          this.titulo = "Consultar Nómina";
          this.idNomina = this.id;
          this.formulario.disable();
          this.cargarNomina();
          break;
          
        default:
          this.editable = true;
          this.titulo = "Crear Nómina";
          const fecha = this.utilService.obtenerFechaActual();
          this.formulario.patchValue({
            fecha_inicio: fecha
          });
          break;
      }
    });
  }

  construirFormulario(): void {
    this.formulario = this.fb.group({
      periodo: ['', [Validators.required, Validators.maxLength(20)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      observaciones: ['']
    });
  }

  cargarNomina(): void {
    this.nominasService.obtener(this.idNomina).subscribe({
      next: (response: any) => {
        const nomina = response.body[0];
        
        if (nomina) {
          this.formulario.patchValue({
            periodo: nomina.periodo,
            fecha_inicio: nomina.fecha_inicio,
            fecha_fin: nomina.fecha_fin,
            observaciones: nomina.observaciones
          });

          // Si la nómina está cerrada o pagada, deshabilitar edición
          if (nomina.id_estado === 2 || nomina.id_estado === 3) {
            this.formulario.disable();
            this.editable = false;
            this.accion = 'consultar';
            this.titulo = 'Consultar Nómina (Cerrada)';
            
            Swal.fire({
              title: 'Nómina cerrada',
              text: 'Esta nómina está cerrada y no puede ser modificada.',
              icon: 'info',
              confirmButtonText: 'Aceptar'
            });
          }
        }
      },
      error: (error: any) => {
        console.error('Error al cargar nómina:', error);
        Swal.fire('Error', 'Error al cargar la nómina', 'error');
      }
    });
  }

  guardar(): void {
    this.submitted = true;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      Swal.fire('Formulario incompleto', 'Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    // Validar que fecha_fin sea mayor o igual a fecha_inicio
    const fechaInicio = new Date(this.formulario.value.fecha_inicio);
    const fechaFin = new Date(this.formulario.value.fecha_fin);

    if (fechaFin < fechaInicio) {
      Swal.fire('Fechas inválidas', 'La fecha de fin debe ser mayor o igual a la fecha de inicio', 'warning');
      return;
    }

    const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

    if (!idUsuarioActual) {
      Swal.fire('Error', 'No se pudo obtener el usuario actual', 'error');
      return;
    }

    const body = {
      ...this.formulario.value,
      id_usuario_genera: idUsuarioActual,
      id_estado: 1 // Estado inicial: Generada
    };

    if (this.accion === 'crear') {
      this.crear(body);
    } else if (this.accion === 'editar') {
      body.id = this.idNomina;
      this.actualizar(body);
    }
  }

  crear(body: any): void {
    Swal.fire({
      title: 'Creando nómina',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.nominasService.crear(body).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Nómina creada correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.volver();
        });
      },
      error: (error: any) => {
        console.error('Error al crear nómina:', error);
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'Ha ocurrido un error al crear la nómina',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  actualizar(body: any): void {
    Swal.fire({
      title: 'Actualizando nómina',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.nominasService.actualizar(body).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Nómina actualizada correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.volver();
        });
      },
      error: (error: any) => {
        console.error('Error al actualizar nómina:', error);
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'Ha ocurrido un error al actualizar la nómina',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/administracion/nominas']);
  }

  campoNoValido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }
}