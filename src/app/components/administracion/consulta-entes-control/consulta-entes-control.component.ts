import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { EntesControlService } from '../../../services/entes-control.service';
import { EntesControlRecursosService } from '../../../services/entes-control-recursos.service';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';

@Component({
  selector: 'app-consulta-entes-control',
  templateUrl: './consulta-entes-control.component.html',
  styleUrl: './consulta-entes-control.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent]
})
export class ConsultaEntesControlComponent implements OnInit {

  titulo = 'Consulta Entes de Control';

  public entes: any[] = [];
  public idEnteSeleccionado = '';
  public enteSeleccionado: any = null;

  public cargando = false;
  public consultado = false;
  public estudiantes: any[] = [];
  public institucion: any[] = [];
  public colaboradores: any[] = [];
  public carpetasEnte: any[] = [];
  public reportes: any[] = [];

  // Búsqueda de estudiante (carpetas)
  public busqueda = '';

  // Pestaña activa
  public tabActiva = '';

  // Carpeta abierta (modal)
  public carpetaAbierta: any = null;
  public tipoCarpetaAbierta: 'estudiante' | 'plana' = 'plana';

  constructor(
    private entesControlService: EntesControlService,
    private entesControlRecursosService: EntesControlRecursosService,
    private documentosPersonasService: DocumentosPersonasService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.consultarEntes();
  }

  consultarEntes() {
    this.entesControlService.obtenerTodos().subscribe({
      next: (response: any) => { this.entes = response.body || []; },
      error: (error: any) => {
        console.error('Error al obtener los entes de control', error);
        Swal.fire({ title: 'Error', text: 'No se pudieron cargar los entes de control', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  cambiarEnte() {
    this.consultado = false;
    this.estudiantes = [];
    this.institucion = [];
    this.colaboradores = [];
    this.carpetasEnte = [];
    this.reportes = [];
    this.busqueda = '';
    this.carpetaAbierta = null;
    this.tabActiva = '';
    this.enteSeleccionado = this.entes.find((e: any) => e.id === this.idEnteSeleccionado) || null;

    if (this.idEnteSeleccionado) {
      this.consultar();
    }
  }

  consultar() {
    this.cargando = true;
    this.entesControlRecursosService.resolver(this.idEnteSeleccionado).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.estudiantes = body.estudiantes || [];
        this.institucion = body.institucion || [];
        this.colaboradores = body.colaboradores || [];
        this.carpetasEnte = body.entes || [];
        this.reportes = body.reportes || [];
        this.cargando = false;
        this.consultado = true;
        this.seleccionarPrimeraTab();
      },
      error: (error: any) => {
        console.error('Error al resolver los recursos del ente', error);
        this.cargando = false;
        this.consultado = true;
        Swal.fire({ title: 'Error', text: 'No se pudieron cargar los recursos', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  get estudiantesFiltrados(): any[] {
    const texto = this.busqueda.toLowerCase().trim();
    if (!texto) { return this.estudiantes; }
    return this.estudiantes.filter((c: any) =>
      String(c.nombre_estudiante || '').toLowerCase().includes(texto) ||
      String(c.numero_identificacion || '').toLowerCase().includes(texto)
    );
  }

  get hayCarpetas(): boolean {
    return this.estudiantes.length > 0 || this.institucion.length > 0 ||
           this.colaboradores.length > 0 || this.carpetasEnte.length > 0;
  }

  // Pestañas disponibles (solo las que tienen contenido)
  get tabs(): any[] {
    const t: any[] = [];
    if (this.reportes.length > 0)      { t.push({ id: 'reportes',      label: 'Reportes',      icono: 'fas fa-chart-bar',    total: this.reportes.length }); }
    if (this.institucion.length > 0)   { t.push({ id: 'institucion',   label: 'Institución',   icono: 'fas fa-school',       total: this.institucion.length }); }
    if (this.carpetasEnte.length > 0)  { t.push({ id: 'ente',          label: 'Ente',          icono: 'fas fa-landmark',     total: this.carpetasEnte.length }); }
    if (this.colaboradores.length > 0) { t.push({ id: 'colaboradores', label: 'Colaboradores', icono: 'fas fa-user-tie',     total: this.colaboradores.length }); }
    if (this.estudiantes.length > 0)   { t.push({ id: 'estudiantes',   label: 'Estudiantes',   icono: 'fas fa-user-graduate', total: this.estudiantes.length }); }
    return t;
  }

  seleccionarPrimeraTab() {
    const tabs = this.tabs;
    this.tabActiva = tabs.length > 0 ? tabs[0].id : '';
  }

  cambiarTab(id: string) {
    this.tabActiva = id;
  }

  abrirCarpetaEstudiante(carpeta: any) {
    this.tipoCarpetaAbierta = 'estudiante';
    this.carpetaAbierta = carpeta;
  }

  abrirCarpetaPlana(carpeta: any) {
    this.tipoCarpetaAbierta = 'plana';
    this.carpetaAbierta = carpeta;
  }

  cerrarCarpeta() {
    this.carpetaAbierta = null;
  }

  verDocumento(documento: any) {
    this.documentosPersonasService.obtenerUrlDescargaConToken(documento.id).subscribe({
      next: (url: string) => { window.open(url, '_blank'); },
      error: (error: any) => {
        console.error('Error al obtener la URL del documento', error);
        Swal.fire({ title: 'Error', text: 'No se pudo abrir el documento', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  descargarDocumento(documento: any) {
    this.documentosPersonasService.descargarDocumentoArchivo(documento.id, documento.nombre_archivo);
  }

  abrirReporte(reporte: any) {
    this.router.navigate([reporte.ruta]);
  }

  estaVencido(documento: any): boolean {
    if (!documento.fecha_vencimiento) { return false; }
    return new Date(documento.fecha_vencimiento) < new Date();
  }

  // Agrupa los documentos de acudientes por nombre de acudiente.
  acudientesAgrupados(carpeta: any): any[] {
    if (!carpeta || !carpeta.documentos_acudientes) { return []; }
    const mapa: any = {};
    carpeta.documentos_acudientes.forEach((d: any) => {
      const nombre = d.nombre_acudiente || 'Acudiente';
      if (!mapa[nombre]) { mapa[nombre] = { nombre: nombre, documentos: [] }; }
      mapa[nombre].documentos.push(d);
    });
    return Object.values(mapa);
  }
}