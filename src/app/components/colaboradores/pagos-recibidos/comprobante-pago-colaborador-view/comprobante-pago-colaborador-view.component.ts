import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PagosRecibidosService } from '../../../../services/pagos-recibidos.service';
import { ComprobantePagoColaboradorComponent } from './comprobante-pago-colaborador.component';

@Component({
  selector: 'app-comprobante-pago-colaborador-view',
  template: `
    <div class="container mt-4">
      <app-comprobante-pago-colaborador 
        *ngIf="datosCompletos"
        [pago]="datos.pago"
        [colaborador]="datos.colaborador"
        [tipoPago]="datos.tipoPago">
      </app-comprobante-pago-colaborador>
      
      <div *ngIf="!datosCompletos" class="alert alert-warning">
        No se han recibido los datos necesarios para mostrar el comprobante.
        <a class="btn btn-primary mt-3" [routerLink]="['/colaboradores-pagos-recibidos/0']">
          Volver al listado
        </a>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, ComprobantePagoColaboradorComponent, RouterModule]
})
export class ComprobantePagoColaboradorViewComponent implements OnInit {
  datos: any = {};
  datosCompletos = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pagosRecibidosService: PagosRecibidosService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idPago = params['id'];
      if (idPago) {
        this.pagosRecibidosService.obtenerDatosComprobanteColaborador(idPago).subscribe(
          (response: any) => {
            if (response && response.body) {
              const datos = response.body;
              this.datos = {
                pago: datos.pago,
                colaborador: datos.colaborador,
                tipoPago: datos.tipoPago
              };
              this.datosCompletos = true;
            } else {
              this.datosCompletos = false;
              console.error('No se pudieron obtener los datos del comprobante');
            }
          },
          error => {
            console.error('Error al obtener datos del comprobante:', error);
            this.datosCompletos = false;
          }
        );
      }
    });
  }
}