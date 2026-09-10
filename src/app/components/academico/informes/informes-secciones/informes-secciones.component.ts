import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { InformesSeccionesService } from '../../../../services/informes-secciones.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

/**
 * Secciones del informe de calificaciones.
 *
 * Cada sección se alimenta de una esfera, de un área académica, de ítems
 * propios o de un tipo de observación. La malla curricular no se toca: aquí
 * solo se apunta a ella.
 */
@Component({
  selector: 'app-informes-secciones',
  templateUrl: './informes-secciones.component.html',
  styleUrl: './informes-secciones.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class InformesSeccionesComponent implements OnInit {

  titulo = "Secciones del Informe";
  public columnasFiltro = ['Sección', 'Origen', 'Sección Padre'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private informesSeccionesService: InformesSeccionesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerSecciones();
  }

  obtenerSecciones() {
    this.informesSeccionesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        console.log("consumo servicio informes secciones", body);
        this.datos = body.map((s: any) => ({
          ...s,
          descripcion_origen: this.describirOrigen(s),
          califica_texto: s.se_califica == 1 ? 'Sí' : 'No',
          evalua_texto: s.evalua_a === 'familia' ? 'Familia' : 'Estudiante',
          activo_texto: s.activo == 1 ? 'Activa' : 'Inactiva'
        }));
      },
      error: (error: any) => {
        console.error("Error al obtener las secciones del informe", error);
      }
    });
  }

  /**
   * Texto legible del origen: el tipo más el nombre resuelto por el backend.
   */
  private describirOrigen(seccion: any): string {
    const tipos: any = {
      'esfera': 'Esfera',
      'area': 'Área',
      'items': 'Ítems propios',
      'observacion': 'Observación'
    };
    const tipo = tipos[seccion.tipo_origen] || seccion.tipo_origen;
    return seccion.nombre_origen ? `${tipo}: ${seccion.nombre_origen}` : tipo;
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'orden',
        alias: 'Orden',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Sección',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_seccion_padre',
        alias: 'Sección Padre',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion_origen',
        alias: 'Origen',
        alinear: 'izquierda',
      },
      {
        clave: 'califica_texto',
        alias: 'Califica',
        alinear: 'centrado',
      },
      {
        clave: 'evalua_texto',
        alias: 'Evalúa a',
        alinear: 'centrado',
      },
      {
        clave: 'activo_texto',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/informes/secciones/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarSeccion($event.registro);
        break;
    }
  }

  async eliminarSeccion(seccion: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la sección ${seccion.nombre}? También se eliminarán sus subsecciones y sus ítems propios.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.informesSeccionesService.eliminar({ id: seccion.id }).subscribe({
        next: () => {
          Swal.fire('Eliminada', 'La sección ha sido eliminada.', 'success');
          this.obtenerSecciones();
        },
        error: (error: any) => {
          console.error("Error al eliminar la sección", error);
          Swal.fire('Error', 'No se pudo eliminar la sección.', 'error');
        }
      });
    }
  }
}
