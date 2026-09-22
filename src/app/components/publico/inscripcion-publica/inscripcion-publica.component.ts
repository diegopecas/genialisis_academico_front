// ========== inscripcion-publica.component.ts ==========
import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InscripcionPublicaService } from '../../../services/inscripcion-publica.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { PersonasService } from '../../../services/personas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inscripcion-publica',
  templateUrl: './inscripcion-publica.component.html',
  styleUrl: './inscripcion-publica.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class InscripcionPublicaComponent implements OnInit {

  // Pasos: institucion -> cursos -> formulario -> listo
  public paso: string = 'institucion';

  public cargando: boolean = true;
  public portalDisponible: boolean = true;
  public mensajeNoDisponible: string = 'El portal de inscripciones no está disponible en este momento.';
  public enviando: boolean = false;
  public submitted: boolean = false;

  public config: any = null;

  // Logo y fondo del tenant, con el mismo patron del menu:
  // /assets/images/instituciones/{codigo}/logo.png y fondo.png
  // Si la configuracion del portal trae su propia imagen, esa manda: sirve
  // para publicar un logo distinto del que usa el sistema por dentro.
  public logoUrl: string = '';
  public fondoUrl: string = '';
  public instituciones: any[] = [];
  public cursos: any[] = [];
  public horarios: any[] = [];

  public institucionSeleccionada: any = null;
  public cursoSeleccionado: any = null;

  // Aceptacion de terminos y politica de datos. Sin ella el backend
  // rechaza la solicitud: es la autorizacion para tratar los datos.
  public aceptoTerminos: boolean = false;
  public modalAbierto: string | null = null;

  public listas = {
    tiposIdentificacion: [] as any[],
    generos: [] as any[],
    tiposAcudiente: [] as any[]
  };

  public model: any = {
    est_tipo_identificacion: '',
    est_numero_identificacion: '',
    est_primer_nombre: '',
    est_segundo_nombre: '',
    est_primer_apellido: '',
    est_segundo_apellido: '',
    est_fecha_nacimiento: '',
    est_id_genero: '',
    acu_tipo_identificacion: '',
    acu_numero_identificacion: '',
    acu_primer_nombre: '',
    acu_primer_apellido: '',
    acu_telefono: '',
    acu_correo: '',
    acu_id_tipo_acudiente: '',
    observaciones: ''
  };

  constructor(
    private route: ActivatedRoute,
    private inscripcionPublicaService: InscripcionPublicaService,
    private institucionConfigService: InstitucionConfigService,
    private personasService: PersonasService,
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {
    // Sin sesión no hay tenant, y el interceptor bloquea la petición. Por eso
    // el código del jardín viaja en la URL: /inscripcion/:tenant
    const tenant = this.route.snapshot.paramMap.get('tenant');

    if (!tenant) {
      this.cargando = false;
      this.portalDisponible = false;
      this.mensajeNoDisponible = 'El enlace no es válido: falta el identificador del jardín.';
      return;
    }

    this.institucionConfigService.setTenantManual(tenant, '');
    this.cargarImagenesTenant();
    this.cargarConfiguracion();
  }

  /**
   * Toma el logo y el fondo de los assets del tenant. Si el archivo no
   * existe se deja vacío y la página muestra el nombre en lugar del logo,
   * igual que hace el menú con su fallback.
   */
  cargarImagenesTenant() {
    const logo = this.institucionConfigService.getLogoUrl();
    const fondo = this.institucionConfigService.getFondoUrl();

    if (logo) {
      const img = new Image();
      img.onload = () => { this.logoUrl = logo; };
      img.onerror = () => { this.logoUrl = ''; };
      img.src = logo;
    }

    if (fondo) {
      const img = new Image();
      img.onload = () => { this.fondoUrl = fondo; };
      img.onerror = () => { this.fondoUrl = ''; };
      img.src = fondo;
    }
  }

  // Lo que se pinta: la imagen de la configuración si la cargaron, y si no
  // el asset del tenant.
  getLogo(): string {
    if (this.config && this.config.logo) {
      return this.config.logo;
    }
    return this.logoUrl;
  }

  /**
   * El logo del cliente institucional es la foto de su persona jurídica, y
   * el backend devuelve la ruta relativa del archivo, no la imagen. La URL
   * pública se arma igual que en el componente común de foto.
   */
  getLogoInstitucion(institucion: any): string {
    if (!institucion || !institucion.logo) {
      return '';
    }
    return this.personasService.obtenerUrlFoto(institucion.logo);
  }

  getFondo(): string {
    if (this.config && this.config.imagen_portada) {
      return this.config.imagen_portada;
    }
    return this.fondoUrl;
  }

  cargarConfiguracion() {
    this.inscripcionPublicaService.obtenerConfiguracion().subscribe({
      next: (response: any) => {
        this.config = response.body || {};

        if (Number(this.config.activo) !== 1) {
          this.cargando = false;
          this.portalDisponible = false;
          return;
        }

        this.aplicarTema();
        this.cargarCatalogos();
        this.cargarInstituciones();
      },
      error: (error: any) => {
        console.error('Error al cargar la configuración del portal', error);
        this.cargando = false;
        this.portalDisponible = false;
      }
    });
  }

  /**
   * Los colores y las fuentes se inyectan como variables CSS sobre el host,
   * así todo el portal se repinta cambiando la configuración, sin tocar código.
   *
   * Van sobre el elemento del componente y NO sobre document.documentElement:
   * el SCSS declara los valores por defecto en :host, que gana en
   * especificidad contra :root, así que escribirlas en la raíz no tenía
   * ningún efecto y el portal se quedaba con los colores de fábrica.
   */
  aplicarTema() {
    const raiz = this.elementRef.nativeElement as HTMLElement;
    raiz.style.setProperty('--portal-primario', this.config.color_primario || '#d4af37');
    raiz.style.setProperty('--portal-secundario', this.config.color_secundario || '#222222');
    raiz.style.setProperty('--portal-fondo', this.config.color_fondo || '#f5f5f7');
    raiz.style.setProperty('--portal-texto', this.config.color_texto || '#222222');
    raiz.style.setProperty('--portal-boton', this.config.color_boton || '#d4af37');
    raiz.style.setProperty('--portal-texto-boton', this.config.color_texto_boton || '#ffffff');

    const fuentes: string[] = [];
    if (this.config.fuente_titulos) fuentes.push(this.config.fuente_titulos);
    if (this.config.fuente_texto && this.config.fuente_texto !== this.config.fuente_titulos) {
      fuentes.push(this.config.fuente_texto);
    }

    if (fuentes.length > 0) {
      const familias = fuentes.map(f => 'family=' + f.trim().replace(/ /g, '+') + ':wght@400;600;700').join('&');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${familias}&display=swap`;
      document.head.appendChild(link);
    }

    raiz.style.setProperty('--portal-fuente-titulos', this.config.fuente_titulos ? `'${this.config.fuente_titulos}', sans-serif` : 'inherit');
    raiz.style.setProperty('--portal-fuente-texto', this.config.fuente_texto ? `'${this.config.fuente_texto}', sans-serif` : 'inherit');

    // El fondo sí va al body: el portal ocupa toda la pantalla y sin esto
    // queda una franja blanca al desbordar el scroll.
    document.body.style.background = this.config.color_fondo || '#f5f5f7';

    if (this.config.nombre_mostrar) {
      document.title = this.config.nombre_mostrar;
    }

    if (this.config.favicon) {
      let icono: any = document.querySelector("link[rel='icon']");
      if (!icono) {
        icono = document.createElement('link');
        icono.rel = 'icon';
        document.head.appendChild(icono);
      }
      icono.href = this.config.favicon;
    }
  }

  cargarCatalogos() {
    this.inscripcionPublicaService.obtenerCatalogos().subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.listas.tiposIdentificacion = body.tipos_identificacion || [];
        this.listas.generos = body.generos || [];
        this.listas.tiposAcudiente = body.tipos_acudiente || [];
      },
      error: (error: any) => {
        console.error('Error al cargar los catálogos', error);
      }
    });
  }

  cargarInstituciones() {
    this.inscripcionPublicaService.obtenerInstituciones().subscribe({
      next: (response: any) => {
        this.instituciones = response.body || [];
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar las instituciones', error);
        this.instituciones = [];
        this.cargando = false;
      }
    });
  }

  // null = particular: muestra los cursos que no tienen convenio con ningún colegio
  seleccionarInstitucion(institucion: any) {
    this.institucionSeleccionada = institucion;
    this.cursoSeleccionado = null;
    this.cursos = [];
    this.cargando = true;

    this.inscripcionPublicaService.obtenerCursos(institucion ? institucion.id : null).subscribe({
      next: (response: any) => {
        this.cursos = response || [];
        this.cargando = false;
        this.paso = 'cursos';
        window.scrollTo(0, 0);
      },
      error: (error: any) => {
        console.error('Error al cargar los cursos', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los cursos. Intenta de nuevo.', 'error');
      }
    });
  }

  seleccionarCurso(curso: any) {
    if (curso.cerrado) {
      return;
    }

    this.cursoSeleccionado = curso;
    this.horarios = [];

    this.inscripcionPublicaService.obtenerHorarios(curso.id).subscribe({
      next: (response: any) => {
        this.horarios = response.body || [];
      },
      error: () => {
        this.horarios = [];
      }
    });

    this.paso = 'formulario';
    window.scrollTo(0, 0);
  }

  volverAInstituciones() {
    this.paso = 'institucion';
    this.cursoSeleccionado = null;
    window.scrollTo(0, 0);
  }

  volverACursos() {
    this.paso = 'cursos';
    this.submitted = false;
    window.scrollTo(0, 0);
  }

  abrirModal(cual: string) {
    this.modalAbierto = cual;
  }

  cerrarModal() {
    this.modalAbierto = null;
  }

  // Desde el modal se puede aceptar de una, para no obligar a cerrarlo y
  // volver a buscar el check.
  aceptarDesdeModal() {
    this.aceptoTerminos = true;
    this.modalAbierto = null;
  }

  formularioValido(): boolean {
    return Boolean(
      this.model.est_tipo_identificacion &&
      this.model.est_numero_identificacion &&
      this.model.est_primer_nombre &&
      this.model.est_primer_apellido &&
      this.model.acu_primer_nombre &&
      this.model.acu_primer_apellido &&
      this.model.acu_telefono &&
      this.aceptoTerminos
    );
  }

  enviar() {
    this.submitted = true;

    if (!this.aceptoTerminos) {
      Swal.fire('Falta la autorización',
        'Debes aceptar los términos y la política de tratamiento de datos para continuar.', 'warning');
      return;
    }

    if (!this.formularioValido()) {
      Swal.fire('Faltan datos', 'Por favor completa los campos marcados con asterisco.', 'warning');
      return;
    }

    this.enviando = true;

    const datos = {
      ...this.model,
      id_curso_extra: this.cursoSeleccionado.id,
      id_institucion_cliente: this.institucionSeleccionada ? this.institucionSeleccionada.id : null,
      acepto_terminos: 1
    };

    this.inscripcionPublicaService.registrar(datos).subscribe({
      next: () => {
        this.enviando = false;
        this.paso = 'listo';
        window.scrollTo(0, 0);
      },
      error: (error: any) => {
        this.enviando = false;
        console.error('Error al registrar la solicitud', error);
        const mensaje = error?.error?.error || 'No se pudo registrar la solicitud. Intenta de nuevo.';
        Swal.fire('No se pudo enviar', mensaje, 'error');
      }
    });
  }

  // Deja el portal listo para otra inscripción sin recargar la página
  nuevaInscripcion() {
    this.model = {
      est_tipo_identificacion: '',
      est_numero_identificacion: '',
      est_primer_nombre: '',
      est_segundo_nombre: '',
      est_primer_apellido: '',
      est_segundo_apellido: '',
      est_fecha_nacimiento: '',
      est_id_genero: '',
      acu_tipo_identificacion: '',
      acu_numero_identificacion: '',
      acu_primer_nombre: '',
      acu_primer_apellido: '',
      acu_telefono: '',
      acu_correo: '',
      acu_id_tipo_acudiente: '',
      observaciones: ''
    };
    this.submitted = false;
    this.aceptoTerminos = false;
    this.cursoSeleccionado = null;
    this.institucionSeleccionada = null;
    this.paso = 'institucion';
    window.scrollTo(0, 0);
  }

  tituloModal(): string {
    if (this.modalAbierto === 'terminos') return 'Términos y condiciones';
    if (this.modalAbierto === 'politica') return 'Política de tratamiento de datos';
    return '';
  }

  textoModal(): string {
    if (!this.config) return '';
    if (this.modalAbierto === 'terminos') return this.config.terminos_condiciones || '';
    if (this.modalAbierto === 'politica') return this.config.politica_datos || '';
    return '';
  }

  formatearMoneda(valor: any): string {
    const numero = Number(valor) || 0;
    return '$ ' + numero.toLocaleString('es-CO');
  }

  // Texto del cupo para la tarjeta del curso
  textoCupo(curso: any): string {
    if (curso.cupo_maximo === null || curso.cupo_maximo === undefined) {
      return 'Cupo abierto';
    }
    if (curso.cupos_disponibles > 0) {
      return curso.cupos_disponibles === 1 ? 'Queda 1 cupo' : `Quedan ${curso.cupos_disponibles} cupos`;
    }
    return curso.permite_sobrecupo ? 'Cupo lleno, admite lista de espera' : 'Sin cupos';
  }

  // Resumen de los valores para mostrar en la tarjeta y en el formulario
  tieneValores(curso: any): boolean {
    if (!curso) return false;
    return (curso.valor_matricula > 0 || curso.valor_pension > 0 || curso.valor_unico > 0);
  }
}
