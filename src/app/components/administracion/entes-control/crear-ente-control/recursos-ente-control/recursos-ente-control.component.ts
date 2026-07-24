import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { EntesControlRecursosService } from '../../../../../services/entes-control-recursos.service';

@Component({
  selector: 'app-recursos-ente-control',
  templateUrl: './recursos-ente-control.component.html',
  styleUrl: './recursos-ente-control.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class RecursosEnteControlComponent implements OnInit, OnChanges {

  @Input() idEnteControl: string = '';
  @Input() nombreEnte: string = '';
  @Input() soloLectura: boolean = false;

  public cargando = false;
  public guardando = false;

  // Cada item: { tipo, key, id_tipo_persona?, id_tipo_documento?, id_reporte?,
  //              origen, titulo, seleccionado }
  public items: any[] = [];

  // Filtros
  public origenes: string[] = [];
  public filtroOrigen = 'TODOS';
  public busqueda = '';

  constructor(
    private entesControlRecursosService: EntesControlRecursosService
  ) { }

  ngOnInit(): void {
    if (this.idEnteControl) {
      this.cargar();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idEnteControl'] && !changes['idEnteControl'].firstChange && this.idEnteControl) {
      this.cargar();
    }
  }

  cargar() {
    this.cargando = true;
    this.entesControlRecursosService.obtenerDisponibles(this.idEnteControl).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        const items: any[] = [];

        (body.documentos || []).forEach((d: any) => {
          items.push({
            tipo: 'documento',
            key: `d|${d.id_tipo_persona}|${d.id_tipo_documento}`,
            id_tipo_persona: d.id_tipo_persona,
            id_tipo_documento: d.id_tipo_documento,
            origen: d.nombre_tipo_persona,
            titulo: d.nombre_tipo_documento,
            seleccionado: !!d.asignado
          });
        });

        (body.reportes || []).forEach((r: any) => {
          items.push({
            tipo: 'reporte',
            key: `r|${r.id_reporte}`,
            id_reporte: r.id_reporte,
            origen: 'Reportes',
            titulo: r.nombre_reporte,
            subtitulo: r.nombre_tipo_reporte,
            seleccionado: !!r.asignado
          });
        });

        this.items = items;
        this.origenes = Array.from(new Set(items.map(i => i.origen)));
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar los recursos disponibles', error);
        this.cargando = false;
      }
    });
  }

  get itemsFiltrados(): any[] {
    const texto = this.busqueda.toLowerCase().trim();
    return this.items.filter(i => {
      const coincideOrigen = this.filtroOrigen === 'TODOS' || i.origen === this.filtroOrigen;
      const coincideTexto = !texto ||
        i.titulo.toLowerCase().includes(texto) ||
        i.origen.toLowerCase().includes(texto);
      return coincideOrigen && coincideTexto;
    });
  }

  get totalSeleccionados(): number {
    return this.items.filter(i => i.seleccionado).length;
  }

  toggle(item: any) {
    if (this.soloLectura) { return; }
    item.seleccionado = !item.seleccionado;
  }

  // Marca/desmarca todo lo que hay visible según los filtros actuales.
  seleccionarVisibles(valor: boolean) {
    if (this.soloLectura) { return; }
    this.itemsFiltrados.forEach(i => i.seleccionado = valor);
  }

  guardar() {
    if (this.soloLectura) { return; }
    this.guardando = true;

    const recursos = this.items
      .filter(i => i.seleccionado)
      .map(i => i.tipo === 'documento'
        ? { tipo_recurso: 'documento', id_tipo_persona: i.id_tipo_persona, id_tipo_documento: i.id_tipo_documento }
        : { tipo_recurso: 'reporte', id_reporte: i.id_reporte });

    const data = { id_ente_control: this.idEnteControl, recursos: recursos };

    this.entesControlRecursosService.sincronizar(data).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ title: 'Guardado', text: 'Los recursos del ente se actualizaron', icon: 'success', confirmButtonText: 'Aceptar' });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al guardar los recursos', error);
        Swal.fire({ title: 'Error', text: error.error?.error || 'No se pudieron guardar los recursos', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }
}