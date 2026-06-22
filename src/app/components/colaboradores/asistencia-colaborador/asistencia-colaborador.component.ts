import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { RegistrosAsistenciaColaboradoresService } from '../../../services/registros-asistencia-colaboradores.service';
import { ColaboradoresService } from '../../../services/colaboradores.service';

@Component({
  selector: 'app-asistencia-colaborador',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './asistencia-colaborador.component.html',
  styleUrl: './asistencia-colaborador.component.scss',
})
export class AsistenciaColaboradorComponent implements OnInit {
  public titulo = 'Asistencia';
  public idColaborador = 0;
  public colaborador: any = null;
  public registros: any[] = [];
  public registrosAgrupados: any[] = [];
  public cargando = true;

  public fechaDesde = '';
  public fechaHasta = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private registrosService: RegistrosAsistenciaColaboradoresService,
    private colaboradoresService: ColaboradoresService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.idColaborador = params['id'];
      const hoy = new Date();
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.fechaDesde = primerDia.toISOString().split('T')[0];
      this.fechaHasta = hoy.toISOString().split('T')[0];
      this.cargarColaborador();
      this.cargarRegistros();
    });
  }

  cargarColaborador() {
    this.colaboradoresService.obtenerById(this.idColaborador).subscribe({
      next: (r: any) => {
        const datos = r.body || [];
        if (datos.length > 0) {
          this.colaborador = datos[0];
          this.titulo = `Asistencia: ${this.colaborador.nombre_completo}`;
        }
      },
      error: () => {},
    });
  }

  cargarRegistros() {
    this.cargando = true;
    this.registrosService.obtenerPorColaborador(this.idColaborador, this.fechaDesde, this.fechaHasta).subscribe({
      next: (r: any) => {
        this.registros = r.body || [];
        this.agruparPorFecha();
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  agruparPorFecha() {
    const mapa = new Map<string, any[]>();
    for (const reg of this.registros) {
      const fecha = reg.fecha;
      if (!mapa.has(fecha)) mapa.set(fecha, []);
      mapa.get(fecha)!.push(reg);
    }
    this.registrosAgrupados = Array.from(mapa.entries()).map(([fecha, regs]) => ({
      fecha,
      fechaFormateada: this.formatearFecha(fecha),
      registros: regs,
    }));
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  filtrar() {
    this.cargarRegistros();
  }

  obtenerIconoTipo(codigo: string): string {
    const iconos: any = {
      'jornada_entrada': 'fas fa-sign-in-alt',
      'jornada_salida': 'fas fa-sign-out-alt',
      'descanso_salida': 'fas fa-coffee',
      'descanso_regreso': 'fas fa-undo',
    };
    return iconos[codigo] || 'fas fa-clock';
  }

  obtenerColorEstado(codigo: string): string {
    const colores: any = {
      'a_tiempo': '#28a745',
      'tarde': '#dc3545',
      'normal': '#17a2b8',
      'salida_anticipada': '#ffc107',
      'entrada_anticipada': '#6f42c1',
    };
    return colores[codigo] || '#6c757d';
  }
}