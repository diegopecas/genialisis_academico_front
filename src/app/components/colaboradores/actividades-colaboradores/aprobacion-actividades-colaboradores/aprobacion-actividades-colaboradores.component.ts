import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { Router } from '@angular/router';
import { ActividadesColaboradoresService } from '../../../../services/actividades-colaboradores.service';
import { UtilService } from '../../../../common/constantes/util.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-aprobacion-actividades-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './aprobacion-actividades-colaboradores.component.html',
  styleUrl: './aprobacion-actividades-colaboradores.component.scss'
})
export class AprobacionActividadesColaboradoresComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = "Aprobación de Actividades de Colaboradores";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Colaborador', 'Categoría', 'Tipo de Actividad', 'Estado'];
  
  // Variables para totales
  public totalSeleccionado = 0;
  public cantidadSeleccionada = 0;
  public minutosPermisos = 0;
  public minutosHorasExtras = 0;
  public valorTotalHoras = 0; // Nueva variable para el valor total

  constructor(
    private router: Router,
    private actividadesColaboradoresService: ActividadesColaboradoresService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.crearTitulos();
    this.obtenerPendientesAprobar();
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_registro',
        alias: 'Fecha Registro',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy HH:mm' }
      },
      {
        clave: 'nombre_colaborador',
        alias: 'Colaborador',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_categoria',
        alias: 'Categoría',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_tipo_actividad',
        alias: 'Tipo de Actividad',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_hora_inicio',
        alias: 'Inicio',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy HH:mm' }
      },
      {
        clave: 'fecha_hora_fin',
        alias: 'Fin',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy HH:mm' }
      },
      {
        clave: 'duracion_formateada',
        alias: 'Duración',
        alinear: 'centrado',
      },
      {
        clave: 'valor_calculado',
        alias: 'Valor',
        alinear: 'derecha',
      },
      {
        clave: 'observaciones',
        alias: 'Observaciones',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_estado',
        alias: 'Estado',
        alinear: 'centrado',
      }
    ];
  }

  obtenerPendientesAprobar() {
    this.actividadesColaboradoresService.obtenerPendientesAprobar().subscribe({
      next: (response: any) => {
        const datos = response.body as any[];
        
        // Formatear duración y valor
        this.datos = datos.map((item: any) => {
          const horas = Math.floor(item.minutos_totales / 60);
          const mins = item.minutos_totales % 60;
          const valorCalculado = item.valor_hora ? (item.minutos_totales / 60) * item.valor_hora : 0;
          
          return {
            ...item,
            duracion_formateada: `${horas}h ${mins}m`,
            valor_calculado: valorCalculado > 0 ? `$${valorCalculado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-',
            valor_numerico: valorCalculado
          };
        });

        console.log("Actividades pendientes cargadas:", this.datos);
      },
      error: error => {
        console.error('Error al cargar actividades pendientes:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las actividades pendientes de aprobar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  onSeleccionCambiada(seleccionados: any[]) {
    this.cantidadSeleccionada = seleccionados.length;
    this.totalSeleccionado = seleccionados.reduce((sum, item) => sum + (item.minutos_totales || 0), 0);
    
    // Calcular minutos por categoría
    this.minutosPermisos = seleccionados
      .filter(item => item.nombre_categoria === 'Permiso')
      .reduce((sum, item) => sum + (item.minutos_totales || 0), 0);
    
    this.minutosHorasExtras = seleccionados
      .filter(item => item.nombre_categoria === 'Hora Adicional')
      .reduce((sum, item) => sum + (item.minutos_totales || 0), 0);
    
    // Calcular valor total de horas adicionales
    this.valorTotalHoras = seleccionados
      .filter(item => item.nombre_categoria === 'Hora Adicional')
      .reduce((sum, item) => sum + (item.valor_numerico || 0), 0);
  }

  aprobarSeleccionados() {
    if (!this.tablasComponent) {
      return;
    }

    const seleccionados = this.tablasComponent.obtenerSeleccionados();
    
    if (seleccionados.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos una actividad para aprobar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Confirmar aprobación?',
      html: `
        <div style="text-align: left;">
          <p>Se aprobarán <strong>${seleccionados.length}</strong> actividades</p>
          <p>Total de minutos: <strong>${this.totalSeleccionado}</strong></p>
          <ul style="list-style: none; padding-left: 0;">
            <li>• Permisos: ${this.minutosPermisos} minutos (${this.formatearMinutos(this.minutosPermisos)})</li>
            <li>• Horas Adicionales: ${this.minutosHorasExtras} minutos (${this.formatearMinutos(this.minutosHorasExtras)})</li>
            ${this.valorTotalHoras > 0 ? `<li>• Valor Total Horas: <strong>${this.formatearValor(this.valorTotalHoras)}</strong></li>` : ''}
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      input: 'textarea',
      inputPlaceholder: 'Observaciones (opcional)',
      inputAttributes: {
        'aria-label': 'Observaciones'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarAprobacion(seleccionados, result.value || '');
      }
    });
  }

  procesarAprobacion(seleccionados: any[], observaciones: string) {
    Swal.fire({
      title: 'Aprobando actividades',
      html: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();
    const ids = seleccionados.map(item => item.id);

    this.actividadesColaboradoresService.aprobarMultiple(ids, idUsuarioActual, observaciones).subscribe({
      next: (response: any) => {
        const resultado = response;
        
        if (resultado && resultado.success) {
          Swal.fire({
            title: 'Aprobación exitosa',
            html: `
              <p><strong>${resultado.aprobados}</strong> actividades aprobadas correctamente</p>
              ${resultado.errores && resultado.errores.length > 0 ? 
                `<p class="text-warning">${resultado.errores.length} actividades no pudieron ser aprobadas</p>` : ''}
            `,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.tablasComponent.limpiarSeleccion();
            this.obtenerPendientesAprobar();
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: resultado.message || 'Ocurrió un error al aprobar las actividades',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: error => {
        console.error('Error al aprobar:', error);
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al procesar la aprobación',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  formatearMinutos(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  formatearValor(valor: number): string {
    return `$${valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  regresar() {
    this.router.navigate(['/administracion']);
  }
}