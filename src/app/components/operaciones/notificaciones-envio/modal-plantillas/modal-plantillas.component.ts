import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotificacionesPlantillasService } from '../../../../services/notificaciones-plantillas.service';

/** Variables que resuelve el backend por cada destinatario. */
const VARIABLES_AUTOMATICAS = ['nombre_estudiante', 'nombre_acudiente', 'grupo', 'nombre_colegio'];

@Component({
  selector: 'app-modal-plantillas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-plantillas.component.html',
  styleUrl: './modal-plantillas.component.scss'
})
export class ModalPlantillasComponent implements OnInit {

  /** Categorías y tipos de respuesta ya cargados por el formulario padre. */
  @Input() categorias: any[] = [];
  @Input() tiposRespuesta: any[] = [];

  /** Emite la plantilla lista para aplicar, con las variables ya resueltas. */
  @Output() aplicar = new EventEmitter<any>();
  @Output() cerrar = new EventEmitter<void>();

  public cargando = false;
  public guardando = false;
  public mensajeError = '';

  public plantillas: any[] = [];
  public filtroTexto = '';

  /** Pantalla actual del modal: listar, llenar variables o crear. */
  public vista: 'lista' | 'variables' | 'crear' = 'lista';

  public seleccionada: any = null;
  public valores: { [clave: string]: string } = {};

  public nueva = {
    nombre: '',
    id_categoria: '',
    titulo: '',
    cuerpo: '',
    id_respuesta_tipo: '',
    incluir_whatsapp: true,
  };

  constructor(private plantillasService: NotificacionesPlantillasService) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;

    this.plantillasService.obtenerActivas().subscribe({
      next: (respuesta: any) => {
        this.plantillas = respuesta.body || [];
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'No se pudieron cargar las plantillas';
        this.cargando = false;
      }
    });
  }

  get plantillasFiltradas(): any[] {
    const filtro = this.filtroTexto.trim().toLowerCase();
    if (!filtro) {
      return this.plantillas;
    }
    return this.plantillas.filter(p =>
      (p.nombre || '').toLowerCase().includes(filtro) ||
      (p.titulo || '').toLowerCase().includes(filtro)
    );
  }

  /**
   * Al elegir una plantilla, si trae variables de llenado se pide primero su
   * valor; si no, se aplica de una.
   */
  elegir(plantilla: any): void {
    this.seleccionada = plantilla;
    this.valores = {};

    const variables = this.variablesDe(plantilla);

    if (variables.length === 0) {
      this.emitirAplicacion(plantilla, {});
      return;
    }

    variables.forEach(v => this.valores[v.variable] = '');
    this.vista = 'variables';
  }

  /**
   * Variables de llenado de una plantilla. Se toman de las declaradas, pero
   * si el texto trae marcadores no declarados (por ejemplo porque se edito
   * el cuerpo sin actualizar la lista) tambien se piden, para que no lleguen
   * en crudo al acudiente.
   */
  variablesDe(plantilla: any): any[] {
    const declaradas = Array.isArray(plantilla.variables_llenado) ? plantilla.variables_llenado : [];
    const nombresDeclarados = declaradas.map((v: any) => v.variable);

    const enTexto = [
      ...this.plantillasService.extraerVariables(plantilla.titulo),
      ...this.plantillasService.extraerVariables(plantilla.cuerpo),
    ];

    const sueltas = Array.from(new Set(enTexto))
      .filter(v => !VARIABLES_AUTOMATICAS.includes(v))
      .filter(v => !nombresDeclarados.includes(v))
      .map(v => ({ variable: v, etiqueta: v }));

    return [...declaradas, ...sueltas];
  }

  get variablesSeleccionada(): any[] {
    return this.seleccionada ? this.variablesDe(this.seleccionada) : [];
  }

  get faltanValores(): boolean {
    return this.variablesSeleccionada.some(v => !(this.valores[v.variable] || '').trim());
  }

  confirmarVariables(): void {
    if (!this.seleccionada) {
      return;
    }
    this.emitirAplicacion(this.seleccionada, this.valores);
  }

  /**
   * Reemplaza las variables de llenado y entrega la plantilla al formulario.
   * Las automaticas se dejan intactas: las resuelve el backend al leer.
   */
  private emitirAplicacion(plantilla: any, valores: { [clave: string]: string }): void {
    let titulo = plantilla.titulo || '';
    let cuerpo = plantilla.cuerpo || '';

    Object.keys(valores).forEach(clave => {
      const marcador = '{' + clave + '}';
      const valor = valores[clave] || '';
      titulo = titulo.split(marcador).join(valor);
      cuerpo = cuerpo.split(marcador).join(valor);
    });

    this.aplicar.emit({
      id_plantilla: plantilla.id,
      titulo: titulo,
      cuerpo: cuerpo,
      id_categoria: plantilla.id_categoria || '',
      id_respuesta_tipo: plantilla.id_respuesta_tipo || '',
      incluir_whatsapp: plantilla.incluir_whatsapp == 1,
    });
  }

  irACrear(): void {
    this.vista = 'crear';
    this.mensajeError = '';
  }

  volverALista(): void {
    this.vista = 'lista';
    this.seleccionada = null;
    this.mensajeError = '';
  }

  /**
   * Creacion rapida: guarda la plantilla y la aplica de inmediato, para que
   * el usuario no tenga que ir a administracion ni buscarla despues.
   */
  guardarNueva(): void {
    this.mensajeError = '';

    if (!this.nueva.nombre.trim() || !this.nueva.titulo.trim() || !this.nueva.cuerpo.trim()) {
      this.mensajeError = 'El nombre, el título y el mensaje son obligatorios';
      return;
    }

    const variables = Array.from(new Set([
      ...this.plantillasService.extraerVariables(this.nueva.titulo),
      ...this.plantillasService.extraerVariables(this.nueva.cuerpo),
    ]))
      .filter(v => !VARIABLES_AUTOMATICAS.includes(v))
      .map(v => ({ variable: v, etiqueta: v }));

    const cuerpoPeticion = {
      nombre: this.nueva.nombre.trim(),
      descripcion: '',
      id_categoria: this.nueva.id_categoria || null,
      titulo: this.nueva.titulo.trim(),
      cuerpo: this.nueva.cuerpo.trim(),
      id_respuesta_tipo: this.nueva.id_respuesta_tipo || null,
      incluir_whatsapp: this.nueva.incluir_whatsapp ? 1 : 0,
      variables_llenado: variables,
    };

    this.guardando = true;

    this.plantillasService.crear(cuerpoPeticion).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        this.elegir({
          ...cuerpoPeticion,
          id: respuesta?.id,
          variables_llenado: variables,
          incluir_whatsapp: this.nueva.incluir_whatsapp ? 1 : 0,
        });
      },
      error: (error: any) => {
        this.mensajeError = error?.error?.error || 'No se pudo crear la plantilla';
        this.guardando = false;
      }
    });
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
