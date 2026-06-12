import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ParametrosCalificacionesService } from '../../../services/parametros-calificaciones.service';
import { ValoresParametrosCalificacionesService } from '../../../services/valores-parametros-calificaciones.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

declare var bootstrap: any;

@Component({
  selector: 'app-parametros-calificaciones',
  templateUrl: './parametros-calificaciones.component.html',
  styleUrl: './parametros-calificaciones.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent, ReactiveFormsModule]
})
export class ParametrosCalificacionesComponent implements OnInit {

  titulo = "Parámetros de Calificaciones";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  public parametroSeleccionado: any = null;
  public valoresParametro: any[] = [];
  public formValor!: FormGroup;
  public modoEdicionValor = false;
  private modalValores: any;

  constructor(
    private parametrosService: ParametrosCalificacionesService,
    private valoresService: ValoresParametrosCalificacionesService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerParametros();
    this.inicializarFormValor();
  }

  inicializarFormValor() {
    this.formValor = this.fb.group({
      id: [null],
      id_parametros_calificaciones: [null],
      valor_cuantitativo: [null, [Validators.required]],
      valor_cualitativo: ['', [Validators.required]],
      icono: ['']
    });
  }

  obtenerParametros() {
    this.parametrosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("Parámetros de calificaciones", body);
      this.datos = body.map((parametro: any) => {
        return {
          id: parametro.id,
          nombre: parametro.nombre
        };
      });
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre del Parámetro',
        alinear: 'izquierda',
      }
    ];
  }


  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/parametros-calificaciones/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarParametro($event.registro);
        break;
      case 'valores':
        this.gestionarValores($event.registro);
        break;
    }
  }

  async eliminarParametro(parametro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el parámetro ${parametro.nombre}? Esto eliminará también todos sus valores asociados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.parametrosService.eliminar({ id: parametro.id }).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El parámetro ha sido eliminado.',
            'success'
          );
          this.obtenerParametros();
        },
        error: (error: any) => {
          console.error("Error al eliminar parámetro", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el parámetro.',
            'error'
          );
        }
      });
    }
  }

  gestionarValores(parametro: any) {
    this.parametroSeleccionado = parametro;
    this.formValor.patchValue({
      id_parametros_calificaciones: parametro.id
    });
    this.cargarValores(parametro.id);
    this.abrirModal();
  }

  cargarValores(idParametro: number) {
    this.valoresService.obtenerPorParametro(idParametro).subscribe({
      next: (response: any) => {
        this.valoresParametro = response.body as any[];
        console.log("Valores del parámetro", this.valoresParametro);
      },
      error: (error: any) => {
        console.error("Error al cargar valores", error);
        this.valoresParametro = [];
      }
    });
  }

  guardarValor() {
    if (this.formValor.valid) {
      const valor = this.formValor.value;
      
      if (this.modoEdicionValor) {
        this.valoresService.actualizar(valor).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Actualizado',
              text: 'El valor ha sido actualizado exitosamente',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarValores(this.parametroSeleccionado.id);
            this.cancelarEdicionValor();
          },
          error: (error: any) => {
            console.error("Error al actualizar valor", error);
            Swal.fire('Error', 'No se pudo actualizar el valor', 'error');
          }
        });
      } else {
        this.valoresService.crear(valor).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Creado',
              text: 'El valor ha sido creado exitosamente',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarValores(this.parametroSeleccionado.id);
            this.limpiarFormValor();
          },
          error: (error: any) => {
            console.error("Error al crear valor", error);
            Swal.fire('Error', 'No se pudo crear el valor', 'error');
          }
        });
      }
    }
  }

  editarValor(valor: any) {
    this.modoEdicionValor = true;
    this.formValor.patchValue(valor);
  }

  cancelarEdicionValor() {
    this.modoEdicionValor = false;
    this.limpiarFormValor();
  }

  limpiarFormValor() {
    this.formValor.patchValue({
      id: null,
      valor_cuantitativo: null,
      valor_cualitativo: '',
      icono: ''
    });
  }

  async eliminarValor(valor: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el valor ${valor.valor_cualitativo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.valoresService.eliminar({ id: valor.id }).subscribe({
        next: (response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'El valor ha sido eliminado',
            timer: 1500,
            showConfirmButton: false
          });
          this.cargarValores(this.parametroSeleccionado.id);
        },
        error: (error: any) => {
          console.error("Error al eliminar valor", error);
          Swal.fire('Error', 'No se pudo eliminar el valor', 'error');
        }
      });
    }
  }

  abrirModal() {
    const modalElement = document.getElementById('modalValores');
    if (modalElement) {
      this.modalValores = new bootstrap.Modal(modalElement);
      this.modalValores.show();
    }
  }
}