import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { GaleriasService } from '../../../services/galerias.service';
import { GaleriasXGruposService } from '../../../services/galerias-x-grupos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-galerias',
  templateUrl: './galerias.component.html',
  styleUrl: './galerias.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class GaleriasComponent implements OnInit {

  titulo = "Gestión de Galerías";
  public columnasFiltro = ['Nombre', 'Descripción', 'Fecha', 'Tipo', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];

  // Sin acciones personalizadas, solo editar y eliminar
  public acciones = [] as any[];

  constructor(
    private galeriasService: GaleriasService,
    private galeriasXGruposService: GaleriasXGruposService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerGalerias();
  }

  obtenerGalerias() {
    this.galeriasService.obtenerTodas().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Galerías:", body);
        this.datos = body.map((g: any) => ({
          ...g,
          tipo_texto: g.es_publica === 1 ? 'Pública' : 'Privada',
          estado_texto: g.activo === 1 ? 'Activo' : 'Inactivo',
          color: g.activo === 0 ? "#e2e9f3" : "",
          fecha_formateada: this.formatearFecha(g.fecha)
        }));
      },
      error: (error) => {
        console.error("Error al cargar galerías:", error);
        Swal.fire('Error', 'No se pudieron cargar las galerías', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'fecha_formateada', alias: 'Fecha', alinear: 'centrado' },
      { clave: 'tipo_texto', alias: 'Tipo', alinear: 'centrado' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['/operaciones/galerias/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarGaleria($event.registro);
        break;
    }
  }

  async eliminarGaleria(galeria: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la galería "${galeria.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.galeriasService.eliminar(galeria.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'La galería ha sido eliminada.', 'success');
          this.obtenerGalerias();
        },
        error: (error: any) => {
          console.error("Error al eliminar galería", error);
          Swal.fire('Error', 'No se pudo eliminar la galería.', 'error');
        }
      });
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}