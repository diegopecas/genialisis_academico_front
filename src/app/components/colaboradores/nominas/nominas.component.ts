import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { NominasService } from '../../../services/nominas.service';



@Component({
  selector: 'app-nominas',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './nominas.component.html',
  styleUrl: './nominas.component.scss'
})
export class NominasComponent implements OnInit {
  titulo = 'Nóminas';

  
  datos: any[] = [];
  titulos: any[] = [
    { clave: 'id', alias: 'ID', alinear: 'centrado' },
    { clave: 'periodo', alias: 'Periodo', alinear: 'centrado' },
    { clave: 'fecha_inicio', alias: 'Fecha Inicio', alinear: 'centrado' },
    { clave: 'fecha_fin', alias: 'Fecha Fin', alinear: 'centrado' },
    { clave: 'nombre_estado', alias: 'Estado', alinear: 'centrado' },
    { clave: 'nombre_usuario_genera', alias: 'Usuario Genera', alinear: 'izquierda' },
    { clave: 'fecha_generacion', alias: 'Fecha Generación', alinear: 'centrado' },
    { clave: 'nombre_usuario_cierra', alias: 'Usuario Cierra', alinear: 'izquierda' },
    { clave: 'fecha_cierre', alias: 'Fecha Cierre', alinear: 'centrado' }
  ];
  
  columnasFiltro: string[] = [
    'Periodo',
    'Estado'
  ];

  acciones: any[] = [
    {
      icono: 'fas fa-lock',
      nombre: 'Cerrar Nómina',
      nombre_accion: 'cerrar',
      class: 'btn-warning'
    }
  ];

  constructor(
    private nominasService: NominasService,
    private utilService: UtilService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarNominas();
  }

  cargarNominas(): void {
    this.nominasService.obtenerTodos().subscribe({
      next: (response: any) => {
        const respuesta: any = response.body;
        console.log("cargarNominas", respuesta)
        this.datos = respuesta.map((item: any) => {
          // Determinar el color de la fila según el estado
          let color = '';
          if (item.id_estado === 1) {
            color = ''; // Sin color para Generada
          } else if (item.id_estado === 2) {
            color = '#fff3cd'; // Amarillo claro para Cerrada
          } else if (item.id_estado === 3) {
            color = '#d4edda'; // Verde claro para Pagada
          }
          
          return {
            ...item,
            color: color
          };
        });
        
        console.log('Datos procesados:', this.datos);
      },
      error: (error: any) => {
        console.error('Error al cargar nóminas:', error);
        Swal.fire('Error', 'Error al cargar las nóminas', 'error');
      }
    });
  }

  seleccionar(evento: any): void {
    const accion = evento.accion;
    const item = evento.registro || evento.item;

    // Verificar si la nómina ya está cerrada o pagada
    if (item.id_estado === 2 || item.id_estado === 3) {
      if (accion === 'editar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede editar una nómina que está cerrada o pagada.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      else if (accion === 'eliminar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede eliminar una nómina que está cerrada o pagada.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      else if (accion === 'cerrar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'Esta nómina ya está cerrada o pagada.',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
    }

    switch (accion) {
      case 'consultar':
        this.router.navigate(['administracion/nominas/consultar', item.id]);
        break;
      case 'editar':
        this.router.navigate(['administracion/nominas/editar', item.id]);
        break;
      case 'eliminar':
        this.eliminarNomina(item);
        break;
      case 'cerrar':
        this.cerrarNomina(item);
        break;
    }
  }

  cerrarNomina(nomina: any): void {
    // Verificar si la nómina ya está cerrada
    if (nomina.id_estado === 2 || nomina.id_estado === 3) {
      Swal.fire({
        title: 'Nómina ya cerrada',
        text: 'Esta nómina ya se encuentra cerrada o pagada.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Está seguro de cerrar esta nómina?',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <p><strong>Periodo:</strong> ${nomina.periodo || ''}</p>
          <p><strong>Fecha Inicio:</strong> ${nomina.fecha_inicio || ''}</p>
          <p><strong>Fecha Fin:</strong> ${nomina.fecha_fin || ''}</p>
          <p style="color: #856404; font-weight: bold;">Una vez cerrada, no podrá ser modificada.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ffc107',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();
        
        if (!idUsuarioActual) {
          Swal.fire('Error', 'No se pudo obtener el usuario actual', 'error');
          return;
        }

        // Mostrar indicador de carga
        Swal.fire({
          title: 'Cerrando nómina',
          text: 'Por favor espere...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Llamar al servicio de cierre
        this.nominasService.cerrar({
          id: nomina.id,
          id_usuario_cierra: idUsuarioActual
        }).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Cerrada!',
              text: 'La nómina ha sido cerrada exitosamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.cargarNominas();
            });
          },
          error: (error: any) => {
            console.error('Error al cerrar nómina:', error);
            Swal.fire({
              title: 'Error',
              text: error.error?.message || 'Ha ocurrido un error al intentar cerrar la nómina.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Operación cancelada',
          text: 'La nómina no ha sido cerrada.',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  eliminarNomina(nomina: any): void {
    // Verificar si la nómina está cerrada o pagada
    if (nomina.id_estado === 2 || nomina.id_estado === 3) {
      Swal.fire({
        title: 'Acción no permitida',
        text: 'No se puede eliminar una nómina que está cerrada o pagada.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Está seguro de eliminar esta nómina?',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <p><strong>Periodo:</strong> ${nomina.periodo || ''}</p>
          <p><strong>Fecha Inicio:</strong> ${nomina.fecha_inicio || ''}</p>
          <p><strong>Fecha Fin:</strong> ${nomina.fecha_fin || ''}</p>
          <p style="color: #dc3545; font-weight: bold;">Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Mostrar indicador de carga
        Swal.fire({
          title: 'Eliminando nómina',
          text: 'Por favor espere...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Llamar al servicio de eliminación
        this.nominasService.eliminar({ id: nomina.id }).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Eliminada!',
              text: 'La nómina ha sido eliminada exitosamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.cargarNominas();
            });
          },
          error: (error: any) => {
            console.error('Error al eliminar nómina:', error);
            Swal.fire({
              title: 'Error',
              text: error.error?.message || 'Ha ocurrido un error al intentar eliminar la nómina.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Operación cancelada',
          text: 'La nómina no ha sido eliminada.',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
}