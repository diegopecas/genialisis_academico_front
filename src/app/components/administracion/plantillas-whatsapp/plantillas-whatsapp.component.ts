import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { WaMensajeriaService } from '../../../services/wa-mensajeria.service';


@Component({
  selector: 'app-plantillas-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './plantillas-whatsapp.component.html',
  styleUrl: './plantillas-whatsapp.component.scss'
})
export class PlantillasWhatsappComponent implements OnInit {
  titulo = 'Plantillas de WhatsApp';

  templates: any[] = [];
  cargando = true;
  error = '';

  // Formulario crear
  mostrarFormulario = false;
  guardando = false;
  formulario = {
    name: '',
    category: 'UTILITY',
    language: 'es',
    body_text: '',
    header_text: '',
    footer_text: '',
    variables_example: [] as string[]
  };

  // Variables detectadas
  variablesDetectadas: string[] = [];

  // Modal notificación
  mostrarNotificacion = false;
  mensajeNotificacion = '';
  tipoNotificacion: 'exito' | 'error' | 'info' = 'info';

  constructor(private waSvc: WaMensajeriaService) {}

  ngOnInit(): void {
    this.cargarTemplates();
  }

  // =====================================================
  // NOTIFICACIÓN MODAL
  // =====================================================
  mostrarMensaje(mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info'): void {
    this.mensajeNotificacion = mensaje;
    this.tipoNotificacion = tipo;
    this.mostrarNotificacion = true;
  }

  cerrarNotificacion(): void {
    this.mostrarNotificacion = false;
    this.mensajeNotificacion = '';
  }

  // =====================================================
  // TEMPLATES
  // =====================================================
  cargarTemplates(): void {
    this.cargando = true;
    this.error = '';
    this.waSvc.obtenerTemplates().subscribe({
      next: (response: any) => {
        this.templates = response.body || [];
        this.cargando = false;
      },
      error: (err: any) => {
        this.error = err?.error?.error || 'Error al cargar plantillas';
        this.cargando = false;
      }
    });
  }

  abrirFormulario(): void {
    this.mostrarFormulario = true;
    this.resetFormulario();
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.resetFormulario();
  }

  resetFormulario(): void {
    this.formulario = {
      name: '',
      category: 'UTILITY',
      language: 'es',
      body_text: '',
      header_text: '',
      footer_text: '',
      variables_example: []
    };
    this.variablesDetectadas = [];
  }

  onBodyTextChange(): void {
    const matches = this.formulario.body_text.match(/\{\{\d+\}\}/g) || [];
    const uniqueVars = [...new Set(matches)];
    this.variablesDetectadas = uniqueVars;

    while (this.formulario.variables_example.length < uniqueVars.length) {
      this.formulario.variables_example.push('');
    }
    if (this.formulario.variables_example.length > uniqueVars.length) {
      this.formulario.variables_example = this.formulario.variables_example.slice(0, uniqueVars.length);
    }
  }

  getPreview(): string {
    let texto = this.formulario.body_text;
    this.variablesDetectadas.forEach((v, i) => {
      const ejemplo = this.formulario.variables_example[i];
      texto = texto.replace(v, ejemplo || v);
    });
    return texto;
  }

  puedeGuardar(): boolean {
    if (!this.formulario.name.trim() || !this.formulario.body_text.trim()) return false;
    if (this.variablesDetectadas.length > 0) {
      return this.formulario.variables_example.every(v => v.trim() !== '');
    }
    return true;
  }

  guardarTemplate(): void {
    if (!this.puedeGuardar() || this.guardando) return;

    this.guardando = true;
    const data: any = {
      name: this.formulario.name,
      category: this.formulario.category,
      language: this.formulario.language,
      body_text: this.formulario.body_text
    };

    if (this.formulario.header_text.trim()) {
      data.header_text = this.formulario.header_text;
    }
    if (this.formulario.footer_text.trim()) {
      data.footer_text = this.formulario.footer_text;
    }
    if (this.formulario.variables_example.length > 0) {
      data.variables_example = this.formulario.variables_example;
    }

    this.waSvc.crearTemplate(data).subscribe({
      next: (response: any) => {
        this.guardando = false;
        this.cerrarFormulario();
        this.cargarTemplates();
        this.mostrarMensaje(
          `Plantilla "${response.name}" creada exitosamente.\nEstado: ${response.status || 'PENDING'}.\nMeta la revisará en minutos u horas.`,
          'exito'
        );
      },
      error: (err: any) => {
        this.guardando = false;
        const detalle = err?.error?.detalle?.error?.message || err?.error?.error || 'Error al crear plantilla';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  eliminarTemplate(template: any): void {
    if (!confirm(`¿Eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`)) return;

    this.waSvc.eliminarTemplate(template.name).subscribe({
      next: () => {
        this.cargarTemplates();
        this.mostrarMensaje(`Plantilla "${template.name}" eliminada.`, 'info');
      },
      error: (err: any) => {
        const detalle = err?.error?.detalle?.error?.message || err?.error?.error || 'Error al eliminar';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  getEstadoClase(status: string): string {
    switch (status) {
      case 'APPROVED': return 'estado-aprobado';
      case 'PENDING': return 'estado-pendiente';
      case 'REJECTED': return 'estado-rechazado';
      default: return '';
    }
  }

  getEstadoTexto(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Aprobada';
      case 'PENDING': return 'Pendiente';
      case 'REJECTED': return 'Rechazada';
      default: return status;
    }
  }

  getCategoriaTexto(category: string): string {
    switch (category) {
      case 'UTILITY': return 'Utilidad';
      case 'MARKETING': return 'Marketing';
      case 'AUTHENTICATION': return 'Autenticación';
      default: return category;
    }
  }
}