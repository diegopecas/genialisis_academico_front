import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TiposDocumentosService } from '../../../services/tipos-documentos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tipos-documentos',
  templateUrl: './tipos-documentos.component.html',
  styleUrl: './tipos-documentos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposDocumentosComponent implements OnInit {

  titulo = "Gestión de Tipos de Documentos";
  public columnasFiltro = ['Nombre', 'Código'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private tiposDocumentosService: TiposDocumentosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTiposDocumentos();
  }

  obtenerTiposDocumentos() {
    this.tiposDocumentosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio tipos documentos", body);
      this.datos = body.map((item: any) => ({
        ...item,
        requiere_vencimiento_label: item.requiere_vencimiento ? 'Sí' : 'No',
        permite_multiples_label: item.permite_multiples ? 'Sí' : 'No',
        requiere_firma_label: item.requiere_firma ? 'Sí' : 'No',
        activo_label: item.activo ? 'Activo' : 'Inactivo',
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
        clave: 'codigo',
        alias: 'Código',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'requiere_vencimiento_label',
        alias: 'Req. Vencimiento',
        alinear: 'centrado',
      },
      {
        clave: 'permite_multiples_label',
        alias: 'Permite Múltiples',
        alinear: 'centrado',
      },
      {
        clave: 'requiere_firma_label',
        alias: 'Req. Firma',
        alinear: 'centrado',
      },
      {
        clave: 'activo_label',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/tipos-documentos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarTipoDocumento($event.registro);
        break;
    }
  }

  async eliminarTipoDocumento(tipoDocumento: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el tipo de documento "${tipoDocumento.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tiposDocumentosService.eliminar(tipoDocumento.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El tipo de documento ha sido eliminado.',
            'success'
          );
          this.obtenerTiposDocumentos();
        },
        error: (error: any) => {
          console.error("Error al eliminar tipo de documento", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el tipo de documento.',
            'error'
          );
        }
      });
    }
  }
}