import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AuditoriaService } from '../../../services/auditoria.service';
import { GruposService } from '../../../services/grupos.service';
import { SprintsService } from '../../../services/sprints.service';
import collect from 'collect.js';

interface ResumenGrupo {
  id_grupo: number;
  nombre_grupo: string;
  icono?: string;
  color?: string;
  medidas?: any;
  asistencia?: any;
  clases?: any;
  indicadorGeneral: string;
}

@Component({
  selector: 'app-auditoria-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './auditoria-registros.component.html',
  styleUrl: './auditoria-registros.component.scss'
})
export class AuditoriaRegistrosComponent implements OnInit {
  public titulo = "Auditoria de Registros Docentes";
  
  // Estados
  public cargando = false;
  public vistaActual: 'resumen' | 'detalle' = 'resumen';
  public grupoSeleccionado: ResumenGrupo | null = null;
  
  // Filtros
  public anioSeleccionado: number = new Date().getFullYear();
  public mesSeleccionado: number = new Date().getMonth() + 1;
  public sprintSeleccionado: any = null;
  public tipoFiltro: 'mes' | 'sprint' = 'sprint';
  
  // Datos
  public grupos: any[] = [];
  public sprints: any[] = [];
  public resumenes: ResumenGrupo[] = [];
  
  // Listas para selectores
  public anios: number[] = [];
  public meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Propiedades para el modal
  public modalAbierto = false;
  public modalTitulo = '';
  public modalCargando = false;
  public modalDatos: any[] = [];
  public modalTitulos: any[] = [];

  constructor(
    private auditoriaService: AuditoriaService,
    private gruposService: GruposService,
    private sprintsService: SprintsService
  ) {}

  ngOnInit(): void {
    this.inicializarAnios();
    this.cargarDatosIniciales();
  }

  inicializarAnios(): void {
    const anioActual = new Date().getFullYear();
    this.anios = [anioActual - 1, anioActual];
  }

  cargarDatosIniciales(): void {
    // Solo cargar grupos y sprints, no los datos
    Promise.all([
      this.cargarGrupos(),
      this.cargarSprints()
    ]).then(() => {
      // No cargar datos automáticamente
    });
  }

  async cargarGrupos(): Promise<void> {
    return new Promise((resolve) => {
      this.gruposService.obtenerTodos().subscribe({
        next: (response: any) => {
          this.grupos = collect(response.body)
            .where('calificable', '==', 1)
            .all() as any[];
          resolve();
        },
        error: (error) => {
          console.error('Error cargando grupos:', error);
          resolve();
        }
      });
    });
  }

  async cargarSprints(): Promise<void> {
    return new Promise((resolve) => {
      this.sprintsService.obtenerTodos().subscribe({
        next: (response: any) => {
          this.sprints = response.body;
          // Seleccionar sprint actual por defecto
          this.sprintSeleccionado = collect(this.sprints)
            .where('actual', '1')
            .first();
          resolve();
        },
        error: (error) => {
          console.error('Error cargando sprints:', error);
          resolve();
        }
      });
    });
  }

  // Método principal para consultar
  consultar(): void {
    this.cargando = true;
    this.resumenes = [];
    
    const fechaInicio = this.obtenerFechaInicio();
    const fechaFin = this.obtenerFechaFin();
    const idSprint = this.tipoFiltro === 'sprint' && this.sprintSeleccionado 
      ? this.sprintSeleccionado.id 
      : undefined;
    
    // UNA SOLA LLAMADA al servicio de auditoría
    this.auditoriaService.obtenerResumenCompleto(fechaInicio, fechaFin, idSprint)
      .subscribe({
        next: (response: any) => {
          if (response.body) {
            this.procesarResumenCompleto(response.body);
          }
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar resumen:', error);
          this.cargando = false;
        }
      });
  }

  procesarResumenCompleto(datos: any[]): void {
    this.resumenes = datos.map(grupo => {
      const resumen: ResumenGrupo = {
        id_grupo: grupo.id_grupo,
        nombre_grupo: grupo.nombre_grupo,
        icono: grupo.icono,
        color: grupo.color,
        medidas: grupo.medidas,
        asistencia: grupo.asistencia,
        clases: grupo.clases,
        indicadorGeneral: this.calcularIndicadorGeneral(grupo)
      };
      return resumen;
    });
  }

