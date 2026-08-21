import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { NotificacionesPlantillasService } from '../../../../services/notificaciones-plantillas.service';
import { NotificacionesCategoriasService } from '../../../../services/notificaciones-categorias.service';
import { NotificacionesRespuestasTiposService } from '../../../../services/notificaciones-respuestas-tipos.service';
import { IaMejorarTextoService } from '../../../../services/ia-mejorar-texto.service';
import Swal from 'sweetalert2';

/** Variables que resuelve el sistema con los datos de cada familia. */
const VARIABLES_AUTOMATICAS = [
  { variable: 'nombre_estudiante', descripcion: 'Nombre del estudiante' },
  { variable: 'nombre_acudiente', descripcion: 'Nombre del acudiente' },
  { variable: 'grupo', descripcion: 'Grupo del estudiante' },
  { variable: 'nombre_colegio', descripcion: 'Nombre de la institución' },
];

@Component({
  selector: 'app-crear-plantilla-notificacion',
  templateUrl: './crear-plantilla-notificacion.component.html',
  styleUrl: './crear-plantilla-notificacion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearPlantillaNotificacionComponent implements OnInit {

  titulo = "Crear Plantilla de Notificación";
  accion: string = "";
  regresar = '/administracion/datos-maestros/plantillas-notificaciones';
  editable: boolean = true;
  submitted: boolean = false;

  public readonly variablesAutomaticas = VARIABLES_AUTOMATICAS;

  public categorias: any[] = [];
  public tiposRespuesta: any[] = [];

  public campoActivo: 'titulo' | 'cuerpo' = 'cuerpo';
  public mejorando = false;
  public cuerpoAnterior: string | null = null;

  model = {
    id: null,
    nombre: '',
    descripcion: '',
    id_categoria: '',
    titulo: '',
    cuerpo: '',
    id_respuesta_tipo: '',
    incluir_whatsapp: true,
    variables_llenado: [] as any[],
    activo: 1
  } as any;

  constructor(
    private plantillasService: NotificacionesPlantillasService,
    private categoriasService: NotificacionesCategoriasService,
    private tiposRespuestaService: NotificacionesRespuestasTiposService,
    private iaMejorarTextoService: IaMejorarTextoService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Plantilla de Notificación";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Plantilla de Notificación";
        this.editable = true;
        this.cargarPlantilla(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Plantilla de Notificación";
        this.editable = false;
        this.cargarPlantilla(id);
      }
    });
  }

  cargarCatalogos() {
    this.categoriasService.obtenerActivos().subscribe({
      next: (response: any) => { this.categorias = response.body || []; },
      error: (error: any) => { console.error("Error al cargar categorías", error); }
    });

    this.tiposRespuestaService.obtenerActivosConOpciones().subscribe({
      next: (response: any) => { this.tiposRespuesta = response.body || []; },
      error: (error: any) => { console.error("Error al cargar tipos de respuesta", error); }
    });
  }

  cargarPlantilla(id: any) {
    this.plantillasService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          this.model.incluir_whatsapp = this.model.incluir_whatsapp == 1;
          this.model.id_categoria = this.model.id_categoria || '';
          this.model.id_respuesta_tipo = this.model.id_respuesta_tipo || '';
          this.model.variables_llenado = Array.isArray(this.model.variables_llenado)
            ? this.model.variables_llenado
            : [];

          if (this.accion === 'editar') {
            this.titulo = "Editar Plantilla: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Plantilla: " + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar plantilla", error);
        Swal.fire('Error', 'No se pudo cargar la plantilla', 'error');
      }
    });
  }

  /**
   * Arma el marcador con llaves para mostrarlo en pantalla.
   *
   * Se hace aquí y no en el HTML porque Angular decodifica las entidades
   * (&#123;) antes de parsear el template: una llave pegada a una
   * interpolación se leería como {{{ ... }}} y rompe la compilación.
   */
  marcador(variable: string): string {
    return '{' + variable + '}';
  }

  marcarCampoActivo(campo: 'titulo' | 'cuerpo') {
    this.campoActivo = campo;
  }

  /**
   * Inserta la variable en la posición del cursor del campo con el foco,
   * igual que el editor de plantillas de mensajes.
   */
  insertarVariable(variable: string) {
    if (!this.editable) return;

    const marcador = this.marcador(variable);
    const elemento = document.getElementById('campo_' + this.campoActivo) as HTMLTextAreaElement | HTMLInputElement;
    const valorActual = this.model[this.campoActivo] || '';

    if (!elemento) {
      this.model[this.campoActivo] = valorActual + marcador;
      return;
    }

    const inicio = elemento.selectionStart ?? valorActual.length;
    const fin = elemento.selectionEnd ?? valorActual.length;
    this.model[this.campoActivo] = valorActual.substring(0, inicio) + marcador + valorActual.substring(fin);

    setTimeout(() => {
      elemento.focus();
      elemento.selectionStart = elemento.selectionEnd = inicio + marcador.length;
    }, 0);
  }

  /**
   * Variables que aparecen en el texto y no son automáticas: son las que el
   * usuario tendrá que llenar al enviar. Se detectan solas para que no le
   * toque declararlas dos veces.
   */
  get variablesDetectadas(): string[] {
    const automaticas = this.variablesAutomaticas.map(v => v.variable);
    const enTitulo = this.plantillasService.extraerVariables(this.model.titulo);
    const enCuerpo = this.plantillasService.extraerVariables(this.model.cuerpo);
    return Array.from(new Set([...enTitulo, ...enCuerpo])).filter(v => !automaticas.includes(v));
  }

  etiquetaDe(variable: string): string {
    const encontrada = (this.model.variables_llenado || []).find((v: any) => v.variable === variable);
    return encontrada?.etiqueta || '';
  }

  cambiarEtiqueta(variable: string, etiqueta: string) {
    const lista = this.model.variables_llenado || [];
    const encontrada = lista.find((v: any) => v.variable === variable);

    if (encontrada) {
      encontrada.etiqueta = etiqueta;
      return;
    }

    lista.push({ variable, etiqueta });
    this.model.variables_llenado = lista;
  }

  /** Vista previa con los marcadores reemplazados por su descripción. */
  get vistaPrevia(): string {
    let texto = this.model.cuerpo || '';

    this.variablesAutomaticas.forEach(v => {
      texto = texto.split(this.marcador(v.variable)).join('[' + v.descripcion + ']');
    });

    this.variablesDetectadas.forEach(v => {
      const etiqueta = this.etiquetaDe(v) || v;
      texto = texto.split(this.marcador(v)).join('[' + etiqueta + ']');
    });

    return texto;
  }

  /**
   * Pide a la IA que mejore la redacción del mensaje.
   *
   * Si la sugerencia perdió algún marcador se descarta: el texto se vería
   * bien pero la plantilla dejaría de resolver sus variables.
   */
  mejorarConIa() {
    const texto = (this.model.cuerpo || '').trim();

    if (!texto) {
      Swal.fire('Advertencia', 'Escriba primero el mensaje que quiere mejorar', 'warning');
      return;
    }

    this.mejorando = true;
    const variablesAntes = this.plantillasService.extraerVariables(texto);

    const contexto = 'Es una notificación que un jardín infantil envía a los acudientes por la aplicación. '
      + 'Debe ser breve, clara y amable. '
      + 'No modifiques ni traduzcas los textos entre llaves como {nombre_estudiante} o {hora}: '
      + 'son marcadores que el sistema reemplaza y deben quedar escritos exactamente igual.';

    this.iaMejorarTextoService.mejorarTexto({ texto, contexto }).subscribe({
      next: (response: any) => {
        const mejorado = response?.texto_mejorado || '';
        this.mejorando = false;

        if (!mejorado) {
          Swal.fire('Error', 'La IA no devolvió una sugerencia', 'error');
          return;
        }

        const variablesDespues = this.plantillasService.extraerVariables(mejorado);
        const perdidas = variablesAntes.filter(v => !variablesDespues.includes(v));

        if (perdidas.length > 0) {
          Swal.fire(
            'Sugerencia descartada',
            'La sugerencia eliminó las variables ' + perdidas.join(', ') + '. No se aplicó para no dañar la plantilla.',
            'warning'
          );
          return;
        }

        this.cuerpoAnterior = this.model.cuerpo;
        this.model.cuerpo = mejorado;
      },
      error: (error: any) => {
        console.error("Error al mejorar texto", error);
        this.mejorando = false;
        Swal.fire('Error', 'No se pudo mejorar el texto', 'error');
      }
    });
  }

  deshacerMejora() {
    if (this.cuerpoAnterior === null) return;
    this.model.cuerpo = this.cuerpoAnterior;
    this.cuerpoAnterior = null;
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre de la plantilla es obligatorio', 'warning');
      return;
    }

    if (!this.model.titulo || this.model.titulo.trim() === '') {
      Swal.fire('Advertencia', 'El título es obligatorio', 'warning');
      return;
    }

    if (!this.model.cuerpo || this.model.cuerpo.trim() === '') {
      Swal.fire('Advertencia', 'El mensaje es obligatorio', 'warning');
      return;
    }

    // Solo se guardan las variables de llenado que siguen apareciendo en el
    // texto: si se borró un {hora} del cuerpo, su etiqueta ya no sirve.
    const variables = this.variablesDetectadas.map(v => ({
      variable: v,
      etiqueta: this.etiquetaDe(v) || v,
    }));

    const data = {
      nombre: this.model.nombre.trim(),
      descripcion: (this.model.descripcion || '').trim(),
      id_categoria: this.model.id_categoria || null,
      titulo: this.model.titulo.trim(),
      cuerpo: this.model.cuerpo.trim(),
      id_respuesta_tipo: this.model.id_respuesta_tipo || null,
      incluir_whatsapp: this.model.incluir_whatsapp ? 1 : 0,
      variables_llenado: variables,
      activo: this.model.activo
    } as any;

    if (this.accion === 'crear') {
      this.plantillasService.crear(data).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Plantilla creada correctamente', 'success');
          this.router.navigate(['/administracion/datos-maestros/plantillas-notificaciones']);
        },
        error: (error: any) => {
          console.error("Error al crear plantilla", error);
          Swal.fire('Error', 'No se pudo crear la plantilla', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.plantillasService.actualizar(data).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Plantilla actualizada correctamente', 'success');
          this.router.navigate(['/administracion/datos-maestros/plantillas-notificaciones']);
        },
        error: (error: any) => {
          console.error("Error al actualizar plantilla", error);
          Swal.fire('Error', 'No se pudo actualizar la plantilla', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/administracion/datos-maestros/plantillas-notificaciones']);
  }
}
