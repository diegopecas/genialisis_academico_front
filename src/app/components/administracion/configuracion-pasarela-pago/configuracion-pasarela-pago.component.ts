// ========== configuracion-pasarela-pago.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { ConfiguracionPasarelaPagoService } from '../../../services/configuracion-pasarela-pago.service';
import { TiposPagosService } from '../../../services/tipos-pagos.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-pasarela-pago',
  templateUrl: './configuracion-pasarela-pago.component.html',
  styleUrl: './configuracion-pasarela-pago.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ConfiguracionPasarelaPagoComponent implements OnInit {

  public titulo = 'Pasarela de Pagos';
  public regresar = '/administracion/datos-maestros';
  public guardando: boolean = false;
  public cargando: boolean = true;

  public tiposPago: any[] = [];

  // Lo que hay guardado (sin llaves: solo si existen y sus últimos 4)
  public guardado: any = null;

  public model: any = {
    proveedor: 'ninguno',
    url_api: '',
    modo_pruebas: true,
    id_tipo_pago: null,
    link_vigencia_dias: null,
    url_retorno: '',
    // Las llaves solo se mandan cuando se escriben de nuevo
    llave_publica: '',
    llave_secreta: ''
  };

  constructor(
    private configuracionPasarelaPagoService: ConfiguracionPasarelaPagoService,
    private tiposPagosService: TiposPagosService,
    private institucionConfigService: InstitucionConfigService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarTiposPago();
    this.cargar();
  }

  cargar() {
    this.configuracionPasarelaPagoService.obtener().subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cargando = false;
        if (body.length > 0) {
          this.aplicar(body[0]);
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar la pasarela de pagos', error);
        Swal.fire('Error', 'No se pudo cargar la configuración de la pasarela de pagos.', 'error');
      }
    });
  }

  cargarTiposPago() {
    this.tiposPagosService.obtenerTodos().subscribe({
      next: (response: any) => this.tiposPago = (response.body || []) as any[],
      error: (error: any) => console.error('Error al cargar los tipos de pago', error)
    });
  }

  private aplicar(fila: any) {
    this.guardado = fila;
    this.model = {
      proveedor: fila.proveedor || 'ninguno',
      url_api: fila.url_api || '',
      modo_pruebas: Number(fila.modo_pruebas) === 1,
      id_tipo_pago: fila.id_tipo_pago || null,
      link_vigencia_dias: fila.link_vigencia_dias,
      url_retorno: fila.url_retorno || '',
      llave_publica: '',
      llave_secreta: ''
    };
  }

  // URL que se pone en el panel de Bold para los avisos de pago
  getUrlAvisos(): string {
    const base = environment.api.startsWith('http') ? environment.api : window.location.origin + '/' + environment.api.replace(/^\//, '');
    return `${base.replace(/\/?$/, '/')}pagos-bold/webhook?tenant=${this.institucionConfigService.getJardinCodigo()}`;
  }

  copiarUrlAvisos() {
    const url = this.getUrlAvisos();
    navigator.clipboard?.writeText(url).then(
      () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'URL copiada', showConfirmButton: false, timer: 2000 }),
      () => Swal.fire('URL de avisos', url, 'info')
    );
  }

  guardar() {
    this.guardando = true;
    const datos = {
      ...this.model,
      modo_pruebas: this.model.modo_pruebas ? 1 : 0,
      link_vigencia_dias: this.model.link_vigencia_dias ? Number(this.model.link_vigencia_dias) : null
    };

    this.configuracionPasarelaPagoService.actualizar(datos).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        if (Array.isArray(respuesta) && respuesta.length > 0) {
          this.aplicar(respuesta[0]);
        }
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Configuración guardada', showConfirmButton: false, timer: 2000
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al guardar la pasarela de pagos', error);
        Swal.fire('Error', error?.error?.error || 'No se pudo guardar la configuración.', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
