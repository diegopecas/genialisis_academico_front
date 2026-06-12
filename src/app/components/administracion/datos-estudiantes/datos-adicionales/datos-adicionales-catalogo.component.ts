import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { DatosAdicionalesService } from '../../../../services/datos-adicionales.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-datos-adicionales-catalogo',
  templateUrl: './datos-adicionales-catalogo.component.html',
  styleUrl: './datos-adicionales-catalogo.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class DatosAdicionalesCatalogoComponent implements OnInit {

  titulo = "Datos Adicionales";
  public columnasFiltro = ['Nombre', 'Categoría'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private datosAdicionalesService: DatosAdicionalesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  obtenerDatos() {
    this.datosAdicionalesService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map((d: any) => ({
        ...d,
        tipo_dato: d.es_numero == 1 ? 'Número' : d.es_texto == 1 ? 'Texto' : d.es_parrafo == 1 ? 'Párrafo' : d.es_fecha == 1 ? 'Fecha' : '-',
        tiene_opciones: d.opciones ? 'Sí' : 'No',
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre_tipo', alias: 'Categoría', alinear: 'izquierda' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'tipo_dato', alias: 'Tipo', alinear: 'centrado' },
      { clave: 'tiene_opciones', alias: 'Opciones', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-estudiantes/datos-adicionales/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el dato adicional "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.datosAdicionalesService.eliminar(registro.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El dato adicional ha sido eliminado.', 'success');
          this.obtenerDatos();
        },
        error: () => {
          Swal.fire('Error', 'No se pudo eliminar. Puede tener datos de estudiantes asociados.', 'error');
        }
      });
    }
  }
}