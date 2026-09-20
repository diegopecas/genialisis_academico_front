// ========== configuracion-portal-publico.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { ConfiguracionPortalPublicoService } from '../../../services/configuracion-portal-publico.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-portal-publico',
  templateUrl: './configuracion-portal-publico.component.html',
  styleUrl: './configuracion-portal-publico.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ConfiguracionPortalPublicoComponent implements OnInit {

  public titulo = 'Configuración del Portal Público';
  public regresar = '/administracion/datos-maestros';
  public guardando: boolean = false;
  public cargando: boolean = true;

  // Fuentes de Google que se ofrecen. Si necesitas otra, se agrega aquí y
  // funciona sin tocar nada más: el portal arma el enlace con el nombre.
  public fuentesDisponibles: string[] = [
    'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Lato', 'Open Sans',
    'Nunito', 'Quicksand', 'Raleway', 'Playfair Display', 'Merriweather'
  ];

  public model: any = {
    nombre_mostrar: '',
    logo: null,
    favicon: null,
    url_sitio_web: '',
    color_primario: '#d4af37',
    color_secundario: '#222222',
    color_fondo: '#f5f5f7',
    color_texto: '#222222',
    color_boton: '#d4af37',
    color_texto_boton: '#ffffff',
    fuente_titulos: '',
    fuente_texto: '',
    titulo_portada: '',
    mensaje_bienvenida: '',
    imagen_portada: null,
    texto_pie: '',
    telefono: '',
    correo: '',
    whatsapp: '',
    terminos_condiciones: '',
    politica_datos: '',
    activo: false
  };

  constructor(
    private configuracionPortalPublicoService: ConfiguracionPortalPublicoService,
    private institucionConfigService: InstitucionConfigService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar() {
    this.configuracionPortalPublicoService.obtener().subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cargando = false;

        if (body.length === 0) {
          Swal.fire('Sin configuración', 'No existe la configuración del portal para este jardín. Ejecute el script de instalación.', 'warning');
          return;
        }

        const fila = body[0];
        this.model = {
          ...fila,
          activo: Number(fila.activo) === 1
        };
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar la configuración del portal', error);
        Swal.fire('Error', 'No se pudo cargar la configuración del portal.', 'error');
      }
    });
  }

  /**
   * Las imágenes se guardan en base64 dentro de la propia configuración: son
   * pocas y el portal las necesita en la primera carga, sin sesión.
   * El tope de 500 KB evita que el logo infle la respuesta pública.
   */
  onImagenSeleccionada(event: any, campo: string) {
    const archivo = event.target.files && event.target.files[0];
    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      Swal.fire('Archivo no válido', 'Debe seleccionar una imagen.', 'warning');
      return;
    }

    const topeKb = campo === 'imagen_portada' ? 800 : 500;
    if (archivo.size > topeKb * 1024) {
      Swal.fire('Imagen muy pesada', `La imagen no debe superar ${topeKb} KB.`, 'warning');
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.model[campo] = lector.result;
    };
    lector.readAsDataURL(archivo);
  }

  quitarImagen(campo: string) {
    this.model[campo] = null;
  }

  // La URL del portal se arma con el código del jardín, que es el mismo del
  // login. Sin él la página no sabría a qué jardín pedirle los datos.
  getUrlPortal(): string {
    const codigo = this.institucionConfigService.getJardinCodigo();
    return `${window.location.origin}/#/inscripcion/${codigo}`;
  }

  copiarUrl() {
    const url = this.getUrlPortal();
    navigator.clipboard.writeText(url).then(() => {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: 'Enlace copiado', showConfirmButton: false, timer: 2000
      });
    }).catch(() => {
      Swal.fire('Enlace del portal', url, 'info');
    });
  }

  abrirPortal() {
    window.open(this.getUrlPortal(), '_blank');
  }

  guardar() {
    this.guardando = true;

    const datos = {
      ...this.model,
      activo: this.model.activo ? 1 : 0
    };

    this.configuracionPortalPublicoService.actualizar(datos).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Configuración guardada', showConfirmButton: false, timer: 2000
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al guardar la configuración', error);
        const mensaje = error?.error?.error || 'No se pudo guardar la configuración.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
