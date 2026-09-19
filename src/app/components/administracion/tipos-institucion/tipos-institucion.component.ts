// ========== tipos-institucion.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TiposInstitucionService } from '../../../services/tipos-institucion.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tipos-institucion',
  templateUrl: './tipos-institucion.component.html',
  styleUrl: './tipos-institucion.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposInstitucionComponent implements OnInit {

  titulo = "Tipos de Institución";
  public columnasFiltro = ['Nombre', 'Descripción', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private tiposInstitucionService: TiposInstitucionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTipos();
  }

  obtenerTipos() {
    this.tiposInstitucionService.obtenerTodosIncluyendoInactivos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio tipos institucion", body);
      this.datos = body.map((item: any) => ({
        ...item,
        color: Number(item.activo) === 0 ? "#e2e9f3" : "",
        estado: Number(item.activo) === 0 ? "Inactivo" : "Activo",
        en_uso: Number(item.total_instituciones) > 0 ? `${item.total_instituciones}` : '0',
      }));
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
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
      {
        clave: 'en_uso',
        alias: 'Instituciones',
        alinear: 'centrado',
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
        this.router.navigate(['administracion/datos-maestros/tipos-institucion/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarTipo($event.registro);
        break;
    }
  }

  async eliminarTipo(tipo: any) {
    // El backend también lo valida; aquí se avisa antes para no hacer el
    // viaje al servidor cuando ya se sabe que el tipo está en uso.
    if (Number(tipo.total_instituciones) > 0) {
      Swal.fire({
        title: 'No se puede eliminar',
        text: `Hay ${tipo.total_instituciones} institución(es) con el tipo "${tipo.nombre}". Desactívelo en lugar de eliminarlo.`,
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el tipo de institución "${tipo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tiposInstitucionService.eliminar(tipo.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El tipo de institución ha sido eliminado.',
            'success'
          );
          this.obtenerTipos();
        },
        error: (error: any) => {
          console.error("Error al eliminar tipo de institución", error);
          const mensaje = error?.error?.error || 'No se pudo eliminar el tipo de institución.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
