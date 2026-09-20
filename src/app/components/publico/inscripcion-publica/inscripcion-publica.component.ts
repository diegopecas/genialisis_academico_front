// ========== inscripcion-publica.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InscripcionPublicaService } from '../../../services/inscripcion-publica.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
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
    private institucionConfigService: InstitucionConfigService
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
    this.cargarConfiguracion();
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
   */
  aplicarTema() {
    const raiz = document.documentElement;
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
