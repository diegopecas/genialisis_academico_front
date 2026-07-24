import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { EntesControlRecursosService } from '../../../../../services/entes-control-recursos.service';
import { CatalogoReportesService } from '../../../../../services/catalogo-reportes.service';
import { TiposPersonasService } from '../../../../../services/tipos-personas.service';
import { TiposDocumentosService } from '../../../../../services/tipos-documentos.service';

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
  public recursos: any[] = [];
  public tiposPersonas: any[] = [];
  public tiposDocumentos: any[] = [];
  public reportes: any[] = [];

  // Formulario de asignación
  public nuevo: any = {
    tipoRecurso: 'documento',
    idTipoPersona: '',
    idTipoDocumento: '',
    idReporte: ''
  };

  constructor(
    private entesControlRecursosService: EntesControlRecursosService,
    private catalogoReportesService: CatalogoReportesService,
    private tiposPersonasService: TiposPersonasService,
    private tiposDocumentosService: TiposDocumentosService
  ) { }

  ngOnInit(): void {
    this.consultarListas();
    if (this.idEnteControl) {
      this.consultarRecursos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idEnteControl'] && !changes['idEnteControl'].firstChange && this.idEnteControl) {
      this.consultarRecursos();
    }
  }

  consultarListas() {
    this.tiposPersonasService.obtenerTodos().subscribe({
      next: (response: any) => { this.tiposPersonas = response.body || []; },
      error: (error: any) => console.error('Error al obtener tipos de persona', error)
    });

    this.catalogoReportesService.obtenerParaEntesControl().subscribe({
      next: (response: any) => { this.reportes = response.body || []; },
      error: (error: any) => console.error('Error al obtener reportes', error)
    });
  }

  consultarRecursos() {
    this.cargando = true;
    this.entesControlRecursosService.obtenerPorEnte(this.idEnteControl).subscribe({
      next: (response: any) => {
        this.recursos = response.body || [];
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al obtener los recursos del ente', error);
        this.cargando = false;
      }
    });
  }

  // Al elegir el tipo de persona se cargan sus tipos de documento asociados.
  cambiarTipoPersona() {
    this.nuevo.idTipoDocumento = '';
    this.tiposDocumentos = [];

    const tipoPersona = this.tiposPersonas.find((tp: any) => tp.id === this.nuevo.idTipoPersona);
    if (!tipoPersona) { return; }

    this.tiposDocumentosService.obtenerPorTipoPersona(tipoPersona.codigo).subscribe({
      next: (response: any) => { this.tiposDocumentos = response.body || []; },
      error: (error: any) => console.error('Error al obtener tipos de documento', error)
    });
  }

  cambiarTipoRecurso() {
    this.nuevo.idTipoPersona = '';
    this.nuevo.idTipoDocumento = '';
    this.nuevo.idReporte = '';
    this.tiposDocumentos = [];
  }

  agregar() {
    if (this.nuevo.tipoRecurso === 'documento') {
      if (!this.nuevo.idTipoPersona || !this.nuevo.idTipoDocumento) {
        Swal.fire({ title: 'Campos incompletos', text: 'Seleccione el origen y el tipo de documento', icon: 'warning', confirmButtonText: 'Aceptar' });
        return;
      }
    } else {
      if (!this.nuevo.idReporte) {
        Swal.fire({ title: 'Campos incompletos', text: 'Seleccione el reporte', icon: 'warning', confirmButtonText: 'Aceptar' });
        return;
      }
    }

    const data = {
      id_ente_control: this.idEnteControl,
      tipo_recurso: this.nuevo.tipoRecurso,
      id_tipo_persona: this.nuevo.tipoRecurso === 'documento' ? this.nuevo.idTipoPersona : null,
      id_tipo_documento: this.nuevo.tipoRecurso === 'documento' ? this.nuevo.idTipoDocumento : null,
      id_reporte: this.nuevo.tipoRecurso === 'reporte' ? this.nuevo.idReporte : null
    };

    this.entesControlRecursosService.crear(data).subscribe({
      next: () => {
        this.cambiarTipoRecurso();
        this.consultarRecursos();
      },
      error: (error: any) => {
        console.error('Error al asignar el recurso', error);
        Swal.fire({ title: 'Error', text: error.error?.error || 'No se pudo asignar el recurso', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  async eliminar(recurso: any) {
    const descripcion = recurso.tipo_recurso === 'reporte'
      ? recurso.nombre_reporte
      : `${recurso.nombre_tipo_documento} (${recurso.nombre_tipo_persona})`;

    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea quitar "${descripcion}" de este ente de control?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.entesControlRecursosService.eliminar(recurso.id).subscribe({
        next: () => this.consultarRecursos(),
        error: (error: any) => {
          console.error('Error al quitar el recurso', error);
          Swal.fire({ title: 'Error', text: 'No se pudo quitar el recurso', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    }
  }

  get recursosDocumentos(): any[] {
    return this.recursos.filter((r: any) => r.tipo_recurso === 'documento');
  }

  get recursosReportes(): any[] {
    return this.recursos.filter((r: any) => r.tipo_recurso === 'reporte');
  }
}
