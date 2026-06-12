import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import {
  ContratosColaboradorService,
  ContratoColaborador,
} from '../../../services/contratos-colaborador.service';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import { PermisosService } from '../../../services/permisos.service';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';

@Component({
  selector: 'app-contratos-colaborador',
  standalone: true,
  imports: [CommonModule, HeaderComponentAnidado, TablasComponent],
  templateUrl: './contratos-colaborador.component.html',
  styleUrls: ['./contratos-colaborador.component.scss'],
})
export class ContratosColaboradorComponent implements OnInit {
  public idColaborador = '0';
  public colaborador: any;
  public nombre_colaborador = '';

  public titulo = 'Contratos';
  public path = '/colaboradores-contratos/crear/0/';

  public contratos: ContratoColaborador[] = [];
  public titulos = [] as any[];
  public columnasFiltro = ['Año', 'Cargo', 'Tipo'];

  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratosService: ContratosColaboradorService,
    private colaboradoresService: ColaboradoresService,
    private permisosService: PermisosService
  ) {}

  ngOnInit(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso(
      'colaboradores.contratos.administrar'
    );
    this.crearTitulos();

    this.route.params.subscribe((params) => {
      this.idColaborador = params['id'];
      this.path = this.path + this.idColaborador;
      this.obtenerColaborador(this.idColaborador);
    });
  }

  crearTitulos(): void {
    this.titulos = [
      { clave: 'numero', alias: 'No.', alinear: 'centrado' },
      { clave: 'anio', alias: 'Año', alinear: 'centrado' },
      { clave: 'cargo_nombre', alias: 'Cargo', alinear: 'izquierda' },
      { clave: 'tipo_contrato_nombre', alias: 'Tipo', alinear: 'centrado' },
      {
        clave: 'fecha_inicio',
        alias: 'Inicio',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy' },
      },
      {
        clave: 'fecha_fin',
        alias: 'Fin',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy' },
      },
    ];
  }

  obtenerColaborador(id_colaborador: any): void {
    this.colaboradoresService.obtenerById(id_colaborador).subscribe((response: any) => {
      const body = response.body as any[];
      this.colaborador = body[0];
      this.nombre_colaborador = [
        this.colaborador.primer_nombre,
        this.colaborador.segundo_nombre,
        this.colaborador.primer_apellido,
        this.colaborador.segundo_apellido,
      ]
        .filter(Boolean)
        .join(' ');
      this.titulo = 'Contratos de ' + this.nombre_colaborador;
      this.cargarContratos();
    });
  }

  cargarContratos(): void {
    this.contratosService.obtenerByColaborador(this.idColaborador).subscribe({
      next: (response: any) => {
        this.contratos = response.body || [];
      },
      error: (error: any) => {
        console.error('Error al cargar contratos:', error);
        Swal.fire('Error', 'No se pudieron cargar los contratos', 'error');
      },
    });
  }

  accionTabla(event: any): void {
    if (event.accion === 'editar') {
      this.router.navigate([
        'colaboradores-contratos/editar/' + event.id + '/' + this.idColaborador,
      ]);
    }
    if (event.accion === 'eliminar') {
      this.anularContrato(event.registro);
    }
  }

  anularContrato(contrato: any): void {
    Swal.fire({
      title: '¿Anular contrato?',
      text: 'Esta acción ocultará el contrato de la lista.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.contratosService.anular(contrato.id).subscribe({
          next: () => {
            Swal.fire('Anulado', 'El contrato fue anulado', 'success');
            this.cargarContratos();
          },
          error: (error: any) => {
            console.error('Error al anular:', error);
            Swal.fire('Error', 'No se pudo anular el contrato', 'error');
          },
        });
      }
    });
  }
}