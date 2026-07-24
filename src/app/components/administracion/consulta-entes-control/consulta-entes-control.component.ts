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
  public grupos: any[] = [];
  public reportes: any[] = [];

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
    this.grupos = [];
    this.reportes = [];
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
        // Cada grupo arranca colapsado y con su propio filtro de texto.
        this.grupos = (body.documentos || []).map((g: any) => ({
          ...g,
          abierto: false,
          filtro: ''
        }));
        this.reportes = body.reportes || [];
        this.cargando = false;
        this.consultado = true;
      },
      error: (error: any) => {
        console.error('Error al resolver los recursos del ente', error);
        this.cargando = false;
        this.consultado = true;
        Swal.fire({ title: 'Error', text: 'No se pudieron cargar los recursos', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  toggleGrupo(grupo: any) {
    grupo.abierto = !grupo.abierto;
  }

  // Filtra los documentos de un grupo por su propio buscador.
  documentosFiltrados(grupo: any): any[] {
    if (!grupo.filtro) { return grupo.documentos; }
    const texto = grupo.filtro.toLowerCase();
    return grupo.documentos.filter((d: any) =>
      String(d.nombre_persona || '').toLowerCase().includes(texto) ||
      String(d.nombre_archivo || '').toLowerCase().includes(texto) ||
      String(d.numero_identificacion || '').toLowerCase().includes(texto)
    );
  }

  totalDocumentos(): number {
    return this.grupos.reduce((total: number, g: any) => total + (g.documentos?.length || 0), 0);
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
}