import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TiposSolicitudService } from '../../../services/tipos-solicitud.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipos-solicitud',
  templateUrl: './tipos-solicitud.component.html',
  styleUrl: './tipos-solicitud.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposSolicitudComponent implements OnInit {

  titulo = "Tipos de Solicitud";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private tiposService: TiposSolicitudService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTipos();
  }

  /**
   * Trae activos e inactivos: un tipo inactivo sigue en el catalogo para que
   * el jardin vea como queda configurado, aunque no se pueda escoger al
   * crear una solicitud.
   */
  obtenerTipos() {
    this.tiposService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map(tipo => ({
        id: tipo.id,
        icono: tipo.icono,
        nombre: tipo.nombre,
        horas: this.textoHoras(tipo),
        soporte: this.textoDocumento(tipo),
        aprobacion: tipo.requiere_aprobacion === 1 ? 'Sí' : 'No',
        confirmacion: tipo.requiere_confirmacion === 1 ? 'Sí' : 'No',
        aviso: tipo.minutos_anticipacion ? `${tipo.minutos_anticipacion} min antes` : 'No avisa',
        estado: tipo.activo === 1 ? 'Activo' : 'Inactivo'
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'icono',
        alias: '',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'horas',
        alias: 'Horas',
        alinear: 'izquierda',
      },
      {
        clave: 'soporte',
        alias: 'Soporte',
        alinear: 'izquierda',
      },
      {
        clave: 'aprobacion',
        alias: 'Aprobación',
        alinear: 'centrado',
      },
      {
        clave: 'confirmacion',
        alias: 'Confirmación',
        alinear: 'centrado',
      },
      {
        clave: 'aviso',
        alias: 'Aviso',
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
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/operaciones/tipos-solicitud/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarTipo($event.registro);
        break;
    }
  }

  /**
   * Solo se puede borrar un tipo que nunca se uso. Si ya tiene solicitudes,
   * el backend lo rechaza: el historico se quedaria sin nombre.
   */
  async eliminarTipo(tipo: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el tipo ${tipo.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tiposService.eliminar(tipo.id).subscribe({
        next: () => {
          Swal.fire(
            'Eliminado',
            'El tipo ha sido eliminado.',
            'success'
          );
          this.obtenerTipos();
        },
        error: (error: any) => {
          console.error("Error al eliminar tipo de solicitud", error);
          Swal.fire(
            'Error',
            error?.error?.error || 'No se pudo eliminar el tipo.',
            'error'
          );
        }
      });
    }
  }

  textoHoras(tipo: any): string {
    if (tipo.manejo_horas === 1) return 'Una hora';
    if (tipo.manejo_horas === 2) return 'Varias horas';
    return 'Sin horas';
  }

  textoDocumento(tipo: any): string {
    if (tipo.documento === 1) return 'Opcional';
    if (tipo.documento === 2) return 'Obligatorio';
    return 'No aplica';
  }
}
