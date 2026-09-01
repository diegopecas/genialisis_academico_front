import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SprintsService } from '../../../../services/sprints.service';

@Component({
  selector: 'app-sprint-capacidad',
  templateUrl: './sprint-capacidad.component.html',
  styleUrl: './sprint-capacidad.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SprintCapacidadComponent implements OnInit, OnChanges {

  /** Sprint del que se analiza la capacidad */
  @Input() idSprint: any = null;
  /** Listas que carga el contenedor para no pedirlas dos veces */
  @Input() grupos: any[] = [];
  @Input() areas: any[] = [];
  /** Filtros globales del formulario */
  @Input() filtroGrupo = '';
  @Input() filtroArea = '';

  /** Cuando se hace clic en un grupo/área se avisa al contenedor */
  @Output() filtrosChange = new EventEmitter<{ grupo: string, area: string }>();

  public analisisTiempo: any = null;
  public cargando = false;

  public vistaCapacidad: 'grid' | 'tabla' = 'grid';

  public ordenCapacidad = {
    campo: 'porcentaje' as 'porcentaje' | 'grupo' | 'area' | 'actividades',
    direccion: 'desc' as 'asc' | 'desc'
  };
  public itemsCapacidadFiltrados: any[] = [];
  public dropdownOrdenAbierto = false;

  constructor(private sprintsService: SprintsService) { }

  ngOnInit(): void {
    this.cargarAnalisisTiempo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Los filtros los maneja el contenedor; aquí solo se reaplican.
    if (changes['filtroGrupo'] || changes['filtroArea']) {
      this.aplicarOrdenamientoCapacidad();
    }
  }

  /** Lo llama el contenedor cuando cambian las tareas del sprint */
  recargar() {
    this.cargarAnalisisTiempo();
  }

  cargarAnalisisTiempo() {
    if (!this.idSprint) {
      return;
    }

    this.cargando = true;
    this.sprintsService.obtenerAnalisisTiempoSprint(this.idSprint).subscribe({
      next: (response) => {
        this.analisisTiempo = response.body as any;
        this.aplicarOrdenamientoCapacidad();
        this.cargando = false;

        if (this.analisisTiempo && this.analisisTiempo.resumen &&
          this.analisisTiempo.resumen.grupos_excedidos.length > 0) {
          this.mostrarAlertaTiempoExcedido();
        }
      },
      error: (error) => {
        console.error('Error cargando análisis de tiempo:', error);
        this.cargando = false;
      }
    });
  }

  obtenerNombreGrupo(idGrupo: any): string {
    const grupo = this.grupos.find(g => g.id == idGrupo);
    return grupo ? grupo.nombre : '';
  }

  obtenerNombreArea(idArea: any): string {
    const area = this.areas.find(a => a.id == idArea);
    return area ? area.nombre : '';
  }

  cambiarVistaCapacidad(vista: 'grid' | 'tabla') {
    this.vistaCapacidad = vista;
  }

  // Método para cambiar ordenamiento
  cambiarOrdenCapacidad(campo: 'porcentaje' | 'grupo' | 'area' | 'actividades', direccion?: 'asc' | 'desc') {
    if (direccion) {
      this.ordenCapacidad.direccion = direccion;
    } else {
      // Si es el mismo campo, cambiar dirección
      if (this.ordenCapacidad.campo === campo) {
        this.ordenCapacidad.direccion = this.ordenCapacidad.direccion === 'asc' ? 'desc' : 'asc';
      } else {
        // Si es diferente campo, usar dirección por defecto
        this.ordenCapacidad.direccion = campo === 'grupo' || campo === 'area' ? 'asc' : 'desc';
      }
    }

    this.ordenCapacidad.campo = campo;
    this.aplicarOrdenamientoCapacidad();
  }

  // Método para aplicar ordenamiento con filtros globales integrados
  aplicarOrdenamientoCapacidad() {
    if (!this.analisisTiempo || !this.analisisTiempo.analisis_por_grupo_area) {
      this.itemsCapacidadFiltrados = [];
      return;
    }

    let items = [...this.analisisTiempo.analisis_por_grupo_area];

    // Aplicar filtros globales
    if (this.filtroGrupo) {
      const nombreGrupo = this.obtenerNombreGrupo(this.filtroGrupo);
      items = items.filter(item =>
        item.nombre_grupo === nombreGrupo ||
        item.id_grupo == this.filtroGrupo
      );
    }

    if (this.filtroArea) {
      const nombreArea = this.obtenerNombreArea(this.filtroArea);
      items = items.filter(item =>
        item.nombre_area === nombreArea ||
        item.id_area == this.filtroArea
      );
    }

    // Aplicar ordenamiento
    items.sort((a, b) => {
      let valorA, valorB;

      switch (this.ordenCapacidad.campo) {
        case 'porcentaje':
          valorA = a.porcentaje_usado;
          valorB = b.porcentaje_usado;
          break;
        case 'grupo':
          valorA = a.nombre_grupo.toLowerCase();
          valorB = b.nombre_grupo.toLowerCase();
          break;
        case 'area':
          valorA = a.nombre_area.toLowerCase();
          valorB = b.nombre_area.toLowerCase();
          break;
        case 'actividades':
          valorA = a.cantidad_actividades;
          valorB = b.cantidad_actividades;
          break;
        default:
          valorA = a.porcentaje_usado;
          valorB = b.porcentaje_usado;
      }

      if (this.ordenCapacidad.direccion === 'asc') {
        return valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
      } else {
        return valorA > valorB ? -1 : valorA < valorB ? 1 : 0;
      }
    });

    this.itemsCapacidadFiltrados = items;
  }

  // Método para obtener texto del ordenamiento actual
  obtenerTextoOrdenamiento(): string {
    const textos = {
      'porcentaje-desc': 'Mayor uso primero',
      'porcentaje-asc': 'Menor uso primero',
      'grupo-asc': 'Por grupo (A-Z)',
      'grupo-desc': 'Por grupo (Z-A)',
      'area-asc': 'Por área (A-Z)',
      'area-desc': 'Por área (Z-A)',
      'actividades-desc': 'Más actividades primero',
      'actividades-asc': 'Menos actividades primero'
    };

    const clave = `${this.ordenCapacidad.campo}-${this.ordenCapacidad.direccion}`;
    return textos[clave as keyof typeof textos] || 'Ordenar';
  }

  toggleDropdownOrden() {
    this.dropdownOrdenAbierto = !this.dropdownOrdenAbierto;
  }

  // Cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const dropdownElement = document.querySelector('.dropdown-orden');
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      this.dropdownOrdenAbierto = false;
    }
  }

  mostrarAlertaTiempoExcedido() {
    if (!this.analisisTiempo) return;

    const gruposExcedidos = this.analisisTiempo.resumen.grupos_excedidos;

    Swal.fire({
      title: 'Tiempo excedido en algunos grupos',
      html: `
     <div class="alert alert-warning">
       <p>Los siguientes grupos/áreas han excedido el tiempo disponible:</p>
       <ul class="text-start">
         ${gruposExcedidos.map((g: string) => `<li>${g}</li>`).join('')}
       </ul>
       <p class="mt-3">Revise la distribución de actividades para estos grupos.</p>
     </div>
   `,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#d4af37'
    });
  }

  verDetalleGrupoArea(item: any) {
    // Aplicar filtros automáticamente en el contenedor
    const idGrupo = this.grupos.find((g: any) => g.nombre === item.nombre_grupo)?.id || '';
    const idArea = this.areas.find((a: any) => a.nombre === item.nombre_area)?.id || '';

    this.filtrosChange.emit({ grupo: idGrupo, area: idArea });

    Swal.fire({
      title: 'Detalle de Capacidad',
      html: `
       <div class="text-start">
         <p><strong>Grupo:</strong> ${item.nombre_grupo}</p>
         <p><strong>Área:</strong> ${item.nombre_area}</p>
         <hr>
         <div class="row">
           <div class="col-6">
             <p><strong>Tiempo disponible:</strong></p>
             <p>${item.horas_disponibles} horas (${item.minutos_disponibles} minutos)</p>
           </div>
           <div class="col-6">
             <p><strong>Tiempo usado:</strong></p>
             <p>${item.horas_usadas} horas (${item.minutos_usados} minutos)</p>
           </div>
         </div>
         <div class="progress mt-3" style="height: 30px;">
           <div class="progress-bar ${item.porcentaje_usado <= 70 ? 'bg-success' : item.porcentaje_usado <= 90 ? 'bg-warning' : 'bg-danger'}"
                style="width: ${item.porcentaje_usado > 100 ? 100 : item.porcentaje_usado}%">
             ${item.porcentaje_usado}%
           </div>
         </div>
         <p class="mt-3">
           <strong>Actividades asignadas:</strong> ${item.cantidad_actividades}<br>
           <strong>Tiempo restante:</strong> ${item.minutos_restantes > 0 ? item.minutos_restantes + ' minutos' : 'Sin tiempo disponible'}
         </p>
         ${item.excedido ? '<div class="alert alert-danger mt-3 mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Esta combinación ha excedido el tiempo disponible</div>' : ''}
       </div>
     `,
      icon: 'info',
      confirmButtonText: 'Mantener filtro',
      confirmButtonColor: '#d4af37',
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (!result.isConfirmed) {
        // Si cancela, limpiar filtros
        this.filtrosChange.emit({ grupo: '', area: '' });
      }
    });
  }
}
