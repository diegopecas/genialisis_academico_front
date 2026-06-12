import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { PrestamosService } from '../../../services/prestamos.service';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-colaboradores-prestamos',
  standalone: true,
  imports: [CommonModule, HeaderComponentAnidado, TablasComponent, RouterModule],
  templateUrl: './colaboradores-prestamos.component.html',
  styleUrl: './colaboradores-prestamos.component.scss'
})
export class ColaboradoresPrestamosComponent implements OnInit {

  @Input() idColaboradorInput: string | null = null;
  public modoEmbebido = false;

  public titulo = "Préstamos del Colaborador";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Fecha Préstamo', 'Tipo Préstamo', 'Estado'];
  public idColaborador = "0";
  public colaborador: any = {};
  public path = "/colaboradores-prestamos/crear/0/";
  
  // Acciones personalizadas
  public acciones = [
    {
      id: 'registrar_pago',
      label: 'Registrar Pago',
      icono: '/assets/images/pagos.png',
      color: '#28a745'  // Color verde para pago
    },
    {
      id: 'anular',
      label: 'Anular Préstamo',
      icono: '/assets/images/anular.png',
      color: '#dc3545'  // Color rojo para anular
    }
  ] as any[];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private prestamosService: PrestamosService,
    private colaboradoresService: ColaboradoresService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    if (this.idColaboradorInput) {
      this.modoEmbebido = true;
      this.idColaborador = this.idColaboradorInput;
      this.path = this.path + this.idColaborador;
      this.crearTitulos();
      this.obtenerColaborador();
      this.obtenerPrestamos();
      return;
    }