  calcularIndicadorGeneral(resumen: any): string {
    let puntos = 0;
    let total = 0;
    
    // Evaluar medidas (cumplimiento general)
    if (resumen.medidas) {
      const cumplimiento = resumen.medidas.porcentaje_cumplimiento_general || 0;
      puntos += cumplimiento >= 80 ? 3 : cumplimiento >= 50 ? 2 : 1;
      total += 3;
    }
    
    // Evaluar asistencia (promedio de asistencia)
    if (resumen.asistencia) {
      const asistencia = resumen.asistencia.promedio_asistencia || 0;
      puntos += asistencia >= 80 ? 3 : asistencia >= 50 ? 2 : 1;
      total += 3;
    }
    
    // Evaluar clases (porcentaje de clases normales)
    if (resumen.clases) {
      const clasesNormales = resumen.clases.porcentaje_normales || 0;
      puntos += clasesNormales >= 70 ? 3 : clasesNormales >= 40 ? 2 : 1;
      total += 3;
    }
    
    const porcentaje = total > 0 ? (puntos / total) * 100 : 0;
    
    if (porcentaje >= 80) return 'verde';
    if (porcentaje >= 50) return 'amarillo';
    return 'rojo';
  }

  obtenerFechaInicio(): string {
    if (this.tipoFiltro === 'sprint' && this.sprintSeleccionado) {
      return this.sprintSeleccionado.fecha_inicial;
    }
    
    return `${this.anioSeleccionado}-${String(this.mesSeleccionado).padStart(2, '0')}-01`;
  }

  obtenerFechaFin(): string {
    if (this.tipoFiltro === 'sprint' && this.sprintSeleccionado) {
      return this.sprintSeleccionado.fecha_final;
    }
    
    const ultimoDia = new Date(this.anioSeleccionado, this.mesSeleccionado, 0).getDate();
    return `${this.anioSeleccionado}-${String(this.mesSeleccionado).padStart(2, '0')}-${ultimoDia}`;
  }

  cambiarTipoFiltro(): void {
    // No hacer nada automáticamente, esperar al botón consultar
  }

  cambiarPeriodo(): void {
    // No hacer nada automáticamente, esperar al botón consultar
  }

  seleccionarGrupo(grupo: ResumenGrupo): void {
    this.grupoSeleccionado = grupo;
    this.vistaActual = 'detalle';
  }

  volverAResumen(): void {
    this.vistaActual = 'resumen';
    this.grupoSeleccionado = null;
  }

  obtenerClaseIndicador(indicador: string): string {
    switch (indicador) {
      case 'verde': return 'indicador-verde';
      case 'amarillo': return 'indicador-amarillo';
      case 'rojo': return 'indicador-rojo';
      default: return '';
    }
  }

  obtenerIconoIndicador(indicador: string | undefined): string {
    if (!indicador) return 'fa-question-circle';
    
    switch (indicador) {
      case 'verde': return 'fa-check-circle';
      case 'amarillo': return 'fa-exclamation-circle';
      case 'rojo': return 'fa-times-circle';
      default: return 'fa-question-circle';
    }
  }

  // Métodos para abrir modales de detalle
  verDetalleMedidas(): void {
    if (!this.grupoSeleccionado) return;
    
    this.modalTitulo = `Detalle de Medidas - ${this.grupoSeleccionado.nombre_grupo}`;
    this.modalCargando = true;
    this.modalDatos = [];
    this.modalAbierto = true;
    
    // Configurar títulos para la tabla
    this.modalTitulos = [
      { clave: 'fecha_formateada', alias: 'Fecha', tipo: undefined },
      { clave: 'estudiante', alias: 'Estudiante', tipo: undefined },
      { clave: 'medida', alias: 'Medida', tipo: undefined },
      { clave: 'valor', alias: 'Valor', tipo: 'number' },
      { clave: 'registrado_por', alias: 'Registrado por', tipo: undefined }
    ];
    
    // Cargar datos
    const fechaInicio = this.obtenerFechaInicio();
    const fechaFin = this.obtenerFechaFin();
    
    this.auditoriaService.obtenerDetalleMedidas(this.grupoSeleccionado.id_grupo, fechaInicio, fechaFin)
      .subscribe({
        next: (response: any) => {
          this.modalDatos = response.body || [];
          this.modalCargando = false;
        },
        error: (error) => {
          console.error('Error al cargar detalle de medidas:', error);
          this.modalCargando = false;
        }
      });
  }

