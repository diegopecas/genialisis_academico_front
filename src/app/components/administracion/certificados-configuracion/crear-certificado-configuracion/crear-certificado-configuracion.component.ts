import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CertificadosConfiguracionService } from '../../../../services/certificados-configuracion.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import Swal from 'sweetalert2';

/**
 * Edición de la configuración de un certificado.
 *
 * Se navega por clave y no por id: la fila puede no existir todavía en el
 * tenant y el backend la crea al guardar.
 */
@Component({
  selector: 'app-crear-certificado-configuracion',
  templateUrl: './crear-certificado-configuracion.component.html',
  styleUrl: './crear-certificado-configuracion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearCertificadoConfiguracionComponent implements OnInit {

  titulo = 'Configuración de Certificado';
  regresar = '/administracion/operaciones/certificados-configuracion';
  submitted = false;
  guardando = false;

  model = {
    clave_certificado: '',
    nombre: '',
    modo: 'manual',
    regla: 'libre',
    mensaje_no_cumple: '',
    activo: 1,
    regla_fija: 0,
    productos: [] as string[]
  } as any;

  public productos = [] as any[];

  constructor(
    private configuracionService: CertificadosConfiguracionService,
    private productosService: ProductosServiciosService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarProductos();

    this.route.params.subscribe(params => {
      const clave = params['id'];
      if (clave) {
        this.cargarConfiguracion(clave);
      }
    });
  }

  cargarProductos(): void {
    this.productosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.productos = (response.body as any[]) || [];
      },
      error: (error: any) => console.error('Error al cargar los productos', error)
    });
  }

  cargarConfiguracion(clave: string): void {
    this.configuracionService.obtenerByClave(clave).subscribe({
      next: (response: any) => {
        const configuracion = response.body;
        this.model.clave_certificado = configuracion.clave_certificado;
        this.model.nombre = configuracion.nombre;
        this.model.modo = configuracion.modo;
        this.model.regla = configuracion.regla;
        this.model.mensaje_no_cumple = configuracion.mensaje_no_cumple || '';
        this.model.activo = Number(configuracion.activo);
        this.model.regla_fija = Number(configuracion.regla_fija);
        this.model.productos = (configuracion.productos || []).map((p: any) => p.id_producto_servicio);
        this.titulo = configuracion.nombre;
      },
      error: (error: any) => {
        console.error('Error al cargar la configuración', error);
        Swal.fire('Error', 'No se pudo cargar la configuración.', 'error');
      }
    });
  }

  get esAutomatico(): boolean {
    return this.model.modo === 'automatico';
  }

  get pideProductos(): boolean {
    return this.model.regla === 'al_dia_productos' && Number(this.model.regla_fija) !== 1;
  }

  estaProductoSeleccionado(idProducto: string): boolean {
    return this.model.productos.indexOf(idProducto) >= 0;
  }

  alternarProducto(idProducto: string): void {
    const indice = this.model.productos.indexOf(idProducto);
    if (indice >= 0) {
      this.model.productos.splice(indice, 1);
      return;
    }
    this.model.productos.push(idProducto);
  }

  volver(): void {
    this.router.navigate([this.regresar]);
  }

  guardar(): void {
    this.submitted = true;

    if (this.pideProductos && this.model.productos.length === 0) {
      Swal.fire('Falta información', 'Selecciona al menos un producto para esta regla.', 'warning');
      return;
    }

    this.guardando = true;

    this.configuracionService.actualizar({
      clave_certificado: this.model.clave_certificado,
      modo: this.model.modo,
      regla: this.model.regla,
      mensaje_no_cumple: this.model.mensaje_no_cumple,
      activo: this.model.activo,
      productos: this.model.productos
    }).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('Guardado', 'La configuración quedó actualizada.', 'success');
        this.router.navigate([this.regresar]);
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al guardar la configuración', error);
        Swal.fire('Error', error?.error?.message || 'No se pudo guardar la configuración.', 'error');
      }
    });
  }
}
