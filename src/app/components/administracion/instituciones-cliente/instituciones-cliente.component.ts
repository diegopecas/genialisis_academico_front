// ========== instituciones-cliente.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { InstitucionesClienteService } from '../../../services/instituciones-cliente.service';
import { TiposInstitucionService } from '../../../services/tipos-institucion.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-instituciones-cliente',
  templateUrl: './instituciones-cliente.component.html',
  styleUrl: './instituciones-cliente.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class InstitucionesClienteComponent implements OnInit {

  titulo = "Instituciones Cliente";
  public columnasFiltro = ['Nombre/Razón Social', 'Documento', 'Tipo Institución', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public tiposInstitucion = [] as any[];

  public acciones = [] as any[];

  constructor(
    private institucionesClienteService: InstitucionesClienteService,
    private tiposInstitucionService: TiposInstitucionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTiposInstitucion();
    this.obtenerInstituciones();
  }

  obtenerInstituciones() {
    this.institucionesClienteService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio instituciones cliente", body);
      this.datos = body;
      this.datos.forEach((i: any) => {
        // Si tiene razón social, usar eso, si no, construir el nombre completo
        if (i.razon_social) {
          i.nombre_mostrar = i.razon_social;
        } else {
          i.nombre_mostrar = `${i.primer_nombre || ''} ${i.segundo_nombre || ''} ${i.primer_apellido || ''} ${i.segundo_apellido || ''}`.trim();
        }
        i.color = i.activo === 0 ? "#e2e9f3" : "";
        i.estado = i.activo === 0 ? "Inactivo" : "Activo";
        i.documento_completo = `${i.tipo_identificacion}: ${i.numero_identificacion}`;
      });
    });
  }

  obtenerTiposInstitucion() {
    this.tiposInstitucionService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio tipos institucion", body);
      this.tiposInstitucion = body;
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
        clave: 'nombre_mostrar',
        alias: 'Nombre/Razón Social',
        alinear: 'izquierda',
      },
      {
        clave: 'documento_completo',
        alias: 'Documento',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo_institucion',
        alias: 'Tipo Institución',
        alinear: 'izquierda',
      },
      {
        clave: 'telefono',
        alias: 'Teléfono',
        alinear: 'izquierda',
      },
      {
        clave: 'correo_electronico',
        alias: 'Email',
        alinear: 'izquierda',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/instituciones-cliente/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarInstitucion($event.registro);
        break;
    }
  }

  async eliminarInstitucion(institucion: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la institución ${institucion.nombre_mostrar}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.institucionesClienteService.eliminar(institucion.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminada',
            'La institución cliente ha sido eliminada.',
            'success'
          );
          this.obtenerInstituciones();
        },
        error: (error: any) => {
          console.error("Error al eliminar institución cliente", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar la institución cliente.',
            'error'
          );
        }
      });
    }
  }
}
