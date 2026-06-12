// Modifica tu comprobante-pago-view.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ComprobantePagoComponent } from '../comprobante-pago/comprobante-pago.component';
import { PagosRecibidosService } from '../../../../services/pagos-recibidos.service';


@Component({
  selector: 'app-comprobante-pago-view',
  template: `
    <div class="container mt-4">
      <app-comprobante-pago 
        *ngIf="datosCompletos"
        [pago]="datos.pago"
        [estudiante]="datos.estudiante"
        [acudiente]="datos.acudiente"
        [tipoPago]="datos.tipoPago"
        [origenNavegacion]="origen">
      </app-comprobante-pago>
      
      <div *ngIf="!datosCompletos" class="alert alert-warning">
        No se han recibido los datos necesarios para mostrar el comprobante.
        <a class="btn btn-primary mt-3" [routerLink]="['/estudiantes-pagos/0']">
          Volver al listado
        </a>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, ComprobantePagoComponent, RouterModule]
})
export class ComprobantePagoViewComponent implements OnInit {
  datos: any = {};
  datosCompletos = false;
  origen: string = 'estudiante'; // Por defecto regresa al estudiante

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pagosRecibidosService: PagosRecibidosService,
  ) {}

  ngOnInit(): void {
    // Capturar query param 'origen'
    this.route.queryParams.subscribe(queryParams => {
      this.origen = queryParams['origen'] || 'estudiante';
    });

    this.route.params.subscribe(params => {
      const idPago = params['id'];
      if (idPago) {
        // Cargar los datos del comprobante directamente desde el servicio
        this.pagosRecibidosService.obtenerDatosComprobante(idPago).subscribe(
          (response: any) => {
            if (response && response.body) {
              const datos = response.body;
              this.datos = {
                pago: datos.pago,
                estudiante: datos.estudiante,
                acudiente: datos.acudiente,
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