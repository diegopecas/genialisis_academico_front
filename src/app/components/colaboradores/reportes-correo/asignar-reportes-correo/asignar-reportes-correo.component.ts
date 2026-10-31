import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { ReportesCorreoColaboradoresService } from '../../../../services/reportes-correo-colaboradores.service';
import { TiposReporteCorreoService } from '../../../../services/tipos-reporte-correo.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';

/**
 * Asignación grupal: se escoge un tipo de reporte y se marcan varios
 * colaboradores activos. Todo viaja al back en un solo arreglo; el back no
 * toca a los que ya tienen ese tipo y deja por fuera a los que no tienen correo.
 */
@Component({
  selector: 'app-asignar-reportes-correo',
  templateUrl: './asignar-reportes-correo.component.html',
  styleUrl: './asignar-reportes-correo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponentAnidado, TablasComponent]
})
export class AsignarReportesCorreoComponent implements OnInit {

  titulo = "Asignar Reporte por Correo";
  raiz = '/colaboradores/reportes-correo';

  public columnasFiltro = ['Cargo', 'Situación'];
  public titulos = [] as any[];
  public datos = [] as any[];

  tipos = [] as any[];
  idTipo: any = null;
  seleccionados = [] as any[];
  guardando = false;

  private colaboradores = [] as any[];
  private asignaciones = [] as any[];

  constructor(
    private reportesCorreoService: ReportesCorreoColaboradoresService,
    private tiposReporteCorreoService: TiposReporteCorreoService,
    private colaboradoresService: ColaboradoresService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.tiposReporteCorreoService.obtenerTodos().subscribe((response: any) => {
      this.tipos = (response.body || []) as any[];
      // Con un solo tipo disponible se deja escogido de una vez
      if (this.tipos.length === 1) {
        this.idTipo = this.tipos[0].id;
        this.armarDatos();
      }
    });
    this.reportesCorreoService.obtenerTodos().subscribe((response: any) => {
      this.asignaciones = (response.body || []) as any[];
      this.armarDatos();
    });
    this.colaboradoresService.obtenerTodos().subscribe((response: any) => {
      this.colaboradores = ((response.body || []) as any[]).filter((c: any) => c.activo == 1);
      this.armarDatos();
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre', alias: 'Colaborador', alinear: 'izquierda' },
      { clave: 'cargo', alias: 'Cargo', alinear: 'izquierda' },
      { clave: 'correo', alias: 'Correo', alinear: 'izquierda' },
      { clave: 'situacion', alias: 'Situación', alinear: 'centrado' },
    ];
  }

  /** Colaboradores con su situación frente al tipo escogido. */
  armarDatos() {
    const conTipo = new Set(
      this.asignaciones
        .filter((a: any) => a.id_tipo_reporte_correo === this.idTipo)
        .map((a: any) => a.id_colaborador)
    );

    this.datos = this.colaboradores.map((c: any) => {
      let situacion = 'Disponible';
      if (conTipo.has(c.id)) {
        situacion = 'Ya lo tiene';
      } else if (!c.correo_electronico) {
        situacion = 'Sin correo';
      }
      return {
        id: c.id,
        nombre: (c.nombre_completo || '').replace(/\s+/g, ' ').trim(),
        cargo: c.nombre_cargo || 'Sin cargo',
        correo: c.correo_electronico || 'Sin correo',
        situacion,
        // Verde pastel los que ya lo tienen; gris los que no tienen correo
        color: situacion === 'Ya lo tiene' ? '#e3f1ea' : (situacion === 'Sin correo' ? '#f1f1f1' : '')
      };
    });

    // La tabla conserva lo marcado cuando cambian los datos: se refresca la
    // situación de los marcados con los datos nuevos.
    const marcados = new Set(this.seleccionados.map((s: any) => s.id));
    this.seleccionados = this.datos.filter((d: any) => marcados.has(d.id));
  }

  cambiarTipo() {
    this.armarDatos();
  }

  seleccionCambiada(registros: any[]) {
    this.seleccionados = registros || [];
  }

  get disponiblesSeleccionados(): number {
    return this.seleccionados.filter((s: any) => s.situacion === 'Disponible').length;
  }

  guardar() {
    if (!this.idTipo) {
      Swal.fire('Advertencia', 'Escoge el tipo de reporte', 'warning');
      return;
    }
    if (this.seleccionados.length === 0) {
      Swal.fire('Advertencia', 'Marca al menos un colaborador', 'warning');
      return;
    }

    this.guardando = true;
    this.reportesCorreoService.asignar({
      id_tipo_reporte_correo: this.idTipo,
      ids_colaboradores: this.seleccionados.map((s: any) => s.id)
    }).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        const partes = [`Se asignó a <b>${respuesta.creados}</b> colaborador(es).`];
        if (respuesta.ya_tenian > 0) {
          partes.push(`${respuesta.ya_tenian} ya lo tenían y no se tocaron.`);
        }
        if (respuesta.sin_correo && respuesta.sin_correo.length > 0) {
          partes.push(`Sin correo, quedaron por fuera: ${respuesta.sin_correo.join(', ')}.`);
        }
        Swal.fire({ title: 'Listo', html: partes.join('<br>'), icon: 'success' })
          .then(() => this.router.navigate([this.raiz]));
      },
      error: (error: any) => {
        // El mensaje del backend lo muestra el interceptor
        this.guardando = false;
        console.error('Error al asignar los reportes por correo', error);
      }
    });
  }

  volver() {
    this.router.navigate([this.raiz]);
  }
}
