import { Component, OnInit, HostListener, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../../common/documentos-persona/documentos-persona.component';
import { FotoPersonaComponent } from '../../../common/foto-persona/foto-persona.component';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import { RolesColaboradorService } from '../../../services/roles-colaborador.service';
import { CasasColaboradoresService } from '../../../services/casas-colaboradores.service';
import { PersonasService } from '../../../services/personas.service';
import { TiposIdentificacionService } from '../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../services/generos.service';
import { CiudadesService } from '../../../services/ciudades.service';
import { NivelesEscolaridadService } from '../../../services/niveles-escolaridad.service';
import { DocentesService } from '../../../services/docentes.service';
import { GruposService } from '../../../services/grupos.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { AreaAcademicaXGrupoService } from '../../../services/area-academica-x-grupo.service';
import { UsuariosService } from '../../../services/usuarios.service';
import { HorariosColaboradoresService } from '../../../services/horarios-colaboradores.service';
import Swal from 'sweetalert2';
import { CargosService } from '../../../services/cargos.service';
import { MotivosRetiroService } from '../../../services/motivos-retiro.service';
import { TiposContratoService } from '../../../services/tipos-contrato.service';

@Component({
  selector: 'app-crear-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule, DocumentosPersonaComponent, FotoPersonaComponent],
  templateUrl: './crear-colaboradores.component.html',
  styleUrl: './crear-colaboradores.component.scss',
})
export class CrearColaboradoresComponent implements OnInit {
  public titulo = 'Colaborador';
  public id = '0';
  public accion = '';
  public editable = false;
  public nuevo = false;
  public seccionActiva: 'datos-personales' | 'datos-colaborador' | 'documentos' | 'grupos' | 'areas' | 'usuario' | 'horarios' = 'datos-personales';
  public submitted = false;
  public documentoEncontrado = false;
  public camposHabilitados = false;
  public colaboradorActivoSwitch = true;
  public nombreColaborador = '';
  public sidebarAbierto = false;

  @Input() idColaboradorInput: string | null = null;
  @Input() modoEmbebido: boolean = false;

  public listas = {
    tiposIdentificacion: [] as any[], generos: [] as any[], roles: [] as any[], nivelesEscolaridad: [] as any[],
    casas: [] as any[], colaboradoresJefes: [] as any[], ciudades: [] as any[], grupos: [] as any[],
    areasAcademicas: [] as any[], cargos: [] as any[], motivosRetiro: [] as any[], tiposContrato: [] as any[],
  };

  public model = {
    idPersona: 0 as any, idColaborador: 0 as any, idDocente: 0 as any,
    tipoIdentificacion: '' as any, numeroIdentificacion: '' as any,
    primerNombre: '' as any, segundoNombre: '' as any, primerApellido: '' as any, segundoApellido: '' as any,
    fechaNacimiento: '' as any, genero: '' as any, direccion: '' as any, correoElectronico: '' as any,
    telefono: '' as any, ciudad: '' as any, rolColaborador: '' as any, rolCodigo: '' as any, nivelEscolaridad: '' as any,
    casaColaborador: '' as any, correoInstitucional: '' as any, jefeDirecto: '' as any, activo: 1 as any,
    sobrenombre: '' as any, fechaIngreso: '' as any, fechaRetiro: '' as any, idMotivoRetiro: '' as any,
    idCargo: '' as any, salarioMensual: '' as any, tipoContrato: '' as any,
    validaIngresoJornada: 1 as any, validaIngresoDescanso: 0 as any,
  };

  public gruposAsignados: any[] = [];
  public nuevoGrupo = { idGrupo: '', esTitular: false };
  public areasAsignadas: any[] = [];
  public nuevaArea: any = {};
  public modelUsuario: any = { id: '', id_persona: '', usuario: '', correo_electronico: '', clave: '', activo: 1, acceso_institucional: 0, acceso_portal_padres: 0 };
  public cambiarClaveModel: any = { id: '', claveNueva: '' };
  public submittedUsuario = false;
  public intentoCambiarClave = false;
  public mostrarClaveNueva = false;

  public diasSemana = [
    { valor: 1, nombre: 'Lun' }, { valor: 2, nombre: 'Mar' }, { valor: 3, nombre: 'Mié' },
    { valor: 4, nombre: 'Jue' }, { valor: 5, nombre: 'Vie' }, { valor: 6, nombre: 'Sáb' }, { valor: 7, nombre: 'Dom' },
  ];
  public horarios: any[] = [];
  public horariosCargados = false;

  // Grilla horarios
  public horasGrilla: string[] = [];

  // Modal horario
  public mostrarModalHorario = false;
  public horarioErrorSolapamiento = '';
  public horarioModal = {
    dia_semana: 0,
    tipo: 'jornada' as 'jornada' | 'descanso',
    hora_inicio: '',
    hora_fin: '',
  };

  constructor(
    private route: ActivatedRoute, private router: Router,
    private colaboradoresService: ColaboradoresService, private rolesService: RolesColaboradorService,
    private casasService: CasasColaboradoresService, private personasService: PersonasService,
    private tiposIdentificacionService: TiposIdentificacionService, private generosService: GenerosService,
    private ciudadesService: CiudadesService, private nivelesEscolaridadService: NivelesEscolaridadService,
    private docentesService: DocentesService, private gruposService: GruposService,
    private areasAcademicasService: AreasAcademicasService, private areaAcademicaXGrupoService: AreaAcademicaXGrupoService,
    private cargosService: CargosService, private motivosRetiroService: MotivosRetiroService,
    private tiposContratoService: TiposContratoService, private usuariosService: UsuariosService,
    private horariosService: HorariosColaboradoresService
  ) {
    this.generarHorasGrilla();
  }

  ngOnInit() {
    if (this.modoEmbebido && this.idColaboradorInput) {
      this.accion = 'editar';
      this.id = this.idColaboradorInput;
      this.titulo = 'Mis Datos';
      this.editable = true;
      this.camposHabilitados = true;
      this.documentoEncontrado = true;
      this.consultarListas();
      this.consultarColaborador();
      return;
    }

    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      this.id = params['id'];
      switch (this.accion) {
        case 'crear': this.titulo = 'Crear Colaborador'; this.editable = true; this.nuevo = true; this.camposHabilitados = false; this.establecerValoresPorDefecto(); this.consultarListas(); break;
        case 'editar': this.titulo = 'Editar Colaborador'; this.editable = true; this.camposHabilitados = true; this.documentoEncontrado = true; this.consultarListas(); this.consultarColaborador(); break;
        case 'ver': this.titulo = 'Ver Colaborador'; this.editable = false; this.camposHabilitados = false; this.documentoEncontrado = true; this.consultarListas(); this.consultarColaborador(); break;
        default: this.titulo = 'Crear Colaborador'; this.editable = true; this.nuevo = true; this.camposHabilitados = false; this.establecerValoresPorDefecto(); this.consultarListas(); break;
      }
    });
  }

  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cerrarSidebar() { this.sidebarAbierto = false; }
  @HostListener('document:keydown.escape') onEscape() { this.cerrarSidebar(); if (this.mostrarModalHorario) this.cerrarModalHorario(); }

  obtenerNombreSeccion(): string {
    const n: any = { 'datos-personales': 'Datos Personales', 'datos-colaborador': 'Información Colaborador', 'documentos': 'Documentos', 'grupos': 'Grupos Asignados', 'areas': 'Áreas Académicas', 'horarios': 'Horarios', 'usuario': 'Usuario' };
    return n[this.seccionActiva] || '';
  }

  obtenerIconoSeccion(): string {
    const i: any = { 'datos-personales': 'fas fa-user-circle', 'datos-colaborador': 'fas fa-briefcase', 'documentos': 'fas fa-file-alt', 'grupos': 'fas fa-users', 'areas': 'fas fa-book', 'horarios': 'fas fa-clock', 'usuario': 'fas fa-user-tag' };
    return i[this.seccionActiva] || 'fas fa-circle';
  }

  consultaPersona() {
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion) { Swal.fire({ title: 'Campos incompletos', text: 'Por favor ingrese tipo y número de documento para verificar', icon: 'warning', confirmButtonText: 'Aceptar' }); return; }
    if (this.editable) {
      this.personasService.obtenerByIdentificacion(this.model.tipoIdentificacion, this.model.numeroIdentificacion).subscribe({
        next: (response: any) => {
          const datos = response.body;
          if (datos && datos.length > 0) {
            const persona = datos[0];
            this.colaboradoresService.verificarDuplicados(persona.id).subscribe({
              next: (respuesta: any) => {
                if (respuesta.existe) { Swal.fire({ title: 'Colaborador existente', text: 'Esta persona ya está registrada como colaborador en el sistema', icon: 'warning', confirmButtonText: 'Aceptar' }); return; }
                else { this.llenarFormularioPersona(persona); this.documentoEncontrado = true; this.camposHabilitados = true; Swal.fire({ title: 'Persona encontrada', text: 'Se encontró una persona con esta identificación', icon: 'success', confirmButtonText: 'Aceptar' }); }
              },
              error: () => Swal.fire({ title: 'Error', text: 'Error al verificar si la persona ya está registrada como colaborador', icon: 'error', confirmButtonText: 'Aceptar' }),
            });
          } else { this.documentoEncontrado = true; this.camposHabilitados = true; Swal.fire({ title: 'Persona no encontrada', text: 'No se encontró ninguna persona con esta identificación. Ahora puede ingresar los datos.', icon: 'info', confirmButtonText: 'Aceptar' }); }
        },
        error: () => Swal.fire({ title: 'Error', text: 'Error al consultar la persona', icon: 'error', confirmButtonText: 'Aceptar' }),
      });
    }
  }

  llenarFormularioPersona(persona: any) {
    this.model.idPersona = persona.id; this.model.primerNombre = persona.primer_nombre || ''; this.model.segundoNombre = persona.segundo_nombre || '';
    this.model.primerApellido = persona.primer_apellido || ''; this.model.segundoApellido = persona.segundo_apellido || '';
    this.model.fechaNacimiento = persona.fecha_nacimiento || ''; this.model.genero = persona.id_genero || '';
    this.model.direccion = persona.direccion || ''; this.model.correoElectronico = persona.correo_electronico || '';
    this.model.telefono = persona.telefono || ''; this.model.ciudad = persona.id_ciudad || '';
  }

  establecerValoresPorDefecto() { this.model.activo = 1; this.colaboradorActivoSwitch = true; this.model.validaIngresoJornada = 1; this.model.validaIngresoDescanso = 0; }
  esDocente(): boolean { return this.model.rolCodigo === 'DOCENTE'; }

  cambiarSeccion(seccion: 'datos-personales' | 'datos-colaborador' | 'grupos' | 'areas' | 'usuario' | 'documentos' | 'horarios') {
    this.seccionActiva = seccion; this.cerrarSidebar();
    if (seccion === 'grupos' && !!this.model.idDocente) this.consultarGruposAsignados();
    if (seccion === 'areas' && !!this.model.idDocente) this.consultarAreasAcademicas();
    if (seccion === 'usuario' && !!this.model.idPersona) this.cargarUsuario();
    if (seccion === 'horarios' && !!this.model.idColaborador) this.cargarHorarios();
  }

  consultarListas() {
    this.tiposIdentificacionService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.tiposIdentificacion = r.body || []), error: (e: any) => console.error('Error', e) });
    this.generosService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.generos = r.body || []), error: (e: any) => console.error('Error', e) });
    this.rolesService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.roles = r.body || []), error: (e: any) => console.error('Error', e) });
    this.nivelesEscolaridadService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.nivelesEscolaridad = r.body || []), error: (e: any) => console.error('Error', e) });
    this.casasService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.casas = r.body || []), error: (e: any) => console.error('Error', e) });
    this.ciudadesService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.ciudades = r.body || []), error: (e: any) => console.error('Error', e) });
    this.gruposService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.grupos = r.body || []), error: (e: any) => console.error('Error', e) });
    this.areasAcademicasService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.areasAcademicas = r.body || []), error: (e: any) => console.error('Error', e) });
    this.cargosService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.cargos = r.body || []), error: (e: any) => console.error('Error', e) });
    this.motivosRetiroService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.motivosRetiro = r.body || []), error: (e: any) => console.error('Error', e) });
    this.tiposContratoService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.tiposContrato = r.body || []), error: (e: any) => console.error('Error', e) });
    this.colaboradoresService.obtenerTodos().subscribe({ next: (r: any) => (this.listas.colaboradoresJefes = r.body || []), error: (e: any) => console.error('Error', e) });
  }

  consultarColaborador() {
    this.colaboradoresService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        const datos = response.body;
        if (datos && datos.length > 0) { this.llenarFormularioColaborador(datos[0]); if (!!this.model.idPersona) this.cargarUsuario(); if (this.esDocente() && !!this.model.idDocente) { this.consultarGruposAsignados(); this.consultarAreasAcademicas(); } }
      },
      error: () => Swal.fire({ title: 'Error', text: 'Error al consultar el colaborador', icon: 'error' }),
    });
  }

  llenarFormularioColaborador(c: any) {
    this.model.idColaborador = c.id; this.model.idPersona = c.id_persona; this.model.idDocente = c.id_docente || 0;
    this.model.tipoIdentificacion = c.id_tipo_identificacion; this.model.numeroIdentificacion = c.numero_identificacion;
    this.model.primerNombre = c.primer_nombre; this.model.segundoNombre = c.segundo_nombre || '';
    this.model.primerApellido = c.primer_apellido; this.model.segundoApellido = c.segundo_apellido || '';
    this.model.fechaNacimiento = c.fecha_nacimiento; this.model.genero = c.id_genero;
    this.model.direccion = c.direccion || ''; this.model.correoElectronico = c.correo_electronico || '';
    this.model.telefono = c.telefono || ''; this.model.ciudad = c.id_ciudad || '';
    this.model.rolColaborador = c.id_rol_colaborador; this.model.rolCodigo = c.rol_codigo; this.model.nivelEscolaridad = c.id_nivel_escolaridad;
    this.model.casaColaborador = c.id_casa_colaborador || ''; this.model.correoInstitucional = c.correo_electronico || '';
    this.model.jefeDirecto = c.id_jefe_directo || ''; this.model.activo = c.activo;
    this.colaboradorActivoSwitch = c.activo == 1; this.model.sobrenombre = c.sobrenombre || '';
    this.model.fechaIngreso = c.fecha_ingreso || ''; this.model.fechaRetiro = c.fecha_retiro || '';
    this.model.idMotivoRetiro = c.id_motivo_retiro || ''; this.model.idCargo = c.id_cargo || '';
    this.model.salarioMensual = c.salario_mensual || ''; this.model.tipoContrato = c.id_tipo_contrato || '';
    this.model.validaIngresoJornada = c.valida_ingreso_jornada != null ? c.valida_ingreso_jornada : 1;
    this.model.validaIngresoDescanso = c.valida_ingreso_descanso != null ? c.valida_ingreso_descanso : 0;
    this.nombreColaborador = [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido].filter(Boolean).join(' ');
    this.titulo = `${this.accion === 'editar' ? 'Editar' : 'Ver'} Colaborador: ${this.nombreColaborador}`;
  }

  consultarGruposAsignados() { this.docentesService.obtenerGruposDocente(this.model.idDocente).subscribe({ next: (r: any) => { this.gruposAsignados = r.body || []; }, error: (e: any) => console.error('Error', e) }); }
  consultarAreasAcademicas() { this.areaAcademicaXGrupoService.obtenerPorDocente(this.model.idDocente).subscribe({ next: (r: any) => { this.areasAsignadas = r.body || []; }, error: (e: any) => console.error('Error', e) }); }
  onColaboradorActivoChange() { this.model.activo = this.colaboradorActivoSwitch ? 1 : 0; }
  cambiarEstadoColaborador() { this.model.activo = this.colaboradorActivoSwitch ? 1 : 0; }

  validar(): boolean {
    this.submitted = true;
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion || !this.model.primerNombre || !this.model.primerApellido || !this.model.fechaNacimiento || !this.model.rolColaborador || !this.model.nivelEscolaridad) { Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor complete todos los campos requeridos' }); return false; }
    return true;
  }

  guardar() { if (!this.validar()) return; !!this.model.idPersona ? this.actualizarPersona() : this.crearPersona(); }

  guardarDatosPersonales() {
    this.submitted = true;
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion || !this.model.primerNombre || !this.model.primerApellido || !this.model.fechaNacimiento) { Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor complete todos los campos requeridos de datos personales' }); return; }
    const personaData = this.prepararDatosPersona(this.model);
    if (!!this.model.idPersona) { this.personasService.actualizar(personaData).subscribe({ next: () => Swal.fire({ icon: 'success', title: 'Datos Personales Actualizados', text: 'Los datos personales se han guardado correctamente', confirmButtonText: 'Aceptar' }), error: (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error al actualizar' }) }); }
    else { this.personasService.crear(personaData).subscribe({ next: (r: any) => { this.model.idPersona = r.id; Swal.fire({ icon: 'success', title: 'Datos Personales Creados', text: 'Ahora puede completar la información del colaborador.', confirmButtonText: 'Aceptar' }); }, error: (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error al crear' }) }); }
  }

  guardarInformacionColaborador() { if (!this.validar()) return; !!this.model.idPersona ? this.actualizarPersona() : this.crearPersona(); }
  validarFechaRetiro() {}

  prepararDatosPersona(d: any) {
    return { id: d.idPersona || 0, id_tipo_identificacion: d.tipoIdentificacion, numero_identificacion: d.numeroIdentificacion, primer_nombre: d.primerNombre, segundo_nombre: d.segundoNombre || null, primer_apellido: d.primerApellido, segundo_apellido: d.segundoApellido || null, fecha_nacimiento: d.fechaNacimiento, id_genero: d.genero, direccion: d.direccion || null, correo_electronico: d.correoElectronico || null, telefono: d.telefono || null, id_ciudad: d.ciudad || null };
  }

  crearPersona() { this.personasService.crear(this.prepararDatosPersona(this.model)).subscribe({ next: (r: any) => { this.model.idPersona = r.id; this.crearActualizarColaborador(); }, error: () => Swal.fire({ title: 'Error', text: 'Error al crear la persona', icon: 'error' }) }); }
  actualizarPersona() { this.personasService.actualizar(this.prepararDatosPersona(this.model)).subscribe({ next: () => this.crearActualizarColaborador(), error: () => Swal.fire({ title: 'Error', text: 'Error al actualizar la persona', icon: 'error' }) }); }

  crearActualizarColaborador() {
    const d = { id: this.model.idColaborador || 0, id_persona: this.model.idPersona, id_rol_colaborador: this.model.rolColaborador, id_nivel_escolaridad: this.model.nivelEscolaridad, id_casa_colaborador: this.model.casaColaborador || null, correo_electronico: this.model.correoInstitucional || null, sobrenombre: this.model.sobrenombre || null, fecha_ingreso: this.model.fechaIngreso || null, fecha_retiro: this.model.fechaRetiro || null, id_motivo_retiro: this.model.idMotivoRetiro || null, id_cargo: this.model.idCargo || null, salario_mensual: this.model.salarioMensual || null, id_tipo_contrato: this.model.tipoContrato || null, id_jefe_directo: this.model.jefeDirecto || null, activo: this.model.activo, valida_ingreso_jornada: this.model.validaIngresoJornada, valida_ingreso_descanso: this.model.validaIngresoDescanso };
    const svc = !!this.model.idColaborador ? this.colaboradoresService.actualizar(d) : this.colaboradoresService.crear(d);
    svc.subscribe({
      next: (r: any) => { if (!this.model.idColaborador && r.id) { this.model.idColaborador = r.id; this.id = r.id.toString(); } Swal.fire({ icon: 'success', title: this.accion === 'crear' ? 'Colaborador creado' : 'Colaborador actualizado', text: 'Los datos se han guardado correctamente', confirmButtonText: 'Aceptar' }).then(() => { this.esDocente() ? this.consultarColaborador() : this.router.navigate(['/colaboradores']); }); },
      error: (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error al guardar el colaborador' }),
    });
  }

  // ========== GRUPOS ==========
  grupoYaAsignado(idGrupo: any): boolean { return this.gruposAsignados.some((g) => g.id_grupo == idGrupo && g.activo == 1); }
  asignarGrupo() { if (!this.nuevoGrupo.idGrupo) return; this.docentesService.asignarGrupo({ id_docente: this.model.idDocente, id_grupo: this.nuevoGrupo.idGrupo, es_titular: this.nuevoGrupo.esTitular ? 1 : 0, fecha_asignacion: new Date().toISOString().split('T')[0] }).subscribe(() => { Swal.fire({ icon: 'success', title: 'Grupo asignado', timer: 2000, showConfirmButton: false }); this.consultarGruposAsignados(); this.nuevoGrupo = { idGrupo: '', esTitular: false }; }, (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error' })); }
  cambiarTitular(grupo: any) { const n = grupo.es_titular ? 0 : 1; this.docentesService.actualizarTitular(grupo.id, n).subscribe({ next: () => { Swal.fire({ icon: 'success', title: n ? 'Titular asignado' : 'Titular removido', timer: 2000, showConfirmButton: false }); this.consultarGruposAsignados(); }, error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Error al actualizar' }) }); }
  toggleEstadoGrupo(grupo: any) { const svc = grupo.activo ? this.docentesService.desactivarAsignacion(grupo.id) : this.docentesService.activarAsignacion(grupo.id); svc.subscribe(() => { Swal.fire({ icon: 'success', title: grupo.activo ? 'Desactivado' : 'Activado', timer: 2000, showConfirmButton: false }); this.consultarGruposAsignados(); }, (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error' })); }

  // ========== ÁREAS ==========
  asignarArea(idGrupo: any) { if (!this.nuevaArea[idGrupo]) return; this.areaAcademicaXGrupoService.crear({ id_area_academica: this.nuevaArea[idGrupo], id_grupo: idGrupo, id_docente: this.model.idDocente }).subscribe(() => { Swal.fire({ icon: 'success', title: 'Área asignada', timer: 2000, showConfirmButton: false }); this.consultarAreasAcademicas(); this.nuevaArea[idGrupo] = ''; }, (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error' })); }
  areaYaAsignada(idArea: any, idGrupo: any): boolean { return this.areasAsignadas.some((a: any) => a.id_area_academica == idArea && a.id_grupo == idGrupo); }
  obtenerAreasGrupo(idGrupo: any): any[] { return this.areasAsignadas.filter((a: any) => a.id_grupo == idGrupo); }
  quitarArea(idAsignacion: any) { Swal.fire({ title: '¿Está seguro?', text: 'Eliminará la asignación del área', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' }).then((r) => { if (r.isConfirmed) { this.areaAcademicaXGrupoService.eliminar({ id: idAsignacion }).subscribe(() => { Swal.fire({ icon: 'success', title: 'Eliminada', timer: 2000, showConfirmButton: false }); this.consultarAreasAcademicas(); }, () => Swal.fire({ icon: 'error', title: 'Error', text: 'Error al eliminar' })); } }); }

  // ========== USUARIO ==========
  cargarUsuario() { this.usuariosService.obtenerPorPersona(this.model.idPersona).subscribe({ next: (r: any) => { const d = r.body; if (d && d.length > 0) { const u = d[0]; this.modelUsuario = { id: u.id, id_persona: u.id_persona, usuario: u.usuario, correo_electronico: u.correo_electronico, clave: '', activo: u.activo, acceso_institucional: u.acceso_institucional, acceso_portal_padres: u.acceso_portal_padres }; } else { this.resetearModeloUsuario(); } }, error: () => this.resetearModeloUsuario() }); }
  resetearModeloUsuario() { this.modelUsuario = { id: '', id_persona: this.model.idPersona, usuario: '', correo_electronico: '', clave: '', activo: 1, acceso_institucional: 0, acceso_portal_padres: 0 }; }
  tieneUsuario(): boolean { return !!this.modelUsuario.id; }
  crearUsuario() {
    if (!this.model.idPersona) { Swal.fire({ icon: 'warning', title: 'Advertencia', text: 'Primero debe guardar los datos del colaborador' }); return; }
    Swal.fire({ title: '<strong>Crear Usuario</strong>', icon: 'question', html: `<div class="text-start"><div class="mb-3"><label for="swal-email" class="form-label fw-semibold">Correo Electrónico <span class="text-danger">*</span></label><input type="email" id="swal-email" class="form-control form-control-lg" placeholder="usuario@example.com" style="border: 2px solid #e0e0e0; border-radius: 8px;"></div><div class="mb-3"><label for="swal-password" class="form-label fw-semibold">Contraseña <span class="text-danger">*</span></label><input type="password" id="swal-password" class="form-control form-control-lg" placeholder="Mínimo 6 caracteres" style="border: 2px solid #e0e0e0; border-radius: 8px;"><small class="text-muted">Debe tener al menos 6 caracteres</small></div><div class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" id="swal-acceso" style="width: 3em; height: 1.5em;"><label class="form-check-label ms-2 fw-semibold" for="swal-acceso">Acceso Institucional</label></div><div class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" id="swal-acceso-portal" style="width: 3em; height: 1.5em;"><label class="form-check-label ms-2 fw-semibold" for="swal-acceso-portal">Acceso Portal de Padres</label></div></div>`, showCancelButton: true, confirmButtonText: 'Crear Usuario', cancelButtonText: 'Cancelar', customClass: { confirmButton: 'btn btn-lg px-4', cancelButton: 'btn btn-outline-secondary btn-lg px-4' }, buttonsStyling: false, didOpen: () => { const b = Swal.getConfirmButton(); if (b) { b.style.background = 'linear-gradient(135deg, #f9a825 0%, #f57f17 100%)'; b.style.color = 'white'; b.style.border = 'none'; b.style.marginRight = '10px'; } },
      preConfirm: () => { const email = (document.getElementById('swal-email') as HTMLInputElement).value; const pw = (document.getElementById('swal-password') as HTMLInputElement).value; const ai = (document.getElementById('swal-acceso') as HTMLInputElement).checked; const ap = (document.getElementById('swal-acceso-portal') as HTMLInputElement).checked; if (!email || !pw) { Swal.showValidationMessage('Complete todos los campos'); return false; } if (pw.length < 6) { Swal.showValidationMessage('Mínimo 6 caracteres'); return false; } return { correo_electronico: email, clave: pw, acceso_institucional: ai ? 1 : 0, acceso_portal_padres: ap ? 1 : 0 }; }
    }).then((r) => { if (r.isConfirmed && r.value) { this.usuariosService.crear({ id_persona: this.model.idPersona, ...r.value, activo: 1 }).subscribe({ next: () => { Swal.fire({ icon: 'success', title: '¡Usuario Creado!', timer: 2000, showConfirmButton: false }); this.cargarUsuario(); }, error: (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'No se pudo crear' }) }); } });
  }
  guardarUsuario() { this.submittedUsuario = true; if (!this.modelUsuario.correo_electronico) { Swal.fire('Advertencia', 'Complete los campos requeridos', 'warning'); return; } this.usuariosService.actualizar({ id: this.modelUsuario.id, correo_electronico: this.modelUsuario.correo_electronico, activo: this.modelUsuario.activo ? 1 : 0, acceso_institucional: this.modelUsuario.acceso_institucional ? 1 : 0, acceso_portal_padres: this.modelUsuario.acceso_portal_padres ? 1 : 0 }).subscribe({ next: () => { Swal.fire('¡Éxito!', 'Usuario actualizado', 'success'); this.submittedUsuario = false; }, error: (e: any) => Swal.fire('Error', e.error?.error || 'No se pudo actualizar', 'error') }); }
  cambiarContrasena() { this.intentoCambiarClave = true; if (!this.cambiarClaveModel.claveNueva) { Swal.fire('Advertencia', 'Ingrese la nueva contraseña', 'warning'); return; } if (this.cambiarClaveModel.claveNueva.length < 6) { Swal.fire('Advertencia', 'Mínimo 6 caracteres', 'warning'); return; } this.usuariosService.actualizar({ id: this.modelUsuario.id, clave: this.cambiarClaveModel.claveNueva }).subscribe({ next: () => { Swal.fire('¡Éxito!', 'Contraseña cambiada', 'success'); this.cambiarClaveModel.claveNueva = ''; this.intentoCambiarClave = false; this.mostrarClaveNueva = false; }, error: (e: any) => Swal.fire('Error', e.error?.message || 'No se pudo cambiar', 'error') }); }
  confirmarEliminarUsuario() { Swal.fire({ title: '¿Está seguro?', text: 'Eliminará el usuario', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' }).then((r) => { if (r.isConfirmed) this.eliminarUsuario(); }); }
  eliminarUsuario() { this.usuariosService.eliminar({ id: this.modelUsuario.id }).subscribe({ next: () => { Swal.fire('¡Eliminado!', 'Usuario eliminado', 'success'); this.resetearModeloUsuario(); }, error: (e: any) => Swal.fire('Error', e.error?.error || 'No se pudo eliminar', 'error') }); }
  obtenerNombreCompleto(): string { return [this.model.primerNombre, this.model.segundoNombre, this.model.primerApellido, this.model.segundoApellido].filter(Boolean).join(' '); }

  // ========== HORARIOS - GRILLA CON MODAL ==========

  generarHorasGrilla() {
    const activos = this.horarios.filter(h => h.activo && h.hora_entrada && h.hora_salida);
    let horaMin = 6 * 60;
    let horaMax = 20 * 60;

    if (activos.length > 0) {
      const minEntrada = Math.min(...activos.map(h => this.horaAMinutos(h.hora_entrada)));
      const maxSalida = Math.max(...activos.map(h => this.horaAMinutos(h.hora_salida)));
      horaMin = Math.floor(minEntrada / 30) * 30;
      horaMax = Math.ceil(maxSalida / 30) * 30;
      if (horaMin > minEntrada - 30) horaMin = Math.max(0, horaMin - 30);
      if (horaMax < maxSalida + 30) horaMax = Math.min(24 * 60, horaMax + 30);
    }

    this.horasGrilla = [];
    for (let min = horaMin; min < horaMax; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      this.horasGrilla.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  inicializarHorarios() {
    this.horarios = this.diasSemana.map((dia) => ({ dia_semana: dia.valor, nombre: dia.nombre, hora_entrada: '', hora_salida: '', hora_inicio_descanso: '', hora_fin_descanso: '', activo: 0 }));
  }

  cargarHorarios() {
    if (this.horariosCargados) return;
    this.horariosService.obtenerPorColaborador(this.model.idColaborador).subscribe({
      next: (response: any) => {
        const datos = response.body || [];
        if (datos.length > 0) {
          this.horarios = this.diasSemana.map((dia) => {
            const g = datos.find((h: any) => h.dia_semana == dia.valor);
            return { dia_semana: dia.valor, nombre: dia.nombre, hora_entrada: g ? g.hora_entrada.substring(0, 5) : '', hora_salida: g ? g.hora_salida.substring(0, 5) : '', hora_inicio_descanso: g && g.hora_inicio_descanso ? g.hora_inicio_descanso.substring(0, 5) : '', hora_fin_descanso: g && g.hora_fin_descanso ? g.hora_fin_descanso.substring(0, 5) : '', activo: g ? g.activo : 0 };
          });
        } else { this.inicializarHorarios(); }
        this.horariosCargados = true;
        this.generarHorasGrilla();
      },
      error: () => { this.inicializarHorarios(); this.horariosCargados = true; this.generarHorasGrilla(); },
    });
  }

  getHorarioDia(diaValor: number): any { return this.horarios.find(h => h.dia_semana === diaValor) || null; }

  getCeldaClase(diaValor: number, hora: string): string {
    const h = this.getHorarioDia(diaValor);
    if (!h || !h.activo || !h.hora_entrada || !h.hora_salida) return 'celda-vacia';

    const minutosHora = this.horaAMinutos(hora);
    const minutosEntrada = this.horaAMinutos(h.hora_entrada);
    const minutosSalida = this.horaAMinutos(h.hora_salida);
    const minutosDescInicio = h.hora_inicio_descanso ? this.horaAMinutos(h.hora_inicio_descanso) : -1;
    const minutosDescFin = h.hora_fin_descanso ? this.horaAMinutos(h.hora_fin_descanso) : -1;

    if (minutosDescInicio >= 0 && minutosDescFin >= 0 && minutosHora >= minutosDescInicio && minutosHora < minutosDescFin) {
      return 'celda-descanso';
    }
    if (minutosHora >= minutosEntrada && minutosHora < minutosSalida) {
      return 'celda-jornada';
    }
    return 'celda-vacia';
  }

  getCeldaLabel(diaValor: number, hora: string): string {
    const h = this.getHorarioDia(diaValor);
    if (!h || !h.activo) return '';
    if (hora === h.hora_entrada) return `${h.hora_entrada} - ${h.hora_salida}`;
    if (h.hora_inicio_descanso && hora === h.hora_inicio_descanso) return `${h.hora_inicio_descanso} - ${h.hora_fin_descanso}`;
    return '';
  }

  horaAMinutos(hora: string): number {
    if (!hora) return 0;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  contarDiasActivos(): number { return this.horarios.filter(h => h.activo).length; }

  obtenerHorasLaboralesDia(diaValor: number): string {
    const h = this.getHorarioDia(diaValor);
    if (!h || !h.activo) return '';
    return this.calcularHorasDia(h);
  }

  obtenerHorasDescansoDia(diaValor: number): string {
    const h = this.getHorarioDia(diaValor);
    if (!h || !h.activo || !h.hora_inicio_descanso || !h.hora_fin_descanso) return '';
    const desc = this.horaAMinutos(h.hora_fin_descanso) - this.horaAMinutos(h.hora_inicio_descanso);
    return desc > 0 ? (desc / 60).toFixed(1) : '';
  }

  obtenerResumenDiaHeader(diaValor: number): string {
    const h = this.getHorarioDia(diaValor);
    if (!h || !h.activo) return '';
    const lab = this.calcularHorasDia(h);
    const desc = this.obtenerHorasDescansoDia(diaValor);
    if (desc) return `L:${lab}h D:${desc}h`;
    return `${lab}h`;
  }

  // === MODAL ===

  onCeldaClick(diaValor: number, hora: string) {
    if (!this.editable) return;
    const h = this.getHorarioDia(diaValor);
    const clase = this.getCeldaClase(diaValor, hora);

    if (clase === 'celda-jornada') {
      this.mostrarOpcionesJornada(diaValor);
    } else if (clase === 'celda-descanso') {
      this.mostrarOpcionesDescanso(diaValor);
    } else {
      this.abrirModalHorario(diaValor, 'jornada', hora);
    }
  }

  abrirModalHorario(diaValor: number, tipo: 'jornada' | 'descanso', hora?: string) {
    let horaInicio = hora || '';
    let horaFin = '';

    if (hora) {
      const min = this.horaAMinutos(hora) + 60;
      const hFin = Math.floor(min / 60);
      const mFin = min % 60;
      horaFin = `${hFin.toString().padStart(2, '0')}:${mFin.toString().padStart(2, '0')}`;
    }

    this.horarioModal = { dia_semana: diaValor, tipo, hora_inicio: horaInicio, hora_fin: horaFin };
    this.horarioErrorSolapamiento = '';
    this.mostrarModalHorario = true;
  }

  cerrarModalHorario() {
    this.mostrarModalHorario = false;
    this.horarioErrorSolapamiento = '';
  }

  validarSolapamientoModal() {
    this.horarioErrorSolapamiento = '';
    if (!this.horarioModal.hora_inicio || !this.horarioModal.hora_fin) return;
    if (this.horarioModal.hora_fin <= this.horarioModal.hora_inicio) return;

    const h = this.getHorarioDia(this.horarioModal.dia_semana);
    if (!h) return;

    if (this.horarioModal.tipo === 'descanso' && h.activo) {
      const descInicio = this.horaAMinutos(this.horarioModal.hora_inicio);
      const descFin = this.horaAMinutos(this.horarioModal.hora_fin);
      const jornadaInicio = this.horaAMinutos(h.hora_entrada);
      const jornadaFin = this.horaAMinutos(h.hora_salida);

      if (descInicio < jornadaInicio || descFin > jornadaFin) {
        this.horarioErrorSolapamiento = 'El descanso debe estar dentro de la jornada laboral (' + h.hora_entrada + ' - ' + h.hora_salida + ')';
      }
    }
  }

  guardarHorarioModal() {
    if (!this.horarioModal.hora_inicio || !this.horarioModal.hora_fin) { Swal.fire('Advertencia', 'Debe ingresar hora inicio y fin', 'warning'); return; }
    if (this.horarioModal.hora_fin <= this.horarioModal.hora_inicio) { Swal.fire('Advertencia', 'La hora fin debe ser mayor que la hora inicio', 'warning'); return; }

    this.validarSolapamientoModal();
    if (this.horarioErrorSolapamiento) return;

    const h = this.getHorarioDia(this.horarioModal.dia_semana);
    if (!h) return;

    if (this.horarioModal.tipo === 'jornada') {
      h.hora_entrada = this.horarioModal.hora_inicio;
      h.hora_salida = this.horarioModal.hora_fin;
      h.activo = 1;
    } else {
      h.hora_inicio_descanso = this.horarioModal.hora_inicio;
      h.hora_fin_descanso = this.horarioModal.hora_fin;
    }

    this.cerrarModalHorario();
    this.generarHorasGrilla();
  }

  mostrarOpcionesJornada(diaValor: number) {
    const h = this.getHorarioDia(diaValor);
    if (!h) return;
    const dia = this.diasSemana.find(d => d.valor === diaValor);
    const tieneDescanso = h.hora_inicio_descanso && h.hora_fin_descanso;

    Swal.fire({
      title: `Jornada - ${dia?.nombre}`,
      html: `<p><strong>Horario:</strong> ${h.hora_entrada} - ${h.hora_salida}</p>${tieneDescanso ? `<p><strong>Descanso:</strong> ${h.hora_inicio_descanso} - ${h.hora_fin_descanso}</p>` : ''}`,
      icon: 'info',
      showDenyButton: true,
      showCancelButton: !tieneDescanso,
      confirmButtonText: '<i class="fas fa-edit"></i> Editar Jornada',
      denyButtonText: '<i class="fas fa-trash"></i> Eliminar Jornada',
      cancelButtonText: '<i class="fas fa-coffee"></i> Agregar Descanso',
      confirmButtonColor: '#d4af37',
      denyButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.horarioModal = { dia_semana: diaValor, tipo: 'jornada', hora_inicio: h.hora_entrada, hora_fin: h.hora_salida };
        this.horarioErrorSolapamiento = '';
        this.mostrarModalHorario = true;
      } else if (result.isDenied) {
        h.hora_entrada = ''; h.hora_salida = ''; h.hora_inicio_descanso = ''; h.hora_fin_descanso = ''; h.activo = 0;
        this.generarHorasGrilla();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.abrirModalHorario(diaValor, 'descanso');
      }
    });
  }

  mostrarOpcionesDescanso(diaValor: number) {
    const h = this.getHorarioDia(diaValor);
    if (!h) return;
    const dia = this.diasSemana.find(d => d.valor === diaValor);

    Swal.fire({
      title: `Descanso - ${dia?.nombre}`,
      html: `<p><strong>Horario:</strong> ${h.hora_inicio_descanso} - ${h.hora_fin_descanso}</p>`,
      icon: 'info',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: '<i class="fas fa-edit"></i> Editar Descanso',
      denyButtonText: '<i class="fas fa-trash"></i> Eliminar Descanso',
      confirmButtonColor: '#d4af37',
      denyButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.horarioModal = { dia_semana: diaValor, tipo: 'descanso', hora_inicio: h.hora_inicio_descanso, hora_fin: h.hora_fin_descanso };
        this.horarioErrorSolapamiento = '';
        this.mostrarModalHorario = true;
      } else if (result.isDenied) {
        h.hora_inicio_descanso = ''; h.hora_fin_descanso = '';
      }
    });
  }

  eliminarHorarioDia(diaValor: number) {
    const dia = this.diasSemana.find(d => d.valor === diaValor);
    Swal.fire({
      title: '¿Eliminar horario?',
      text: `Se eliminará todo el horario del ${dia?.nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        const h = this.getHorarioDia(diaValor);
        if (h) { h.hora_entrada = ''; h.hora_salida = ''; h.hora_inicio_descanso = ''; h.hora_fin_descanso = ''; h.activo = 0; }
        this.generarHorasGrilla();
      }
    });
  }

  calcularHorasDia(horario: any): string {
    if (!horario.activo || !horario.hora_entrada || !horario.hora_salida) return '0.0';
    let total = this.horaAMinutos(horario.hora_salida) - this.horaAMinutos(horario.hora_entrada);
    if (horario.hora_inicio_descanso && horario.hora_fin_descanso) {
      const desc = this.horaAMinutos(horario.hora_fin_descanso) - this.horaAMinutos(horario.hora_inicio_descanso);
      if (desc > 0) total -= desc;
    }
    return total > 0 ? (total / 60).toFixed(1) : '0.0';
  }

  calcularTotalHorasSemana(): string { let t = 0; for (const h of this.horarios) t += parseFloat(this.calcularHorasDia(h)); return t.toFixed(1); }

  guardarHorarios() {
    if (!this.model.idColaborador) { Swal.fire({ icon: 'warning', title: 'Advertencia', text: 'Primero debe guardar los datos del colaborador' }); return; }
    const data = { id_colaborador: this.model.idColaborador, horarios: this.horarios.map((h) => ({ dia_semana: h.dia_semana, hora_entrada: h.hora_entrada || '07:00', hora_salida: h.hora_salida || '16:00', hora_inicio_descanso: h.hora_inicio_descanso || null, hora_fin_descanso: h.hora_fin_descanso || null, activo: h.activo })) };
    this.horariosService.guardarTodos(data).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Horarios Guardados', text: 'Los horarios se han guardado correctamente', timer: 2000, showConfirmButton: false }),
      error: (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'Error al guardar los horarios' }),
    });
  }

  getNombreDia(valor: number): string {
    return this.diasSemana.find(d => d.valor === valor)?.nombre || '';
  }
}