    this.route.params.subscribe(params => {
      this.idColaborador = params['id'];
      this.path = this.path + this.idColaborador;
      this.crearTitulos();
      this.obtenerColaborador();
      this.obtenerPrestamos();
    });
  }

  obtenerColaborador() {
    this.colaboradoresService.obtenerById(this.idColaborador).subscribe(
      (response: any) => {
        const datos = response.body as any[];
        if (datos && datos.length > 0) {
          this.colaborador = datos[0];
          const nombreColaborador = this.colaborador.nombre_completo || 'Colaborador';
          this.titulo = `Préstamos de ${nombreColaborador}`;
        }
      },
      (error: any) => {
        console.error('Error al obtener colaborador:', error);
      }
    );
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_prestamo',
        alias: 'Fecha Préstamo',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy' }
      },
      {
        clave: 'nombre_tipo_prestamo',
        alias: 'Tipo Préstamo',
        alinear: 'izquierda',
      },
      {
        clave: 'monto_prestado',
        alias: 'Monto Prestado',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'monto_total',
        alias: 'Monto Total',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'total_pagado',
        alias: 'Total Pagado',
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
        clave: 'nombre_estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'numero_cuotas',
        alias: 'Cuotas',
        alinear: 'centrado',
      }
    ];
  }

  obtenerPrestamos() {
    this.prestamosService.obtenerPorColaborador(this.idColaborador).subscribe(
      (response: any) => {
        this.datos = response.body as any[];

        // Aplicar colores según el estado
        this.datos = this.datos.map(prestamo => ({
          ...prestamo,
          color: prestamo.id_estado === 3 ? "#ffe6e6" : ""  // Fondo rojizo si está anulado (estado 3)
        }));
      },
      (error: any) => {
        console.error('Error al cargar préstamos:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los préstamos del colaborador',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  accionTabla(event: any) {
    switch (event.accion) {
      case 'consultar':
        this.router.navigate(['/colaboradores-prestamos/ver/' + event.id + '/' + this.idColaborador]);
        break;
      case 'editar':
        this.router.navigate(['/colaboradores-prestamos/editar/' + event.id + '/' + this.idColaborador]);
        break;
      case 'eliminar':
        this.eliminar(event.registro);
        break;
      case 'registrar_pago':
        this.registrarPago(event.registro);
        break;
      case 'anular':
        this.anularPrestamo(event.registro);
        break;
    }
  }

  registrarPago(registro: any) {
    // Validar que el préstamo esté activo
    if (registro.id_estado === 3) {
      Swal.fire({
        title: 'Préstamo anulado',
        text: 'No se pueden registrar pagos en un préstamo anulado',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (registro.id_estado === 2) {
      Swal.fire({
        title: 'Préstamo finalizado',
        text: 'Este préstamo ya está completamente pagado',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Validar que tenga saldo pendiente
    if (registro.saldo <= 0) {
      Swal.fire({
        title: 'Sin saldo pendiente',
        text: 'Este préstamo no tiene saldo pendiente',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Navegar al componente de registro de pago
    this.router.navigate([
      '/colaboradores-prestamos-pagos/crear',
      registro.id,
      this.idColaborador
    ]);
  }

  anularPrestamo(registro: any) {
    // Validar si ya está anulado
    if (registro.id_estado === 3) {
      Swal.fire({
        title: 'Préstamo ya anulado',
        text: 'Este préstamo ya fue anulado anteriormente.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Validar si ya está finalizado
    if (registro.id_estado === 2) {
      Swal.fire({
        title: '¿Anular préstamo finalizado?',
        html: `
          <p>Este préstamo ya está <strong>finalizado</strong>.</p>
          <p><strong>Total Pagado:</strong> $${this.formatearValor(registro.total_pagado)}</p>
          <p class="text-warning mt-2">⚠️ ¿Está seguro de que desea anularlo?</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      }).then((result) => {
        if (result.isConfirmed) {
          this.mostrarFormularioAnulacion(registro);
        }
      });
      return;
    }

    // Mostrar formulario de anulación directamente
    this.mostrarFormularioAnulacion(registro);
  }

  mostrarFormularioAnulacion(registro: any) {
    Swal.fire({
      title: 'Anular Préstamo',
      html: `
        <div class="text-start">
          <p><strong>Préstamo #${registro.id}</strong></p>
          <p><strong>Colaborador:</strong> ${this.colaborador.nombre_completo || 'N/A'}</p>
          <p><strong>Monto Total:</strong> $${this.formatearValor(registro.monto_total)}</p>
          <p><strong>Total Pagado:</strong> $${this.formatearValor(registro.total_pagado)}</p>
          <p><strong>Saldo:</strong> $${this.formatearValor(registro.saldo)}</p>
          <hr>
          <label for="motivo_anulacion" class="form-label text-danger">
            <i class="bi bi-exclamation-triangle"></i> Motivo de anulación *
          </label>
          <textarea 
            id="motivo_anulacion" 
            class="form-control" 
            placeholder="Ingrese el motivo de anulación del préstamo..." 
            rows="4"
            style="resize: none;"
          ></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular Préstamo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      width: '600px',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo_anulacion') as HTMLTextAreaElement).value;
        if (!motivo || motivo.trim() === '') {
          Swal.showValidationMessage('Debe ingresar el motivo de anulación');
          return false;
        }
        if (motivo.trim().length < 10) {
          Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
          return false;
        }
        return motivo;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const body = {
          id: registro.id,
          motivo_anulacion: result.value,
          id_usuario_anulacion: this.utilService.obtenerIdUsuarioActual(),
          fecha_anulacion: new Date().toISOString().replace('T', ' ').substr(0, 19)
        };

        this.prestamosService.anular(body).subscribe(
          (response: any) => {
            Swal.fire({
              title: '¡Anulado!',
              html: `
                <p>El préstamo #${registro.id} ha sido anulado correctamente.</p>
                <p class="text-muted small">El estado del préstamo cambió a "Anulado".</p>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar',
              timer: 3000
            });
            this.obtenerPrestamos();
          },
          (error: any) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo anular el préstamo',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        );
      }
    });
  }

  eliminar(registro: any) {
    // Validar si el préstamo está anulado
    if (registro.id_estado === 3) {
      Swal.fire({
        title: 'Préstamo ya anulado',
        text: 'Este préstamo ya está anulado. No se puede eliminar.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Validar si tiene pagos registrados
    if (registro.total_pagado > 0) {
      Swal.fire({
        title: 'No se puede eliminar',
        html: `
          <p>Este préstamo no puede ser eliminado porque ya tiene pagos registrados.</p>
          <p><strong>Total Pagado:</strong> $${this.formatearValor(registro.total_pagado)}</p>
          <p class="text-info mt-3">💡 <strong>Sugerencia:</strong> Si desea cancelar este préstamo, debe <strong>anularlo</strong> en lugar de eliminarlo.</p>
        `,
        icon: 'warning',
        confirmButtonText: 'Entendido',
        showCancelButton: true,
        cancelButtonText: 'Anular préstamo',
        cancelButtonColor: '#dc3545'
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
          this.anularPrestamo(registro);
        }
      });
      return;
    }

    // Continuar con eliminación si no tiene pagos
    Swal.fire({
      title: '¿Está seguro?',
      html: `
        <p>¿Desea <strong>eliminar permanentemente</strong> el préstamo #${registro.id}?</p>
        <p class="text-muted small">Esta acción eliminará el préstamo y todas sus cuotas asociadas.</p>
        <p class="text-danger small mt-2">⚠️ Esta acción no se puede deshacer.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.prestamosService.eliminar({ id: registro.id }).subscribe(
          (response: any) => {
            Swal.fire({
              title: 'Eliminado',
              text: 'El préstamo ha sido eliminado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              timer: 2000
            });
            this.obtenerPrestamos();
          },
          (error: any) => {
            console.error('Error al eliminar:', error);
            Swal.fire({
              title: 'Error',
              html: `
                <p>No se pudo eliminar el préstamo.</p>
                <p class="text-muted small">${error.error?.message || 'Error desconocido'}</p>
              `,
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        );
      }
    });
  }

  formatearValor(valor: any): string {
    if (!valor) return '0';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return numero.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}