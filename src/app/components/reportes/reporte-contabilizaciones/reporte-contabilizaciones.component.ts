import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { ContabilizacionesService } from '../../../services/contabilizaciones.service';

interface Contabilizacion {
  id: number;
  id_tipo_contabilizacion: number;
  tipo_contabilizacion: string;
  fecha_contabilizacion: string;
  usuario_contabilizacion: string;
  observaciones: string;
  minutos_total: number;
  valor_total: number;
  colaboradores: string;
  expandido?: boolean;
  detalle?: DetalleCruce[];
  colaboradores_agrupados?: ColaboradorAgrupadoEnContabilizacion[];
  cargandoDetalle?: boolean;
}

interface DetalleCruce {
  colaborador: string;
  id_colaborador: number;
  minutos_cruzados: number;
  // Datos del permiso
  id_actividad_permiso: number;
  tipo_actividad_permiso: string;
  categoria_permiso: string;
  fecha_permiso: string;
  observacion_permiso: string;
  minutos_aplicados_permiso: number;
  minutos_totales_permiso: number;
  minutos_restantes_permiso: number;
  // Datos de la hora
  id_actividad_hora: number;
  tipo_actividad_hora: string;
  categoria_hora: string;
  fecha_hora: string;
  observacion_hora: string;
  minutos_aplicados_hora: number;
  minutos_totales_hora: number;
  minutos_restantes_hora: number;
}

interface ColaboradorAgrupadoEnContabilizacion {
  nombre: string;
  id_colaborador: number;
  total_minutos: number;
  cruces: DetalleCruce[];
  expandido: boolean;
}

// Interfaces para el TAB 2 (por colaboradores)
interface ColaboradorAgrupado {
  nombre: string;
  id_colaborador: number;
  total_minutos: number;
  total_valor: number;
  contabilizaciones: ContabilizacionDeColaborador[];
  expandido: boolean;
}

interface ContabilizacionDeColaborador {
  id_contabilizacion: number;
  fecha_contabilizacion: string;
  tipo_contabilizacion: string;
  minutos_contabilizados: number;
  valor_contabilizado: number;
  observaciones: string;
  expandido: boolean;
  detalle?: DetalleCruce[];
  cargandoDetalle?: boolean;
}

interface Colaborador {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-reporte-contabilizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reporte-contabilizaciones.component.html',
  styleUrl: './reporte-contabilizaciones.component.scss'
})
export class ReporteContabilizacionesComponent implements OnInit {
  titulo = "Reportes de Contabilizaciones";
  
  // TAB ACTIVO
  tabActivo: 'contabilizaciones' | 'colaboradores' = 'contabilizaciones';
  
  // Datos TAB 1 (por contabilizaciones)
  contabilizaciones: Contabilizacion[] = [];
  
  // Datos TAB 2 (por colaboradores)
  colaboradoresAgrupados: ColaboradorAgrupado[] = [];
  
  cargando = false;

  // Filtros
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroTipo: string = '';
  filtroColaborador: number | null = null;
  
  // Lista de colaboradores para el dropdown (extraída de las contabilizaciones)
  colaboradores: Colaborador[] = [];

  constructor(
    private router: Router,
    private contabilizacionesService: ContabilizacionesService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.inicializarFechas();
    this.cargarContabilizaciones();
  }

  inicializarFechas() {
    const hoy = new Date();
    const primerDiaAnio = new Date(hoy.getFullYear(), 0, 1);
    
    // Formato YYYY-MM-DD
    this.filtroFechaInicio = primerDiaAnio.toISOString().split('T')[0];
    this.filtroFechaFin = hoy.toISOString().split('T')[0];
  }

