import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { PlantillasService, Plantilla } from '../../../../../services/plantillas.service';
import Swal from 'sweetalert2';

interface CampoEditable {
  key: string;
  label: string;
  rows?: number;
}

@Component({
  selector: 'app-editar-plantilla',
  templateUrl: './editar-plantilla.component.html',
  styleUrl: './editar-plantilla.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class EditarPlantillaComponent implements OnInit {

  titulo = "Editar Plantilla";
  accion = "editar";
  regresar = "/administracion/configuracion/plantillas";
  editable = true;
  submitted = false;

  model: Plantilla = {
    id: '',
    id_tipo_plantilla: 0,
    clave: '',
    titulo: '',
    contenido: {},
    tipo_codigo: '',
    tipo_nombre: ''
  };

  contenidoEditable: any = {};
  contenidoJSON: string = '';
  errorJSON: string = '';

  modoEdicion: 'estructurado' | 'json' = 'estructurado';
  tieneSingularPlural: boolean = false;
  modoVista: 'dual' | 'plural' | 'singular' = 'dual';
  mostrarJSON: boolean = false;

  camposEditables: CampoEditable[] = [];
  camposSingulares: CampoEditable[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private plantillasService: PlantillasService,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'consultar') {
        this.editable = false;
        this.titulo = "Consultar Plantilla";
      }

      if (id) {
        this.cargarPlantilla(id);
      }
    });
  }

  cargarPlantilla(id: string) {
    this.plantillasService.obtenerById(id).subscribe((response: any) => {
      const plantilla = response.body;
      
      this.model = {
        id: plantilla.id,
        id_tipo_plantilla: plantilla.id_tipo_plantilla,
        clave: plantilla.clave,
        titulo: plantilla.titulo,
        contenido: plantilla.contenido,
        tipo_codigo: plantilla.tipo_codigo,
        tipo_nombre: plantilla.tipo_nombre
      };

      // Actualizar título con el nombre de la plantilla
      if (this.accion === 'consultar') {
        this.titulo = `Consultar: ${plantilla.titulo}`;
      } else {
        this.titulo = `Editar: ${plantilla.titulo}`;
      }

      // Analizar el contenido para detectar estructura
      this.analizarContenido();
    });
  }

  analizarContenido() {
    const contenido = this.model.contenido;
    
    if (!contenido || typeof contenido !== 'object') {
      this.tieneSingularPlural = false;
      this.contenidoJSON = JSON.stringify(contenido, null, 2);
      return;
    }

    // Crear copia editable del contenido PRIMERO
    this.contenidoEditable = JSON.parse(JSON.stringify(contenido));

    // Detectar si tiene campos con sufijo _singular
    const claves = Object.keys(contenido);
    const tieneVersionesSingulares = claves.some(k => k.endsWith('_singular'));

    if (tieneVersionesSingulares) {
      this.tieneSingularPlural = true;
      this.construirCamposEditables(contenido);
      // Inicializar valores de cláusulas DESPUÉS de construir campos
      this.inicializarValoresClausulas();
    } else {
      this.tieneSingularPlural = false;
      this.contenidoJSON = JSON.stringify(contenido, null, 2);
    }

    this.actualizarJSON();
  }

  construirCamposEditables(contenido: any) {
    this.camposEditables = [];
    this.camposSingulares = [];

    // Campos simples de primer nivel
    const claves = Object.keys(contenido);
    const clavesBase = new Set<string>();

    // Identificar claves base (sin sufijo _singular)
    claves.forEach(clave => {
      if (clave.endsWith('_singular')) {
        const base = clave.replace('_singular', '');
        clavesBase.add(base);
      } else if (clave !== 'clausulas' && typeof contenido[clave] === 'string') {
        clavesBase.add(clave);
      }
    });

    // Crear campos editables para plurales y singulares (nivel raíz)
    Array.from(clavesBase).forEach(base => {
      const valorPlural = contenido[base];
      const valorSingular = contenido[base + '_singular'];

      if (typeof valorPlural === 'string') {
        const rows = this.calcularFilas(valorPlural);
        
        this.camposEditables.push({
          key: base,
          label: this.formatearLabel(base),
          rows: rows
        });

        if (valorSingular !== undefined) {
          this.camposSingulares.push({
            key: base + '_singular',
            label: this.formatearLabel(base),
            rows: this.calcularFilas(valorSingular)
          });
        }
      }
    });

    // Manejar cláusulas si existen
    if (contenido.clausulas && Array.isArray(contenido.clausulas)) {
      this.agregarCamposClausulas(contenido.clausulas);
    }
  }

  agregarCamposClausulas(clausulas: any[]) {
    clausulas.forEach((clausula, index) => {
      // Título de la cláusula (plural)
      if (clausula.titulo !== undefined) {
        this.camposEditables.push({
          key: `clausula_${index}_titulo`,
          label: `Cláusula ${clausula.numero} - Título`,
          rows: 2
        });
      }

      // Título singular
      if (clausula.titulo_singular !== undefined) {
        this.camposSingulares.push({
          key: `clausula_${index}_titulo_singular`,
          label: `Cláusula ${clausula.numero} - Título`,
          rows: 2
        });
      } else if (clausula.titulo !== undefined) {
        // Si no hay título singular pero sí plural, agregar vacío
        this.camposSingulares.push({
          key: `clausula_${index}_titulo_singular`,
          label: `Cláusula ${clausula.numero} - Título`,
          rows: 2
        });
      }

      // Contenido plural
      if (clausula.contenido !== undefined) {
        this.camposEditables.push({
          key: `clausula_${index}_contenido`,
          label: `Cláusula ${clausula.numero} - Contenido`,
          rows: this.calcularFilas(clausula.contenido)
        });
      }

      // Contenido singular
      if (clausula.contenido_singular !== undefined) {
        this.camposSingulares.push({
          key: `clausula_${index}_contenido_singular`,
          label: `Cláusula ${clausula.numero} - Contenido`,
          rows: this.calcularFilas(clausula.contenido_singular)
        });
      } else if (clausula.contenido !== undefined) {
        // Si no hay contenido singular pero sí plural, agregar vacío
        this.camposSingulares.push({
          key: `clausula_${index}_contenido_singular`,
          label: `Cláusula ${clausula.numero} - Contenido`,
          rows: this.calcularFilas(clausula.contenido)
        });
      }
    });
  }

  inicializarValoresClausulas() {
    if (!this.contenidoEditable.clausulas) {
      return;
    }

    this.contenidoEditable.clausulas.forEach((clausula: any, index: number) => {
      if (clausula.titulo !== undefined) {
        this.contenidoEditable[`clausula_${index}_titulo`] = clausula.titulo;
      }
      if (clausula.titulo_singular !== undefined) {
        this.contenidoEditable[`clausula_${index}_titulo_singular`] = clausula.titulo_singular;
      } else if (clausula.titulo !== undefined) {
        // Inicializar vacío si no existe
        this.contenidoEditable[`clausula_${index}_titulo_singular`] = '';
      }
      if (clausula.contenido !== undefined) {
        this.contenidoEditable[`clausula_${index}_contenido`] = clausula.contenido;
      }
      if (clausula.contenido_singular !== undefined) {
        this.contenidoEditable[`clausula_${index}_contenido_singular`] = clausula.contenido_singular;
      } else if (clausula.contenido !== undefined) {
        // Inicializar vacío si no existe
        this.contenidoEditable[`clausula_${index}_contenido_singular`] = '';
      }
    });
  }

  calcularFilas(texto: string): number {
    if (!texto) return 3;
    const lineas = texto.split('\n').length;
    return Math.max(3, Math.min(lineas + 2, 15));
  }

  formatearLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/singular/g, '(Singular)')
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  cambiarModoVista(modo: 'dual' | 'plural' | 'singular') {
    this.modoVista = modo;
  }

  cambiarModoEdicion(modo: 'estructurado' | 'json') {
    if (modo === 'json') {
      // Al cambiar a JSON directo, actualizar el JSON con los valores actuales
      this.actualizarJSON();
    } else {
      // Al cambiar a estructurado, validar y aplicar el JSON
      this.validarJSONDirecto();
    }
    this.modoEdicion = modo;
  }

  formatearJSON() {
    try {
      if (this.contenidoJSON.trim()) {
        const parsed = JSON.parse(this.contenidoJSON);
        this.contenidoJSON = JSON.stringify(parsed, null, 2);
        this.contenidoEditable = parsed; // Actualizar contenidoEditable
        this.errorJSON = '';
        
        Swal.fire({
          title: 'JSON Formateado',
          text: 'El JSON se ha formateado correctamente',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error: any) {
      this.errorJSON = 'JSON inválido: ' + error.message;
      Swal.fire({
        title: 'Error',
        text: 'El JSON no es válido: ' + error.message,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  copiarJSON() {
    navigator.clipboard.writeText(this.contenidoJSON).then(() => {
      Swal.fire({
        title: 'Copiado',
        text: 'JSON copiado al portapapeles',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  }

  validarJSONDirecto() {
    try {
      if (this.contenidoJSON.trim()) {
        const parsed = JSON.parse(this.contenidoJSON);
        this.contenidoEditable = parsed;
        this.errorJSON = '';
        
        // Re-analizar para actualizar campos editables si es necesario
        if (this.modoEdicion === 'estructurado') {
          this.analizarContenido();
        }
      }
    } catch (error: any) {
      this.errorJSON = 'JSON inválido: ' + error.message;
    }
  }

  actualizarJSON() {
    try {
      // Aplicar cambios de campos de cláusulas de vuelta al array
      if (this.contenidoEditable.clausulas && Array.isArray(this.contenidoEditable.clausulas)) {
        this.contenidoEditable.clausulas.forEach((clausula: any, index: number) => {
          const titulo = this.contenidoEditable[`clausula_${index}_titulo`];
          const tituloSingular = this.contenidoEditable[`clausula_${index}_titulo_singular`];
          const contenido = this.contenidoEditable[`clausula_${index}_contenido`];
          const contenidoSingular = this.contenidoEditable[`clausula_${index}_contenido_singular`];

          if (titulo !== undefined) clausula.titulo = titulo;
          if (tituloSingular !== undefined) clausula.titulo_singular = tituloSingular;
          if (contenido !== undefined) clausula.contenido = contenido;
          if (contenidoSingular !== undefined) clausula.contenido_singular = contenidoSingular;
        });
      }

      // Crear copia limpia sin las claves auxiliares de cláusulas
      const contenidoLimpio = JSON.parse(JSON.stringify(this.contenidoEditable));
      
      // Eliminar las claves auxiliares clausula_X_campo
      Object.keys(contenidoLimpio).forEach(key => {
        if (key.startsWith('clausula_')) {
          delete contenidoLimpio[key];
        }
      });

      this.contenidoJSON = JSON.stringify(contenidoLimpio, null, 2);
      this.errorJSON = '';
    } catch (error: any) {
      this.errorJSON = 'Error al generar JSON: ' + error.message;
    }
  }

  getNestedValue(path: string): any {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let value = this.contenidoEditable;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  validarJSON() {
    try {
      if (this.contenidoJSON.trim()) {
        const parsed = JSON.parse(this.contenidoJSON);
        this.contenidoEditable = parsed;
        this.errorJSON = '';
      }
    } catch (error: any) {
      this.errorJSON = 'JSON inválido: ' + error.message;
    }
  }

  guardarPlantilla() {
    this.submitted = true;

    // Actualizar JSON antes de guardar
    this.actualizarJSON();

    // Validar JSON
    if (this.errorJSON) {
      Swal.fire({
        title: 'Error',
        text: this.errorJSON,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Crear copia limpia del contenido sin campos auxiliares
    const contenidoLimpio = JSON.parse(JSON.stringify(this.contenidoEditable));
    
    // Eliminar las claves auxiliares clausula_X_campo
    Object.keys(contenidoLimpio).forEach(key => {
      if (key.startsWith('clausula_')) {
        delete contenidoLimpio[key];
      }
    });

    // Preparar modelo para enviar
    const plantillaParaGuardar: Plantilla = {
      id: this.model.id,
      id_tipo_plantilla: this.model.id_tipo_plantilla,
      clave: this.model.clave,
      titulo: this.model.titulo,
      contenido: contenidoLimpio
    };

    this.plantillasService.actualizar(plantillaParaGuardar).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Éxito',
          text: 'Plantilla actualizada correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.volver();
        });
      },
      error: (error: any) => {
        console.error("Error al actualizar plantilla", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la plantilla',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}