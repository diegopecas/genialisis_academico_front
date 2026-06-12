import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { VisitasService } from '../../../../services/visitas.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-visitas',
  templateUrl: './visitas.component.html',
  styleUrl: './visitas.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class VisitasComponent implements OnInit {

  titulo = "Gestión de Visitas";
  public columnasFiltro = ['Fecha', 'Tipo Contacto', 'Contacto Principal', 'Niño(s)', 'Nivel Interés', 'Resultado'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private visitasService: VisitasService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerVisitas();
  }

  obtenerVisitas() {
    this.visitasService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;

      this.datos.forEach((v: any) => {
        // Formatear fecha
        v.fecha_formateada = this.formatearFecha(v.fecha);

        // Formatear hora
        v.hora_formateada = this.formatearHora(v.hora);

        // Tipo de contacto
        v.tipo_contacto_nombre = v.nombre_tipo_contacto || 'N/A';

        // Contacto principal
        v.contacto_principal = v.nombre_contacto_principal || 'Sin contacto';

        // Niños
        v.ninos_nombres = v.nombres_ninos || 'Sin niños registrados';

        // Nivel de interés - texto plano
        v.nivel_interes_texto = v.nombre_nivel_interes || 'Sin calificar';

        // Resultado - texto plano
        v.resultado_texto = v.nombre_resultado || 'Pendiente';

        // Color de fila según resultado
        v.color = this.obtenerColorFila(v.codigo_resultado);
      });
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatearHora(hora: string): string {
    if (!hora) return '';
    return hora.substring(0, 5);
  }

  obtenerColorFila(codigoResultado: string): string {
    const colores: any = {
      'matriculado': '#e8f5e9',
      'perdido_competencia': '#ffebee',
      'perdido_precio': '#ffebee',
      'no_interesado': '#f5f5f5'
    };

    return colores[codigoResultado] || '';
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_formateada',
        alias: 'Fecha',
        alinear: 'centrado',
      },
      {
        clave: 'hora_formateada',
        alias: 'Hora',
        alinear: 'centrado',
      },
      {
        clave: 'tipo_contacto_nombre',
        alias: 'Tipo Contacto',
        alinear: 'izquierda',
      },
      {
        clave: 'contacto_principal',
        alias: 'Contacto Principal',
        alinear: 'izquierda',
      },
      {
        clave: 'ninos_nombres',
        alias: 'Niño(s)',
        alinear: 'izquierda',
      },
      {
        clave: 'nivel_interes_texto',
        alias: 'Nivel Interés',
        alinear: 'centrado',
      },
      {
        clave: 'resultado_texto',
        alias: 'Resultado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['administracion/crm/visitas/consultar', $event.registro.id]);
        break;
      case 'editar':
        this.router.navigate(['administracion/crm/visitas/editar', $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarVisita($event.registro);
        break;
    }
  }

  async eliminarVisita(visita: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la visita del ${visita.fecha_formateada}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.visitasService.eliminar(visita.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'La visita ha sido eliminada.',
            'success'
          );
          this.obtenerVisitas();
        },
        error: (error: any) => {
          console.error("Error al eliminar visita", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar la visita.',
            'error'
          );
        }
      });
    }
  }
}