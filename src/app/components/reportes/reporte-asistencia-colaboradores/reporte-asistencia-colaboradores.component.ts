import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { RegistrosAsistenciaColaboradoresService } from '../../../services/registros-asistencia-colaboradores.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reporte-asistencia-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-asistencia-colaboradores.component.html',
  styleUrl: './reporte-asistencia-colaboradores.component.scss',
})
export class ReporteAsistenciaColaboradoresComponent implements OnInit {
  titulo = 'Reporte de Asistencia Colaboradores';

  cargando = false;
  exportando = false;

  fechaInicio = this.obtenerFechaColombia();
  fechaFin = this.obtenerFechaColombia();

  datos: any[] = [];
  estadisticas: any = {};
  titulos: any[] = [];
  acciones: any[] = [];

  constructor(private registrosService: RegistrosAsistenciaColaboradoresService) {}

  ngOnInit() {
    this.crearTitulos();
    this.cargarDatos();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'fecha', alias: 'Fecha', alinear: 'centrado' },
      { clave: 'nombre_dia', alias: 'Día', alinear: 'centrado' },
      { clave: 'nombre_colaborador', alias: 'Colaborador', alinear: 'izquierda' },
      { clave: 'nombre_tipo', alias: 'Tipo Registro', alinear: 'centrado' },
      { clave: 'hora_registro', alias: 'Hora Registro', alinear: 'centrado' },
      { clave: 'nombre_estado', alias: 'Estado', alinear: 'centrado' },
      { clave: 'registro_manual_texto', alias: 'Manual', alinear: 'centrado' },
      { clave: 'huella_dispositivo', alias: 'Huella', alinear: 'centrado' },
      { clave: 'dispositivo_corto', alias: 'Dispositivo', alinear: 'centrado' },
      { clave: 'cambio_dispositivo_texto', alias: 'Cambió Disp.', alinear: 'centrado' },
      { clave: 'dispositivo_de', alias: 'Dispositivo de', alinear: 'centrado' },
      { clave: 'observaciones', alias: 'Observaciones', alinear: 'izquierda' },
    ];
  }

  cargarDatos() {
    this.cargando = true;
    this.registrosService.obtenerReporte(this.fechaInicio, this.fechaFin).subscribe({
      next: (r: any) => {
        const resp = r.body || r;
        if (resp && resp.registros) {
          this.datos = resp.registros.map((item: any) => ({
            ...item,
            hora_registro: item.hora_registro ? item.hora_registro.substring(0, 5) : '',
            registro_manual_texto: item.registro_manual == 1 ? 'Sí' : 'No',
            nombre_dia: this.traducirDia(item.nombre_dia || ''),
            dispositivo_corto: this.extraerDispositivo(item.user_agent || ''),
            cambio_dispositivo_texto: item.cambio_dispositivo == 1 ? '⚠️ Sí' : 'No',
            dispositivo_de: item.dispositivo_de ? '🚨 ' + item.dispositivo_de : '',
            color: item.dispositivo_de ? '#ffcdd2' : (item.cambio_dispositivo == 1 ? '#fff3cd' : this.obtenerColorEstado(item.codigo_estado)),
          }));
          this.estadisticas = resp.estadisticas || {};
        } else {
          this.datos = [];
          this.estadisticas = {};
        }
        this.cargando = false;
      },
      error: () => { this.datos = []; this.estadisticas = {}; this.cargando = false; },
    });
  }

  onFiltrosChange() {
    if (this.fechaInicio > this.fechaFin) this.fechaFin = this.fechaInicio;
    this.cargarDatos();
  }

  obtenerColorEstado(codigo: string): string {
    switch (codigo) {
      case 'a_tiempo': return '#e8f5e9';
      case 'tarde': return '#ffebee';
      case 'entrada_anticipada': return '#f3e5f5';
      case 'salida_anticipada': return '#fff8e1';
      case 'normal': return '#e3f2fd';
      default: return '';
    }
  }

  traducirDia(dia: string): string {
    const dias: any = { 'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom' };
    return dias[dia] || dia;
  }

  extraerDispositivo(ua: string): string {
    if (!ua) return '';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) {
      const match = ua.match(/Android\s[\d.]+;\s([^)]+)\)/);
      return match ? match[1].split(' Build')[0].trim().substring(0, 20) : 'Android';
    }
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Linux')) return 'Linux';
    return ua.substring(0, 20);
  }

  exportarExcel() {
    this.exportando = true;
    const datosExport = this.datos.map(item => ({
      'Fecha': item.fecha,
      'Día': item.nombre_dia,
      'Colaborador': item.nombre_colaborador,
      'Tipo Registro': item.nombre_tipo,
      'Hora Registro': item.hora_registro,
      'Estado': item.nombre_estado || '',
      'Manual': item.registro_manual_texto,
      'Huella': item.huella_dispositivo || '',
      'Dispositivo': item.dispositivo_corto || '',
      'Cambió Disp.': item.cambio_dispositivo_texto || '',
      'Dispositivo de': item.dispositivo_de || '',
      'Observaciones': item.observaciones || '',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia Colaboradores');
    ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
    XLSX.writeFile(wb, `asistencia_colaboradores_${this.fechaInicio}_${this.fechaFin}.xlsx`);
    setTimeout(() => this.exportando = false, 1000);
  }

  private obtenerFechaColombia(): string {
    const now = new Date();
    const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    return `${ct.getFullYear()}-${String(ct.getMonth() + 1).padStart(2, '0')}-${String(ct.getDate()).padStart(2, '0')}`;
  }
}