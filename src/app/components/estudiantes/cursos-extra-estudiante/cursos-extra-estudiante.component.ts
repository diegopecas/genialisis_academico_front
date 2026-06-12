import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EstudiantesXCursosExtraService } from '../../../services/estudiantes-x-cursos-extra.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { CuentasCobrarXCursoExtraService } from '../../../services/cuentas-cobrar-x-curso-extra.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cursos-extra-estudiante',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './cursos-extra-estudiante.component.html',
  styleUrl: './cursos-extra-estudiante.component.scss'
})
export class CursosExtraEstudianteComponent {
  public titulo = "Cursos Extracurriculares";
  public idEstudiante = "0";
  public path = "/estudiantes-cursos-extra/crear/0/";
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Curso', 'Estado'];
  public acciones = [] as any[];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private estudiantesXCursosExtraService: EstudiantesXCursosExtraService,
    private cuentasCobrarXCursoExtraService: CuentasCobrarXCursoExtraService,
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.idEstudiante = params['id'];
      this.path = "/estudiantes-cursos-extra/crear/0/" + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);
    });
    this.crearTitulos();
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      this.nombre_estudiante = [
        this.estudiante.primer_nombre,
        this.estudiante.segundo_nombre,
        this.estudiante.primer_apellido,
        this.estudiante.segundo_apellido
      ].filter(Boolean).join(' ');
      this.titulo = "Cursos Extracurriculares de " + this.nombre_estudiante;
      this.obtenerCursos();
    });
  }

  obtenerCursos() {
    this.estudiantesXCursosExtraService.obtenerByEstudiante(this.idEstudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map((c: any) => ({
        ...c,
        estado: c.activo === 1 ? 'Activo' : 'Anulada',
        color: c.activo === 0 ? '#e2e9f3' : ''
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_curso', alias: 'Curso', alinear: 'izquierda' },
      { clave: 'fecha_inscripcion', alias: 'Fecha Inscripción', alinear: 'centrado' },
      { clave: 'anio', alias: 'Año', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  seleccionar(event: any) {
    switch (event.accion) {
      case 'eliminar':
        this.retirar(event.registro);
        break;
    }
  }

  // Antes de confirmar el retiro, consulta las cuentas asociadas y las muestra en el Swal
  // diferenciando cuales se anularan y cuales se conservan por tener pagos.
  async retirar(registro: any) {
    if (registro.activo === 0) {
      Swal.fire('Inscripción ya anulada', 'Esta inscripción ya fue anulada previamente.', 'info');
      return;
    }

    this.cuentasCobrarXCursoExtraService.obtenerByInscripcion(registro.id).subscribe({
      next: async (response: any) => {
        const cuentas = (response.body as any[]) || [];
        const htmlCuentas = this.construirHtmlCuentas(cuentas);

        const result = await Swal.fire({
          title: '¿Retirar del curso?',
          html: `
            <div style="text-align:center;margin-bottom:12px;">
              ¿Desea retirar a <strong>${this.nombre_estudiante}</strong> del curso
              <strong>${registro.nombre_curso}</strong>?
            </div>
            ${htmlCuentas}
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, retirar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#d4af37',
          cancelButtonColor: '#222',
          width: cuentas.length > 0 ? 700 : 500
        });

        if (result.isConfirmed) {
          this.ejecutarRetiro(registro);
        }
      },
      error: (error: any) => {
        console.error("Error al consultar cuentas de la inscripción", error);
        Swal.fire('Error', 'No se pudieron consultar las cuentas asociadas', 'error');
      }
    });
  }

  // Construye la tabla de preview con el estado que tendra cada cuenta tras el retiro
  private construirHtmlCuentas(cuentas: any[]): string {
    if (!cuentas || cuentas.length === 0) {
      return `<div style="text-align:center;color:#666;font-size:13px;">
                Esta inscripción no tiene cuentas por cobrar asociadas.
              </div>`;
    }

    const filas = cuentas.map((c: any) => {
      const valor = Number(c.valor || 0);
      const valorPagado = Number(c.valor_pagado || 0);
      const anulado = Number(c.anulado || 0) === 1;

      let badge = '';
      if (anulado) {
        badge = `<span style="background:#222;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;">Ya anulada</span>`;
      } else if (valorPagado > 0) {
        badge = `<span style="background:#26a69a;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;">Se conserva (con pagos)</span>`;
      } else {
        badge = `<span style="background:#9e9e9e;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;">Se anulará</span>`;
      }

      return `
        <tr>
          <td style="padding:6px 8px;text-align:left;">${c.nombre_producto || ''}</td>
          <td style="padding:6px 8px;text-align:center;">${c.fecha || ''}</td>
          <td style="padding:6px 8px;text-align:right;">${this.formatearMoneda(valor)}</td>
          <td style="padding:6px 8px;text-align:right;">${this.formatearMoneda(valorPagado)}</td>
          <td style="padding:6px 8px;text-align:center;">${badge}</td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-top:8px;">
        <div style="font-size:13px;color:#222;margin-bottom:6px;text-align:left;font-weight:500;">
          Detalle de cuentas por cobrar asociadas:
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e0e0e0;">
          <thead>
            <tr style="background:#d4af37;color:#fff;">
              <th style="padding:8px;text-align:left;">Producto</th>
              <th style="padding:8px;text-align:center;">Fecha</th>
              <th style="padding:8px;text-align:right;">Valor</th>
              <th style="padding:8px;text-align:right;">Pagado</th>
              <th style="padding:8px;text-align:center;">Acción al retirar</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
          </tbody>
        </table>
      </div>
    `;
  }

  private formatearMoneda(valor: number): string {
    return valor.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });
  }

  // Una sola llamada al backend que en una transaccion anula cuentas sin pagos y la inscripcion
  private ejecutarRetiro(registro: any) {
    this.estudiantesXCursosExtraService.anular(registro.id).subscribe({
      next: (response: any) => {
        let mensaje = 'Estudiante retirado del curso.';
        if (response.anuladas > 0) {
          mensaje += ` Se anularon ${response.anuladas} cuenta(s) por cobrar.`;
        }
        if (response.con_pagos && response.con_pagos.length > 0) {
          mensaje += ` ${response.con_pagos.length} cuenta(s) con pagos se conservaron.`;
          Swal.fire({
            title: 'Estudiante retirado',
            html: `${mensaje}<br><br><strong>Cuentas con pagos (gestionar manualmente):</strong><br>${response.con_pagos.map((c: any) => `${c.nombre_producto} - ${c.fecha}`).join('<br>')}`,
            icon: 'warning'
          });
        } else {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: mensaje, showConfirmButton: false, timer: 3000 });
        }
        this.obtenerCursos();
      },
      error: (error: any) => {
        console.error("Error al retirar", error);
        Swal.fire('Error', 'No se pudo retirar al estudiante', 'error');
      }
    });
  }
}