  verDetalleAsistencia(): void {
    if (!this.grupoSeleccionado) return;
    
    this.modalTitulo = `Detalle de Asistencia - ${this.grupoSeleccionado.nombre_grupo}`;
    this.modalCargando = true;
    this.modalDatos = [];
    this.modalAbierto = true;
    
    // Configurar títulos para la tabla
    this.modalTitulos = [
      { clave: 'fecha', alias: 'Fecha', tipo: undefined },
      { clave: 'estudiante', alias: 'Estudiante', tipo: undefined },
      { clave: 'hora_entrada', alias: 'Entrada', tipo: undefined },
      { clave: 'hora_salida', alias: 'Salida', tipo: undefined },
      { clave: 'tiempo_estancia', alias: 'Estancia', tipo: undefined },
      { clave: 'estado', alias: 'Estado', tipo: 'badge', claseCSS: 'badge-warning' },
      { clave: 'registrado_entrada', alias: 'Registró entrada', tipo: undefined }
    ];
    
    // Cargar datos
    const fechaInicio = this.obtenerFechaInicio();
    const fechaFin = this.obtenerFechaFin();
    
    this.auditoriaService.obtenerDetalleAsistencia(this.grupoSeleccionado.id_grupo, fechaInicio, fechaFin)
      .subscribe({
        next: (response: any) => {
          this.modalDatos = response.body || [];
          // Ajustar clase CSS según el estado
          this.modalDatos.forEach(dato => {
            if (dato.estado === 'Sospechoso') {
              dato.estado_claseCSS = 'badge-danger';
            } else {
              dato.estado_claseCSS = 'badge-success';
            }
          });
          this.modalCargando = false;
        },
        error: (error) => {
          console.error('Error al cargar detalle de asistencia:', error);
          this.modalCargando = false;
        }
      });
  }

  verDetalleClases(): void {
    if (!this.grupoSeleccionado) return;
    
    this.modalTitulo = `Detalle de Clases - ${this.grupoSeleccionado.nombre_grupo}`;
    this.modalCargando = true;
    this.modalDatos = [];
    this.modalAbierto = true;
    
    // Configurar títulos para la tabla
    this.modalTitulos = [
      { clave: 'fecha', alias: 'Fecha', tipo: undefined },
      { clave: 'actividad', alias: 'Actividad', tipo: undefined },
      { clave: 'hora_inicio', alias: 'Inicio', tipo: undefined },
      { clave: 'hora_fin', alias: 'Fin', tipo: undefined },
      { clave: 'duracion', alias: 'Duración', tipo: undefined },
      { clave: 'categoria', alias: 'Categoría', tipo: 'badge' },
      { clave: 'docente', alias: 'Docente', tipo: undefined }
    ];
    
    // Cargar datos
    const idSprint = this.tipoFiltro === 'sprint' && this.sprintSeleccionado 
      ? this.sprintSeleccionado.id 
      : undefined;
      
    this.auditoriaService.obtenerDetalleClases(this.grupoSeleccionado.id_grupo, idSprint)
      .subscribe({
        next: (response: any) => {
          this.modalDatos = response.body || [];
          // Ajustar clase CSS según la categoría
          this.modalDatos.forEach(dato => {
            switch(dato.categoria) {
              case 'No ejecutada':
                dato.categoria_claseCSS = 'badge-secondary';
                break;
              case 'Muy corta':
                dato.categoria_claseCSS = 'badge-danger';
                break;
              case 'Corta':
                dato.categoria_claseCSS = 'badge-warning';
                break;
              case 'Normal':
                dato.categoria_claseCSS = 'badge-success';
                break;
              case 'Muy larga':
                dato.categoria_claseCSS = 'badge-info';
                break;
            }
          });
          this.modalCargando = false;
        },
        error: (error) => {
          console.error('Error al cargar detalle de clases:', error);
          this.modalCargando = false;
        }
      });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.modalDatos = [];
    this.modalTitulos = [];
    this.modalTitulo = '';
  }
}