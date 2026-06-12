import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { Router } from '@angular/router';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';
import { UtilService } from '../../../common/constantes/util.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contabilizacion-multiple',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './contabilizacion-multiple.component.html',
  styleUrl: './contabilizacion-multiple.component.scss'
})
export class ContabilizacionMultipleComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = "Contabilización de Pagos";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Fecha', 'Tipo', 'Persona', 'Tipo de Pago', 'Observaciones'];

  // Variables para totales
  public totalSeleccionado = 0;
  public cantidadSeleccionada = 0;

  constructor(
    private router: Router,
    private pagosRecibidosService: PagosRecibidosService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.crearTitulos();
    this.obtenerPagosPendientes();
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'fecha',
        alias: 'Fecha',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy' }
      },
      {
        clave: 'tipo_persona',
        alias: 'Tipo',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_persona_display',
        alias: 'Persona',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_acudiente',
        alias: 'Acudiente',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_pago',
        alias: 'Tipo de Pago',
        alinear: 'izquierda',
      },
      {
        clave: 'referencia_bancaria',
        alias: 'Ref. Bancaria',
        alinear: 'izquierda',
      },
      {
        clave: 'observaciones',
        alias: 'Observaciones',
        alinear: 'izquierda',
      },
      {
        clave: 'valor_recibido',
        alias: 'Valor Recibido',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'saldo',
        alias: 'Saldo',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'fecha_registro',
        alias: 'Fecha Registro',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy HH:mm' }
      }
    ];
  }

  obtenerPagosPendientes() {
    this.pagosRecibidosService.obtenerPendientesContabilizar().subscribe(
      (response: any) => {
        const datos = response.body as any[];

        this.datos = datos.map(item => ({
          ...item,
          nombre_persona_display: item.nombre_estudiante || item.nombre_colaborador || 'Sin nombre'
        }));

        console.log("Pagos pendientes cargados:", this.datos.length);
      },
      error => {
        console.error('Error al cargar pagos pendientes:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los pagos pendientes de contabilizar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  onSeleccionCambiada(seleccionados: any[]) {
    this.cantidadSeleccionada = seleccionados.length;
    this.totalSeleccionado = seleccionados.reduce((sum, item) => sum + (item.valor_recibido || 0), 0);
  }

  actualizarTotales() {
    if (this.tablasComponent) {
      const seleccionados = this.tablasComponent.obtenerSeleccionados();
      this.cantidadSeleccionada = seleccionados.length;
      this.totalSeleccionado = seleccionados.reduce((sum, item) => sum + (item.valor_recibido || 0), 0);
    }
  }

  contabilizarSeleccionados() {
    if (!this.tablasComponent) {
      return;
    }

    const seleccionados = this.tablasComponent.obtenerSeleccionados();

    if (seleccionados.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos un pago para contabilizar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Confirmar contabilización?',
      html: `
        <p>Se contabilizarán <strong>${seleccionados.length}</strong> pagos</p>
        <p>Por un valor total de: <strong>$ ${this.totalSeleccionado.toLocaleString('es-CO')}</strong></p>
        <p class="text-muted">Esta acción no se puede deshacer</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, contabilizar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      input: 'textarea',
      inputPlaceholder: 'Observaciones (opcional)',
      inputAttributes: {
        'aria-label': 'Observaciones'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarContabilizacion(seleccionados, result.value || '');
      }
    });
  }

  procesarContabilizacion(seleccionados: any[], observaciones: string) {
    Swal.fire({
      title: 'Contabilizando pagos',
      html: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();
    const fechaContabilizacion = new Date().toISOString().replace('T', ' ').substr(0, 19);

    const body = {
      ids: seleccionados.map(item => item.id),
      id_usuario_contable: idUsuarioActual,
      fecha_contabilizacion: fechaContabilizacion,
      observaciones_contabilizacion: observaciones || 'Contabilización múltiple'
    };

    this.pagosRecibidosService.contabilizarMultiple(body).subscribe(
      (response: any) => {
        const resultado = response;

        if (resultado && resultado.success) {
          Swal.fire({
            title: 'Contabilización exitosa',
            html: `
              <p><strong>${resultado.contabilizados}</strong> pagos contabilizados correctamente</p>
              ${resultado.errores && resultado.errores.length > 0 ?
                `<p class="text-warning">${resultado.errores.length} pagos no pudieron ser contabilizados</p>` : ''}
            `,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.tablasComponent.limpiarSeleccion();
            this.obtenerPagosPendientes();
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: resultado.message || 'Ocurrió un error al contabilizar los pagos',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error => {
        console.error('Error al contabilizar:', error);
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al procesar la contabilización',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  regresar() {
    this.router.navigate(['/administracion']);
  }
}