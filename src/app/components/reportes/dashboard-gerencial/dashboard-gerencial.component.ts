import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { DashboardOperativoComponent } from './secciones/operativo/dashboard-operativo.component';
import { DashboardFinancieroComponent } from './secciones/financiero/dashboard-financiero.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard-gerencial',
  templateUrl: './dashboard-gerencial.component.html',
  styleUrl: './dashboard-gerencial.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, DashboardOperativoComponent, DashboardFinancieroComponent]
})
export class DashboardGerencialComponent implements OnInit {

  titulo = 'Dashboard Gerencial';

  public fecha: string = '';

  public tabs = [
    { id: 'operativo', label: 'Operativo', disponible: true, icono: '🏫' },
    { id: 'academico', label: 'Académico', disponible: false, icono: '📚' },
    { id: 'financiero', label: 'Financiero', disponible: true, icono: '💰' }
  ];
  public tabActivo: string = 'operativo';

  constructor() { }

  ngOnInit(): void {
    this.fecha = this.fechaHoy();
  }

  fechaHoy(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  fechaAyer(): string {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const year = ayer.getFullYear();
    const month = String(ayer.getMonth() + 1).padStart(2, '0');
    const day = String(ayer.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  esFechaHoy(): boolean {
    return this.fecha === this.fechaHoy();
  }

  // =========================================
  // ACCIONES DE FECHA
  // =========================================
  seleccionarHoy() {
    this.fecha = this.fechaHoy();
  }

  seleccionarAyer() {
    this.fecha = this.fechaAyer();
  }

  cambiarFecha() {
    if (!this.fecha) {
      this.fecha = this.fechaHoy();
    }
  }

  // =========================================
  // TABS
  // =========================================
  seleccionarTab(tab: any) {
    if (!tab.disponible) {
      Swal.fire({
        icon: 'info',
        title: 'Próximamente',
        text: `La sección ${tab.label} estará disponible pronto.`
      });
      return;
    }
    this.tabActivo = tab.id;
  }
}