import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import Swal from 'sweetalert2';
import { VisitantesService } from '../../../../../../services/visitantes.service';

@Component({
  selector: 'app-tab1-registro',
  templateUrl: './tab1-registro.component.html',
  styleUrl: './tab1-registro.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  animations: [
    trigger('slideDown', [
      state('collapsed', style({
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: '1',
        overflow: 'visible'
      })),
      transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class Tab1RegistroComponent implements OnInit, OnChanges {

  @Input() visitaData: any = {};
  @Input() soloLectura: boolean = false;
  @Input() catalogos: any = null;
  @Output() datosActualizados = new EventEmitter<any>();

  cardsExpandidas: boolean[] = [true, true, false, false, false, false, false];
  todasExpandidas: boolean = false;

  tiposContacto: any[] = [];
  tiposComoConocio: any[] = [];
  tiposParentesco: any[] = [];
  tiposRazonesBusqueda: any[] = [];
  categoriasDisc: any[] = [];
  tiposNivelInteres: any[] = [];
  tiposUrgencia: any[] = [];
  tiposPreferenciasSeguimiento: any[] = [];
  tiposCuandoSeguimiento: any[] = [];
  tiposQuienDecide: any[] = [];
  tiposCompromisos: any[] = [];
  tiposIdentificacion: any[] = [];
  generos: any[] = [];
  ciudades: any[] = [];

  formVisita!: FormGroup;
  formContactoPrincipal!: FormGroup;

  visitantes: any[] = [];
  ninos: any[] = [];
  razonesBusquedaSeleccionadas: string[] = [];
  preferencias_seguimiento: number[] = [];


  observacionesDiscPorVisitante: any = {};
  perfilCalculado: string = '';
  puntajesDisc: any = { D: 0, I: 0, S: 0, C: 0 };
  nivelInteresSeleccionado: number | null = null;
  private cargandoDatos: boolean = false;
  // ✅ DIRTY TRACKING
  private seccionesModificadas = new Set<string>();
  private debounceTimer: any;

  // ✅ Nueva estructura: array de objetos con datos individuales
  compromisos: any[] = [];


  parentescosSeleccionados: number[] = [];
  otroParentesco: string = '';
  observacionesDiscExpandido: number | null = null;
  puntajesDiscPorVisitante: any = {};
  otroParentescoPorVisitante: { [key: string]: string } = {};
  grupos: any[] = [];
  tiposNecesidadesEspeciales: any[] = [];
  constructor(
    private fb: FormBuilder,
    private visitantesService: VisitantesService
  ) { }

  ngOnInit(): void {
    this.inicializarFormularios();
    if (this.catalogos) {
      this.asignarCatalogos();
    }
  }
  aplicarModoLectura(): void {
    // ✅ Verificar que los formularios existan antes de usarlos
    if (!this.formVisita || !this.formContactoPrincipal) {
      return;
    }

    if (this.soloLectura) {
      this.formVisita.disable();
      this.formContactoPrincipal.disable();
    } else {
      this.formVisita.enable();
      this.formContactoPrincipal.enable();
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['catalogos'] && this.catalogos) {
      this.asignarCatalogos();
    }

    if (changes['visitaData'] && !changes['visitaData'].firstChange) {
      this.cargarDatosExistentes();
    }

    // ✅ Aplicar modo lectura cuando cambie soloLectura
    if (changes['soloLectura']) {
      this.aplicarModoLectura();
    }
  }

  asignarCatalogos(): void {
    this.tiposContacto = this.catalogos.tipos_contacto || [];
    this.tiposComoConocio = this.catalogos.tipos_como_conocio || [];
    this.tiposParentesco = this.catalogos.tipos_parentesco || [];
    this.tiposRazonesBusqueda = this.catalogos.tipos_razones_busqueda || [];
    this.tiposIdentificacion = this.catalogos.tipos_identificacion || [];
    this.generos = this.catalogos.generos || [];
    this.ciudades = this.catalogos.ciudades || [];
    this.grupos = this.catalogos.grupos || [];
    this.tiposNecesidadesEspeciales = this.catalogos.tipos_necesidades_especiales || [];
    this.procesarCategoriasDisc();

    this.tiposNivelInteres = this.catalogos.tipos_nivel_interes || [];
    this.tiposUrgencia = this.catalogos.tipos_urgencia || [];
    this.tiposPreferenciasSeguimiento = this.catalogos.tipos_preferencias_seguimiento || [];
    this.tiposCuandoSeguimiento = this.catalogos.tipos_cuando_seguimiento || [];
    this.tiposQuienDecide = this.catalogos.tipos_quien_decide || [];
    this.tiposCompromisos = this.catalogos.tipos_compromisos || [];
  }

  procesarCategoriasDisc(): void {
    const parametrosDisc = this.catalogos.parametros_disc || [];
    const categoriasMeta = this.catalogos.categorias_disc || [];

    if (parametrosDisc.length === 0 || categoriasMeta.length === 0) {
      return;
    }

    this.categoriasDisc = categoriasMeta.map((catMeta: any) => ({
      id: catMeta.id,
      codigo: catMeta.codigo,
      nombre: catMeta.icono ? `${catMeta.icono} ${catMeta.nombre}` : catMeta.nombre,
      parametros: parametrosDisc.filter((p: any) => p.id_categoria === catMeta.id)
    }));
  }

  inicializarFormularios(): void {
    this.formVisita = this.fb.group({
      fecha: [this.obtenerFechaActual(), Validators.required],
      hora: [this.obtenerHoraActual(), Validators.required],
      agendada: [false],
      id_tipo_contacto: [1, Validators.required],
      id_como_conocio: [null],
      detalle_como_conocio: [''],
      comentarios_razones: [''],
      observaciones: [''],
      id_nivel_interes: [null],
      id_urgencia: [null],
      pidio_descuento: [false],
      visito_instalaciones_completas: [false],
      pregunto_por_matricula: [false],
      id_cuando_seguimiento: [null],
      fecha_seguimiento_calculada: [null],
      mejor_horario_contacto: [''],
      horario_manana: [false],
      horario_tarde: [false],
      horario_noche: [false],
      horario_cualquiera: [false],
      id_quien_decide: [null],
      necesita_consultar: [false],
      con_quien_consultar: ['']
    });

    this.formContactoPrincipal = this.fb.group({
      primer_nombre: ['', Validators.required],
      segundo_nombre: [''],
      primer_apellido: [''],
      segundo_apellido: [''],
      id_tipo_identificacion: [null],
      numero_identificacion: [''],
      id_genero: [null],
      id_ciudad: [null],
      telefono: [''],
      email: [''],
      asistio: [true]
    });

    // ✅ Detectar cambios generales en formVisita
    this.formVisita.valueChanges.subscribe(() => {
      if (!this.cargandoDatos) {
        this.marcarCambio('visita');
      }
    });

    // Detectar cambios en campos de temperatura
    ['id_nivel_interes', 'id_urgencia', 'pidio_descuento',
      'visito_instalaciones_completas', 'pregunto_por_matricula'].forEach(campo => {
        this.formVisita.get(campo)?.valueChanges.subscribe(() => {
          if (!this.cargandoDatos) {
            this.marcarCambio('temperatura');
          }
        });
      });

    // Detectar cambios en campos de seguimiento
    ['id_cuando_seguimiento', 'fecha_seguimiento_calculada', 'mejor_horario_contacto',
      'horario_manana', 'horario_tarde', 'horario_noche', 'horario_cualquiera',
      'id_quien_decide', 'necesita_consultar', 'con_quien_consultar'].forEach(campo => {
        this.formVisita.get(campo)?.valueChanges.subscribe(() => {
          if (!this.cargandoDatos) {
            this.marcarCambio('seguimiento');
          }
        });
      });
    // ✅ Aplicar modo lectura después de crear los formularios
    this.aplicarModoLectura();
  }

  cargarDatosExistentes(): void {
    this.cargandoDatos = true;
    console.log("cargarDatosExistentes", this.visitaData)
    if (this.visitaData) {
      this.formVisita.patchValue({
        fecha: this.visitaData.fecha,
        hora: this.visitaData.hora,
        id_tipo_contacto: this.visitaData.id_tipo_contacto,
        agendada: this.visitaData.agendada === 1 || this.visitaData.agendada === true,
        id_como_conocio: this.visitaData.id_como_conocio,
        detalle_como_conocio: this.visitaData.detalle_como_conocio,
        comentarios_razones: this.visitaData.comentarios_razones,
        observaciones: this.visitaData.observaciones
      });
    }

    if (this.visitaData.visitantes && Array.isArray(this.visitaData.visitantes)) {
      this.visitantes = [...this.visitaData.visitantes];
    }
    if (this.visitaData.ninos && Array.isArray(this.visitaData.ninos)) {
      this.ninos = this.visitaData.ninos.map((nino: any) => ({
        ...nino,
        necesidades: Array.isArray(nino.necesidades)
          ? nino.necesidades.map((n: any) => ({
            id_tipo_necesidad: n.id_tipo_necesidad,
            detalle: n.detalle || ''
          }))
          : []
      }));
    }
    console.log('🔍 Niños cargados:', this.ninos);
    if (this.visitaData.razones_busqueda && Array.isArray(this.visitaData.razones_busqueda)) {
      this.razonesBusquedaSeleccionadas = this.visitaData.razones_busqueda.map((r: any) => r.id_razon);
    }

    if (this.visitaData.temperatura) {
      const pidio_descuento = this.visitaData.temperatura.pidio_descuento === 1 ||
        this.visitaData.temperatura.pidio_descuento === true;
      const visito_instalaciones_completas = this.visitaData.temperatura.visito_instalaciones_completas === 1 ||
        this.visitaData.temperatura.visito_instalaciones_completas === true;
      const pregunto_por_matricula = this.visitaData.temperatura.pregunto_por_matricula === 1 ||
        this.visitaData.temperatura.pregunto_por_matricula === true;

      this.formVisita.patchValue({
        id_nivel_interes: this.visitaData.temperatura.id_nivel_interes,
        id_urgencia: this.visitaData.temperatura.id_urgencia,
        pidio_descuento: pidio_descuento,
        visito_instalaciones_completas: visito_instalaciones_completas,
        pregunto_por_matricula: pregunto_por_matricula
      });

      if (this.visitaData.temperatura.id_nivel_interes) {
        this.nivelInteresSeleccionado = this.visitaData.temperatura.id_nivel_interes;
      }
    }

    if (this.visitaData.preferencias_seguimiento && Array.isArray(this.visitaData.preferencias_seguimiento)) {
      this.preferencias_seguimiento = this.visitaData.preferencias_seguimiento.map((p: any) => {
        if (typeof p === 'object' && p !== null && 'id_preferencia_seguimiento' in p) {
          return p.id_preferencia_seguimiento;
        }
        return p;
      });
    }

    if (this.visitaData.seguimiento) {
      const necesita_consultar = this.visitaData.seguimiento.necesita_consultar === 1 ||
        this.visitaData.seguimiento.necesita_consultar === true;
      const horario_manana = this.visitaData.seguimiento.horario_manana === 1 ||
        this.visitaData.seguimiento.horario_manana === true;
      const horario_tarde = this.visitaData.seguimiento.horario_tarde === 1 ||
        this.visitaData.seguimiento.horario_tarde === true;
      const horario_noche = this.visitaData.seguimiento.horario_noche === 1 ||
        this.visitaData.seguimiento.horario_noche === true;
      const horario_cualquiera = this.visitaData.seguimiento.horario_cualquiera === 1 ||
        this.visitaData.seguimiento.horario_cualquiera === true;

      this.formVisita.patchValue({
        id_cuando_seguimiento: this.visitaData.seguimiento.id_cuando_seguimiento,
        fecha_seguimiento_calculada: this.visitaData.seguimiento.fecha_seguimiento_calculada,
        mejor_horario_contacto: this.visitaData.seguimiento.mejor_horario,
        horario_manana: horario_manana,
        horario_tarde: horario_tarde,
        horario_noche: horario_noche,
        horario_cualquiera: horario_cualquiera,
        id_quien_decide: this.visitaData.seguimiento.id_quien_decide,
        necesita_consultar: necesita_consultar,
        con_quien_consultar: this.visitaData.seguimiento.con_quien_consultar
      });
    }

    // ✅ Cargar compromisos con estructura individual
    if (this.visitaData.compromisos && Array.isArray(this.visitaData.compromisos)) {
      this.compromisos = this.visitaData.compromisos.map((c: any) => ({
        id_tipo_compromiso: c.id_tipo_compromiso,
        fecha_compromiso: c.fecha_compromiso || '',
        hora_compromiso: c.hora_compromiso || '',
        detalle_especifico: c.detalle_especifico || ''
      }));
    }

    this.visitantes.forEach((visitante, index) => {
      const observacionesIniciales: any = {};
      this.categoriasDisc.forEach(cat => {
        observacionesIniciales[cat.codigo] = [];
      });
      this.observacionesDiscPorVisitante[index] = observacionesIniciales;
      this.puntajesDiscPorVisitante[index] = { D: 0, I: 0, S: 0, C: 0 };
    });

    if (this.visitaData.observaciones_disc && Object.keys(this.visitaData.observaciones_disc).length > 0) {
      this.visitantes.forEach((visitante, index) => {
        if (visitante.id && this.visitaData.observaciones_disc[visitante.id]) {
          this.observacionesDiscPorVisitante[index] = this.visitaData.observaciones_disc[visitante.id];
          this.calcularPerfilDisc(index);
        }
      });
    }

    // ✅ Cargar perfiles calculados desde el backend
    if (this.visitaData.perfiles_calculados && Object.keys(this.visitaData.perfiles_calculados).length > 0) {
      this.visitantes.forEach((visitante, index) => {
        if (visitante.id && this.visitaData.perfiles_calculados[visitante.id]) {
          const perfilData = this.visitaData.perfiles_calculados[visitante.id];
          this.visitantes[index].perfil_disc_calculado = perfilData.perfil_sugerido;
          this.puntajesDiscPorVisitante[index] = {
            D: perfilData.puntaje_D,
            I: perfilData.puntaje_I,
            S: perfilData.puntaje_S,
            C: perfilData.puntaje_C
          };
        } else if (visitante.id) {
          this.visitantes[index].perfil_disc_calculado = null;
          this.puntajesDiscPorVisitante[index] = { D: 0, I: 0, S: 0, C: 0 };
        }
      });
    } else {
      this.visitantes.forEach((visitante, index) => {
        if (visitante.id) {
          this.visitantes[index].perfil_disc_calculado = null;
          this.puntajesDiscPorVisitante[index] = { D: 0, I: 0, S: 0, C: 0 };
        }
      });
    }

    // ✅ Limpiar cambios marcados durante la carga inicial
    setTimeout(() => {
      this.seccionesModificadas.clear();
      this.cargandoDatos = false;
      console.log('🧹 TAB 1 - Cambios de carga inicial limpiados');
    }, 100);
  }

  toggleCard(index: number): void {
    if (this.soloLectura) return;
    this.cardsExpandidas[index] = !this.cardsExpandidas[index];
    this.actualizarEstadoTodasExpandidas();
  }

  toggleTodasLasCards(): void {
    if (this.soloLectura) return;
    this.todasExpandidas = !this.todasExpandidas;
    this.cardsExpandidas = this.cardsExpandidas.map(() => this.todasExpandidas);
  }

  actualizarEstadoTodasExpandidas(): void {
    this.todasExpandidas = this.cardsExpandidas.every(expandida => expandida);
  }

  esCardCompleta(index: number): boolean {
    switch (index) {
      case 0:
        return !!(
          this.formVisita.get('fecha')?.value &&
          this.formVisita.get('hora')?.value &&
          this.formVisita.get('id_tipo_contacto')?.value &&
          this.formVisita.get('id_como_conocio')?.value
        );
      case 1:
        return this.visitantes.length > 0 && this.visitantes.some(v => v.es_contacto_principal);
      case 2:
        return this.ninos.length > 0 && this.ninos.every(n => n.nombre_nino && n.fecha_nacimiento);
      case 3:
        return !!(this.formVisita.get('id_nivel_interes')?.value);
      case 4:
        return this.preferencias_seguimiento.length > 0;
      case 5:
        return this.compromisos.length > 0;
      case 6:
        return !!(this.formVisita.get('observaciones')?.value);
      default:
        return false;
    }
  }

  tieneProgreso(index: number): boolean {
    switch (index) {
      case 0:
        return !!(this.formVisita.get('fecha')?.value || this.formVisita.get('hora')?.value);
      case 1:
        return this.visitantes.length > 0;
      case 2:
        return this.ninos.length > 0 || this.razonesBusquedaSeleccionadas.length > 0;
      case 3:
        return !!(this.formVisita.get('id_nivel_interes')?.value || this.formVisita.get('id_urgencia')?.value);
      case 4:
        return this.preferencias_seguimiento.length > 0 || !!(this.formVisita.get('id_quien_decide')?.value);
      case 5:
        return this.compromisos.length > 0;
      case 6:
        return !!(this.formVisita.get('observaciones')?.value);
      default:
        return false;
    }
  }

  calcularProgresoGeneral(): number {
    const totalCards = 7;
    const cardsCompletas = this.cardsExpandidas.filter((_, index) => this.esCardCompleta(index)).length;
    return Math.round((cardsCompletas / totalCards) * 100);
  }

  obtenerContactoPrincipal(): any | null {
    return this.visitantes.find(v => v.es_contacto_principal) || null;
  }

  contarPerfilesDiscCalculados(): number {
    return this.visitantes.filter(v => v.perfil_disc_calculado).length;
  }

  obtenerNombreNivelInteres(): string {
    const id = this.formVisita.get('id_nivel_interes')?.value;
    const nivel = this.tiposNivelInteres.find(n => n.id === id);
    return nivel?.nombre || '';
  }

  obtenerNombreUrgencia(): string {
    const id = this.formVisita.get('id_urgencia')?.value;
    const urgencia = this.tiposUrgencia.find(u => u.id === id);
    return urgencia?.nombre || '';
  }

  obtenerNombreQuienDecide(): string {
    const id = this.formVisita.get('id_quien_decide')?.value;
    const quien = this.tiposQuienDecide.find(q => q.id === id);
    return quien?.nombre || '';
  }

  agregarVisitante(): void {
    if (!this.formContactoPrincipal.get('primer_nombre')?.value) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor ingrese al menos el primer nombre del visitante',
        confirmButtonColor: '#FFD700'
      });
      return;
    }

    const nuevoVisitante = {
      ...this.formContactoPrincipal.value,
      id_parentesco: 1,
      parentesco_otro: '',
      es_contacto_principal: this.visitantes.length === 0,
      perfil_disc_calculado: null
    };

    // ✅ Verificar si ya hay visitantes con ID (significa que la visita ya existe)
    const visitaYaExiste = this.visitantes.length > 0 && this.visitantes[0].id;



    if (visitaYaExiste) {
      // ✅ Obtener el id_visita del primer visitante
      const id_visita = this.visitantes[0].id_visita;
      nuevoVisitante.id_visita = id_visita;



      this.visitantesService.crear(nuevoVisitante).subscribe({
        next: (response: any) => {

          // ✅ CORRECCIÓN: Leer el ID correctamente según la estructura de respuesta
          const idVisitante = response.body?.id || response.id;


          // Agregar el visitante con su ID al array
          nuevoVisitante.id = idVisitante;
          this.visitantes.push(nuevoVisitante);
          this.marcarCambio('visitantes');
          // Inicializar observaciones DISC para este visitante
          const observacionesIniciales: any = {};
          this.categoriasDisc.forEach(cat => {
            observacionesIniciales[cat.codigo] = [];
          });
          this.observacionesDiscPorVisitante[this.visitantes.length - 1] = observacionesIniciales;
          this.puntajesDiscPorVisitante[this.visitantes.length - 1] = { D: 0, I: 0, S: 0, C: 0 };

          this.formContactoPrincipal.reset({ asistio: true });
          this.emitirCambios();

          Swal.fire({
            icon: 'success',
            title: 'Visitante agregado',
            showConfirmButton: false,
            timer: 1500,
            toast: true,
            position: 'top-end'
          });
        },
        error: (error: any) => {
          console.error('❌ Error completo al guardar visitante:', error);
          console.error('  - Status:', error.status);
          console.error('  - StatusText:', error.statusText);
          console.error('  - Message:', error.message);
          console.error('  - Error body:', error.error);

          Swal.fire({
            icon: 'error',
            title: 'Error al guardar visitante',
            text: error.error?.error || 'No se pudo guardar el visitante',
            confirmButtonColor: '#FFD700'
          });
        }
      });
    } else {


      this.visitantes.push(nuevoVisitante);
      this.marcarCambio('visitantes');
      const observacionesIniciales: any = {};
      this.categoriasDisc.forEach(cat => {
        observacionesIniciales[cat.codigo] = [];
      });
      this.observacionesDiscPorVisitante[this.visitantes.length - 1] = observacionesIniciales;
      this.puntajesDiscPorVisitante[this.visitantes.length - 1] = { D: 0, I: 0, S: 0, C: 0 };

      this.formContactoPrincipal.reset({ asistio: true });
      this.emitirCambios();

      Swal.fire({
        icon: 'success',
        title: 'Visitante agregado',
        showConfirmButton: false,
        timer: 1500,
        toast: true,
        position: 'top-end'
      });
    }
  }

  eliminarVisitante(index: number): void {
    const visitante = this.visitantes[index];

    Swal.fire({
      title: '¿Eliminar visitante?',
      text: visitante.id
        ? 'Este visitante será eliminado de la base de datos'
        : 'Este visitante será eliminado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FFD700',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {

        // ✅ Si tiene ID, eliminar del backend
        if (visitante.id) {
          this.visitantesService.eliminar(visitante.id).subscribe({
            next: () => {
              // Después de eliminar del backend, quitar del array
              this.visitantes.splice(index, 1);
              this.marcarCambio('visitantes');
              delete this.observacionesDiscPorVisitante[index];
              delete this.puntajesDiscPorVisitante[index];
              this.emitirCambios();

              Swal.fire({
                icon: 'success',
                title: 'Visitante eliminado',
                showConfirmButton: false,
                timer: 1500,
                toast: true,
                position: 'top-end'
              });
            },
            error: (error: any) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el visitante',
                confirmButtonColor: '#FFD700'
              });
            }
          });
        } else {
          // ✅ Si NO tiene ID, solo quitar del array
          this.visitantes.splice(index, 1);
          this.marcarCambio('visitantes');
          delete this.observacionesDiscPorVisitante[index];
          delete this.puntajesDiscPorVisitante[index];
          this.emitirCambios();

          Swal.fire({
            icon: 'success',
            title: 'Visitante eliminado',
            showConfirmButton: false,
            timer: 1500,
            toast: true,
            position: 'top-end'
          });
        }
      }
    });
  }

  actualizarParentesco(index: number, idParentesco: number): void {
    this.visitantes[index].id_parentesco = idParentesco;
    this.emitirCambios();
  }

  agregarNino(): void {
    const nuevoNino = {
      nombre_nino: '',
      fecha_nacimiento: null,
      id_grupo: null,
      id_genero: null,
      dato_significativo: '',
      tiene_hermanos_en_jardin: false,
      nombre_hermanos_en_jardin: '',
      ha_estado_escolarizado: false,
      donde_estuvo: '',
      necesidades: []
    };
    this.ninos.push(nuevoNino);
    this.marcarCambio('ninos');
    this.emitirCambios();
  }

  eliminarNino(index: number): void {
    Swal.fire({
      title: '¿Eliminar niño?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FFD700',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ninos.splice(index, 1);
        this.marcarCambio('ninos');
        this.emitirCambios();
      }
    });
  }

  actualizarNino(index: number, campo: string, valor: any): void {
    this.ninos[index][campo] = valor;
    this.marcarCambio('ninos');
    this.emitirCambios();
  }

  toggleRazonBusqueda(idRazon: string): void {
    const index = this.razonesBusquedaSeleccionadas.indexOf(idRazon);
    if (index > -1) {
      this.razonesBusquedaSeleccionadas.splice(index, 1);
    } else {
      this.razonesBusquedaSeleccionadas.push(idRazon);
    }
    this.emitirCambios();
    this.marcarCambio('razonesBusqueda');
  }

  esRazonSeleccionada(idRazon: string): boolean {
    return this.razonesBusquedaSeleccionadas.includes(idRazon);
  }

  toggleObservacionDisc(indexVisitante: number, categoria: string, idParametro: number): void {
    if (!this.observacionesDiscPorVisitante[indexVisitante]) {
      const observacionesIniciales: any = {};
      this.categoriasDisc.forEach(cat => {
        observacionesIniciales[cat.codigo] = [];
      });
      this.observacionesDiscPorVisitante[indexVisitante] = observacionesIniciales;
    }

    if (!this.observacionesDiscPorVisitante[indexVisitante][categoria]) {
      this.observacionesDiscPorVisitante[indexVisitante][categoria] = [];
    }

    const observaciones = this.observacionesDiscPorVisitante[indexVisitante][categoria];
    const index = observaciones.indexOf(idParametro);

    if (index > -1) {
      observaciones.splice(index, 1);
    } else {
      observaciones.push(idParametro);
    }

    this.calcularPerfilDisc(indexVisitante);
    this.emitirCambios();
    this.marcarCambio('observacionesDisc');
  }

  esObservacionMarcada(indexVisitante: number, categoria: string, idParametro: number): boolean {
    if (!this.observacionesDiscPorVisitante[indexVisitante]) return false;
    return this.observacionesDiscPorVisitante[indexVisitante][categoria]?.includes(idParametro) || false;
  }

  calcularPerfilDisc(indexVisitante: number): void {
    const observaciones = this.observacionesDiscPorVisitante[indexVisitante];
    if (!observaciones) return;

    const puntajes = { D: 0, I: 0, S: 0, C: 0 };

    this.categoriasDisc.forEach(categoria => {
      const idsSeleccionados = observaciones[categoria.codigo] || [];

      idsSeleccionados.forEach((id: string) => {
        const parametro = categoria.parametros.find((p: any) => p.id === id);
        if (parametro) {
          puntajes[parametro.perfil_asociado as keyof typeof puntajes] += parametro.peso || 1;
        }
      });
    });

    // ✅ Si todos los puntajes son 0, limpiar el perfil
    const totalPuntaje = puntajes.D + puntajes.I + puntajes.S + puntajes.C;

    if (totalPuntaje === 0) {
      this.visitantes[indexVisitante].perfil_disc_calculado = null;
      this.puntajesDiscPorVisitante[indexVisitante] = { D: 0, I: 0, S: 0, C: 0 };
      return; // ✅ Detener aquí, NO calcular perfil dominante
    }

    // ✅ Solo calcular perfil dominante si hay puntajes
    let perfilMax = 'D';
    let puntajeMax = puntajes.D;

    if (puntajes.I > puntajeMax) {
      perfilMax = 'I';
      puntajeMax = puntajes.I;
    }
    if (puntajes.S > puntajeMax) {
      perfilMax = 'S';
      puntajeMax = puntajes.S;
    }
    if (puntajes.C > puntajeMax) {
      perfilMax = 'C';
      puntajeMax = puntajes.C;
    }

    this.visitantes[indexVisitante].perfil_disc_calculado = perfilMax;
    this.puntajesDiscPorVisitante[indexVisitante] = puntajes;
  }

  obtenerNombrePerfilDisc(perfil: string): string {
    // ✅ Verificar que perfil no sea null antes de buscar
    if (!perfil) return '❓ Sin calcular';

    const nombres: any = {
      'D': '🎯 Orientado a Resultados',
      'I': '🎉 Orientado a Experiencias',
      'S': '🛡️ Orientado a Seguridad',
      'C': '📊 Orientado a Información'
    };
    return nombres[perfil] || '❓ Sin calcular';
  }

  obtenerPuntajesDisc(indexVisitante: number): any {
    return this.puntajesDiscPorVisitante[indexVisitante] || { D: 0, I: 0, S: 0, C: 0 };
  }

  seleccionarNivelInteres(idNivel: number): void {
    this.nivelInteresSeleccionado = idNivel;
    this.formVisita.patchValue({ id_nivel_interes: idNivel });
    this.emitirCambios();
  }

  togglePreferenciaSeguimiento(idPreferencia: number): void {
    const index = this.preferencias_seguimiento.indexOf(idPreferencia);
    if (index > -1) {
      this.preferencias_seguimiento.splice(index, 1);
    } else {
      this.preferencias_seguimiento.push(idPreferencia);
    }
    this.emitirCambios();
    this.marcarCambio('preferencias_seguimiento');
  }

  esPreferenciaSeleccionada(idPreferencia: number): boolean {
    return this.preferencias_seguimiento.includes(idPreferencia);
  }


  obtenerFechaActual(): string {
    const ahora = new Date();
    return ahora.toISOString().split('T')[0];
  }

  obtenerHoraActual(): string {
    const ahora = new Date();
    return ahora.toTimeString().split(' ')[0].substring(0, 5);
  }

  emitirCambios(): void {
    if (this.cargandoDatos) return;

    console.log('🔄 TAB 1 - Emitiendo secciones:', Array.from(this.seccionesModificadas));

    const datosCompletos: any = {};

    // ✅ Solo enviar visita si fue modificada
    if (this.seccionesModificadas.has('visita')) {
      datosCompletos.visita = this.formVisita.value;
    }

    // Solo enviar secciones que cambiaron
    if (this.seccionesModificadas.has('visitantes')) {
      datosCompletos.visitantes = this.visitantes;
    }

    if (this.seccionesModificadas.has('ninos')) {
      datosCompletos.ninos = this.ninos;
    }

    if (this.seccionesModificadas.has('razonesBusqueda')) {
      datosCompletos.razonesBusqueda = this.razonesBusquedaSeleccionadas;
    }

    if (this.seccionesModificadas.has('observacionesDisc')) {
      const observacionesDiscMapeadas: any = {};
      this.visitantes.forEach((visitante, index) => {
        if (visitante.id && this.observacionesDiscPorVisitante[index]) {
          observacionesDiscMapeadas[visitante.id] = {};
          Object.keys(this.observacionesDiscPorVisitante[index]).forEach(categoria => {
            observacionesDiscMapeadas[visitante.id][categoria] =
              [...this.observacionesDiscPorVisitante[index][categoria]];
          });
        }
      });
      datosCompletos.observacionesDisc = observacionesDiscMapeadas;
    }

    if (this.seccionesModificadas.has('temperatura')) {
      datosCompletos.temperatura = {
        id_nivel_interes: this.formVisita.value.id_nivel_interes,
        id_urgencia: this.formVisita.value.id_urgencia,
        pidio_descuento: this.formVisita.value.pidio_descuento,
        visito_instalaciones_completas: this.formVisita.value.visito_instalaciones_completas,
        pregunto_por_matricula: this.formVisita.value.pregunto_por_matricula
      };
    }

    if (this.seccionesModificadas.has('seguimiento')) {
      datosCompletos.seguimiento = {
        id_cuando_seguimiento: this.formVisita.value.id_cuando_seguimiento,
        fecha_seguimiento_calculada: this.formVisita.value.fecha_seguimiento_calculada,
        mejor_horario: this.formVisita.value.mejor_horario_contacto,
        horario_manana: this.formVisita.value.horario_manana,
        horario_tarde: this.formVisita.value.horario_tarde,
        horario_noche: this.formVisita.value.horario_noche,
        horario_cualquiera: this.formVisita.value.horario_cualquiera,
        id_quien_decide: this.formVisita.value.id_quien_decide,
        necesita_consultar: this.formVisita.value.necesita_consultar,
        con_quien_consultar: this.formVisita.value.con_quien_consultar
      };
    }

    if (this.seccionesModificadas.has('preferencias_seguimiento')) {
      datosCompletos.preferencias_seguimiento = Array.isArray(this.preferencias_seguimiento)
        ? this.preferencias_seguimiento.map((p: any) => {
          if (typeof p === 'object' && p !== null && 'id_preferencia_seguimiento' in p) {
            return p.id_preferencia_seguimiento;
          }
          return p;
        })
        : [];
    }

    if (this.seccionesModificadas.has('compromisos')) {
      datosCompletos.compromisos = this.compromisos.map(c => ({
        id_tipo_compromiso: c.id_tipo_compromiso,
        fecha_compromiso: c.fecha_compromiso || null,
        hora_compromiso: c.hora_compromiso || null,
        detalle_especifico: c.detalle_especifico || null
      }));
      this.marcarCambio('compromisos');
    }

    this.datosActualizados.emit(datosCompletos);
  }
  // =====================================================
  // CALCULAR FECHA DE SEGUIMIENTO (DINÁMICO)
  // =====================================================
  calcularFechaSeguimiento(): void {
    const idCuandoSeguimiento = this.formVisita.get('id_cuando_seguimiento')?.value;
    const fechaVisita = this.formVisita.get('fecha')?.value;

    if (!idCuandoSeguimiento || !fechaVisita) {
      this.formVisita.patchValue({ fecha_seguimiento_calculada: null });
      return;
    }

    // ✅ Buscar el tipo seleccionado en el catálogo cargado
    const tipoSeleccionado = this.tiposCuandoSeguimiento.find(
      (tipo: any) => tipo.id === parseInt(idCuandoSeguimiento)
    );

    if (!tipoSeleccionado || !tipoSeleccionado.dias) {
      // Si no tiene días definidos (NULL), no calcular fecha
      this.formVisita.patchValue({ fecha_seguimiento_calculada: null });
      return;
    }

    // ✅ Calcular nueva fecha usando los días del catálogo
    const fecha = new Date(fechaVisita);
    fecha.setDate(fecha.getDate() + tipoSeleccionado.dias);

    // Formatear como YYYY-MM-DD
    const fechaCalculada = fecha.toISOString().split('T')[0];

    this.formVisita.patchValue({ fecha_seguimiento_calculada: fechaCalculada });
  }
  get nombreTipoContacto(): string {
    const tipo = this.tiposContacto.find(t => t.id === this.formVisita.value.id_tipo_contacto);
    return tipo?.nombre || '';
  }

  seleccionarTipoContacto(idTipo: number): void {
    this.formVisita.patchValue({ id_tipo_contacto: idTipo });
    this.emitirCambios();
  }

  toggleObservacionesDisc(index: number): void {
    if (this.observacionesDiscExpandido === index) {
      this.observacionesDiscExpandido = null;
    } else {
      this.observacionesDiscExpandido = index;
    }
  }

  marcarComoContactoPrincipal(index: number): void {
    if (this.visitantes[index].es_contacto_principal) {
      this.visitantes.forEach((v, i) => {
        if (i !== index) {
          v.es_contacto_principal = false;
        }
      });
    }

    this.emitirCambios();
  }

  tieneOtroParentesco(index: number): boolean {
    const idSeleccionado = this.visitantes[index]?.id_parentesco;
    if (!idSeleccionado) return false;

    // ✅ Buscar el tipo y verificar si pide_detalle está activo
    const tipo = this.tiposParentesco.find(p => p.id == idSeleccionado);
    return tipo?.pide_detalle == 1 || tipo?.pide_detalle === true;
  }



  obtenerNombreCompleto(visitante: any): string {
    const partes = [
      visitante.primer_nombre,
      visitante.segundo_nombre,
      visitante.primer_apellido,
      visitante.segundo_apellido
    ].filter(p => p && p.trim() !== '');

    return partes.join(' ') || 'Sin nombre';
  }

  mostrarDatosContacto(visitante: any): boolean {
    return (visitante.telefono && visitante.telefono.trim() !== '') ||
      (visitante.email && visitante.email.trim() !== '');
  }
  /**
 * Determina si debe mostrarse el campo de detalle según el tipo seleccionado
 */
  get mostrarDetalleComoConocio(): boolean {

    const idSeleccionado = this.formVisita.get('id_como_conocio')?.value;
    if (!idSeleccionado) return false;

    const tipo = this.tiposComoConocio.find(t => t.id == idSeleccionado);

    return tipo?.pide_detalle == 1 || tipo?.pide_detalle == true;
  }

  /**
   * Obtiene el placeholder dinámico según el tipo seleccionado
   */
  get placeholderDetalleComoConocio(): string {
    const idSeleccionado = this.formVisita.get('id_como_conocio')?.value;
    if (!idSeleccionado) return 'Ingrese el detalle';

    const tipo = this.tiposComoConocio.find(t => t.id == idSeleccionado);
    return tipo?.placeholder_detalle || 'Ingrese el detalle';
  }
  // =====================================================
  // GESTIÓN DE COMPROMISOS INDIVIDUALES
  // =====================================================

  agregarCompromiso(idTipoCompromiso: string): void {
    const existe = this.compromisos.find(c => c.id_tipo_compromiso === idTipoCompromiso);

    if (existe) {
      // Si existe, quitarlo
      this.compromisos = this.compromisos.filter(c => c.id_tipo_compromiso !== idTipoCompromiso);
      this.marcarCambio('compromisos');
    } else {
      // Si no existe, agregarlo
      this.compromisos.push({
        id_tipo_compromiso: idTipoCompromiso,
        fecha_compromiso: this.obtenerFechaActual(),
        hora_compromiso: '10:00',
        detalle_especifico: ''
      });
      this.marcarCambio('compromisos');
    }
    this.marcarCambio('compromisos');
    this.emitirCambios();
  }

  esCompromisoSeleccionado(idTipoCompromiso: string): boolean {
    return this.compromisos.some(c => c.id_tipo_compromiso === idTipoCompromiso);
  }

  obtenerCompromiso(idTipoCompromiso: string): any {
    return this.compromisos.find(c => c.id_tipo_compromiso === idTipoCompromiso);
  }
  obtenerNombreCompromiso(idTipoCompromiso: string): string {
    const tipo = this.tiposCompromisos.find(t => t.id === idTipoCompromiso);
    return tipo?.nombre || '';
  }
  marcarCambio(seccion: string): void {
    if (this.soloLectura || this.cargandoDatos) return;

    console.log('🔄 TAB 1 - Sección modificada:', seccion);
    this.seccionesModificadas.add(seccion);


  }

  limpiarCambios(): void {
    this.seccionesModificadas.clear();
    console.log('🧹 TAB 1 - Cambios limpiados');
  }
  toggleNecesidadNino(indexNino: number, idNecesidad: string): void {
    if (!this.ninos[indexNino].necesidades) {
      this.ninos[indexNino].necesidades = [];
    }
    const necesidades = this.ninos[indexNino].necesidades;
    const existe = necesidades.find((n: any) => n.id_tipo_necesidad === idNecesidad);
    if (existe) {
      this.ninos[indexNino].necesidades = necesidades.filter((n: any) => n.id_tipo_necesidad !== idNecesidad);
    } else {
      necesidades.push({ id_tipo_necesidad: idNecesidad, detalle: '' });
    }
    this.marcarCambio('ninos');
    this.emitirCambios();
  }

  esNecesidadSeleccionada(indexNino: number, idNecesidad: string): boolean {
    if (!this.ninos[indexNino] || !this.ninos[indexNino].necesidades) return false;
    return this.ninos[indexNino].necesidades.some((n: any) => n.id_tipo_necesidad === idNecesidad);
  }

  actualizarDetalleNecesidad(indexNino: number, idNecesidad: string, detalle: string): void {
    const necesidad = this.ninos[indexNino].necesidades.find((n: any) => n.id_tipo_necesidad === idNecesidad);
    if (necesidad) {
      necesidad.detalle = detalle;
      this.marcarCambio('ninos');
      this.emitirCambios();
    }
  }

  obtenerDetalleNecesidad(indexNino: number, idNecesidad: string): string {
    const necesidad = this.ninos[indexNino].necesidades?.find((n: any) => n.id_tipo_necesidad === idNecesidad);
    return necesidad?.detalle || '';
  }

  calcularEdad(fechaNacimiento: string): number | null {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }
}