  cargarContabilizaciones() {
    this.cargando = true;
    
    // Construir query string
    let params = [];
    if (this.filtroFechaInicio) {
      params.push(`fecha_inicio=${this.filtroFechaInicio}`);
    }
    if (this.filtroFechaFin) {
      params.push(`fecha_fin=${this.filtroFechaFin}`);
    }
    if (this.filtroTipo) {
      params.push(`tipo=${this.filtroTipo}`);
    }
    if (this.filtroColaborador) {
      params.push(`id_colaborador=${this.filtroColaborador}`);
    }
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    
    this.contabilizacionesService.obtenerParaReporte(queryString).subscribe({
      next: (response: any) => {
        this.contabilizaciones = (response.body || []).map((c: any) => ({
          ...c,
          expandido: false,
          detalle: [],
          cargandoDetalle: false
        }));
        
        // Extraer colaboradores únicos para el dropdown
        this.extraerColaboradores();
        
        // Agrupar por colaboradores para el TAB 2
        this.agruparPorColaboradores();
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar contabilizaciones:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las contabilizaciones',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        this.cargando = false;
      }
    });
  }

  extraerColaboradores() {
    const colaboradoresMap = new Map<number, string>();
    
    // Extraer colaboradores de las contabilizaciones
    this.contabilizaciones.forEach(c => {
      if (c.colaboradores) {
        // colaboradores viene como string separado por comas del backend
        // Para obtener IDs necesitamos cargar el detalle
        // Por ahora usamos solo los nombres
      }
    });
    
    // Cargar todos los detalles para extraer los colaboradores con ID
    const promises = this.contabilizaciones.map(c => 
      new Promise<void>((resolve) => {
        this.contabilizacionesService.obtenerDetalle(c.id).subscribe({
          next: (response: any) => {
            const detalle = response.body || [];
            detalle.forEach((d: any) => {
              if (!colaboradoresMap.has(d.id_colaborador)) {
                colaboradoresMap.set(d.id_colaborador, d.colaborador);
              }
            });
            resolve();
          },
          error: () => resolve()
        });
      })
    );
    
    Promise.all(promises).then(() => {
      this.colaboradores = Array.from(colaboradoresMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  }

  agruparPorColaboradores() {
    const gruposMap = new Map<number, ColaboradorAgrupado>();
    
    // Iterar sobre todas las contabilizaciones y cargar sus detalles
    const promises = this.contabilizaciones.map(c => 
      new Promise<void>((resolve) => {
        this.contabilizacionesService.obtenerDetalle(c.id).subscribe({
          next: (response: any) => {
            const detalle = response.body || [];
            
            detalle.forEach((d: any) => {
              if (!gruposMap.has(d.id_colaborador)) {
                gruposMap.set(d.id_colaborador, {
                  nombre: d.colaborador,
                  id_colaborador: d.id_colaborador,
                  total_minutos: 0,
                  total_valor: 0,
                  contabilizaciones: [],
                  expandido: false
                });
              }
              
              const grupo = gruposMap.get(d.id_colaborador)!;
              
              // Buscar si ya existe esta contabilización en el grupo
              let contabColaborador = grupo.contabilizaciones.find(
                cc => cc.id_contabilizacion === c.id
              );
              
              if (!contabColaborador) {
                contabColaborador = {
                  id_contabilizacion: c.id,
                  fecha_contabilizacion: c.fecha_contabilizacion,
                  tipo_contabilizacion: c.tipo_contabilizacion,
                  minutos_contabilizados: 0,
                  valor_contabilizado: 0,
                  observaciones: c.observaciones,
                  expandido: false,
                  detalle: []
                };
                grupo.contabilizaciones.push(contabColaborador);
              }
              
              // Sumar minutos
              contabColaborador.minutos_contabilizados += d.minutos_cruzados;
              grupo.total_minutos += d.minutos_cruzados;
              
              // Agregar detalle
              contabColaborador.detalle!.push(d);
            });
            
            resolve();
          },
          error: () => resolve()
        });
      })
    );
    
    Promise.all(promises).then(() => {
      this.colaboradoresAgrupados = Array.from(gruposMap.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  }

  cambiarTab(tab: 'contabilizaciones' | 'colaboradores') {
    this.tabActivo = tab;
  }

  toggleDetalle(contabilizacion: Contabilizacion) {
    contabilizacion.expandido = !contabilizacion.expandido;
    
    if (contabilizacion.expandido && (!contabilizacion.detalle || contabilizacion.detalle.length === 0)) {
      this.cargarDetalle(contabilizacion);
    }
  }

  cargarDetalle(contabilizacion: Contabilizacion) {
    contabilizacion.cargandoDetalle = true;
    
    this.contabilizacionesService.obtenerDetalle(contabilizacion.id).subscribe({
      next: (response: any) => {
        contabilizacion.detalle = response.body || [];
        contabilizacion.colaboradores_agrupados = this.agruparPorColaborador(contabilizacion.detalle || []);
        contabilizacion.cargandoDetalle = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
        contabilizacion.cargandoDetalle = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el detalle de la contabilización',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  agruparPorColaborador(detalle: DetalleCruce[]): ColaboradorAgrupadoEnContabilizacion[] {
    const grupos: { [key: number]: ColaboradorAgrupadoEnContabilizacion } = {};
    
    detalle.forEach(cruce => {
      if (!grupos[cruce.id_colaborador]) {
        grupos[cruce.id_colaborador] = {
          nombre: cruce.colaborador,
          id_colaborador: cruce.id_colaborador,
          total_minutos: 0,
          cruces: [],
          expandido: false
        };
      }
      
      grupos[cruce.id_colaborador].cruces.push(cruce);
      grupos[cruce.id_colaborador].total_minutos += cruce.minutos_cruzados;
    });
    
    return Object.values(grupos);
  }

  toggleColaborador(grupo: ColaboradorAgrupadoEnContabilizacion | ColaboradorAgrupado) {
    grupo.expandido = !grupo.expandido;
  }

  toggleContabilizacionEnColaborador(contabilizacion: ContabilizacionDeColaborador) {
    contabilizacion.expandido = !contabilizacion.expandido;
  }

  agruparCrucesPorPermiso(cruces: DetalleCruce[]): any[] {
    const resultado: any[] = [];
    const permisosMap = new Map<string, any>();
    
    cruces.forEach(cruce => {
      const permisoKey = `${cruce.id_actividad_permiso}`;
      
      if (!permisosMap.has(permisoKey)) {
        permisosMap.set(permisoKey, {
          permiso: {
            tipo_actividad: cruce.tipo_actividad_permiso,
            categoria: cruce.categoria_permiso,
            fecha: cruce.fecha_permiso,
            observacion: cruce.observacion_permiso,
            minutos_totales: cruce.minutos_totales_permiso,
            minutos_restantes: cruce.minutos_restantes_permiso
          },
          horas: []
        });
      }
      
      permisosMap.get(permisoKey)!.horas.push({
        tipo_actividad: cruce.tipo_actividad_hora,
        categoria: cruce.categoria_hora,
        fecha: cruce.fecha_hora,
        observacion: cruce.observacion_hora,
        minutos_totales: cruce.minutos_totales_hora,
        minutos_restantes: cruce.minutos_restantes_hora,
        minutos_cruzados: cruce.minutos_cruzados
      });
    });
    
    permisosMap.forEach(value => {
      resultado.push({
        permiso: value.permiso,
        horas: value.horas,
        rowspan: value.horas.length
      });
    });
    
    return resultado;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearMinutos(minutos: number): string {
    if (!minutos && minutos !== 0) return '0h 0m';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  formatearValor(valor: number): string {
    if (!valor) return '$0';
    return `$${valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  aplicarFiltros() {
    this.cargarContabilizaciones();
  }

  limpiarFiltros() {
    this.inicializarFechas();
    this.filtroTipo = '';
    this.filtroColaborador = null;
    this.cargarContabilizaciones();
  }

  exportarExcel() {
    Swal.fire({
      title: 'Exportar a Excel',
      text: 'Funcionalidad en desarrollo',
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  }

  regresar() {
    this.router.navigate(['/reportes']);
  }
}