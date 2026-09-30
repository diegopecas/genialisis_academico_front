import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

// CKEditor 5 se carga desde el CDN en index.html.
declare var ClassicEditor: any;

/**
 * Editor de texto enriquecido para las descripciones de las actividades.
 * Es el mismo CKEditor de crear actividad, con la misma barra, envuelto en
 * un componente para poder usarlo en cualquier formulario, incluso varias
 * veces en la misma pantalla (una por actividad generada).
 *
 * Uso: <app-editor-texto-enriquecido [(valor)]="act.descripcion"></app-editor-texto-enriquecido>
 */
@Component({
  selector: 'app-editor-texto-enriquecido',
  templateUrl: './editor-texto-enriquecido.component.html',
  styleUrls: ['./editor-texto-enriquecido.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class EditorTextoEnriquecidoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() valor: string = '';
  @Output() valorChange = new EventEmitter<string>();

  @Input() placeholder: string = 'Escribe la descripción...';
  @Input() soloLectura: boolean = false;
  /** Marca el borde en rojo, igual que un campo inválido. */
  @Input() invalido: boolean = false;

  @ViewChild('contenedor', { static: true }) contenedor!: ElementRef<HTMLDivElement>;

  private editor: any = null;
  private destruido = false;
  // Último HTML que salió del editor: evita reescribirlo cuando vuelve por el
  // [(valor)] y así no se pierde la posición del cursor.
  private ultimoEmitido: string | null = null;

  ngAfterViewInit(): void {
    this.crearEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) return;

    if (changes['valor'] && this.valor !== this.ultimoEmitido) {
      this.editor.setData(this.valor || '');
    }

    if (changes['soloLectura']) {
      this.aplicarSoloLectura();
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.editor) {
      this.editor.destroy().catch((error: any) =>
        console.error('Error destruyendo el editor de texto enriquecido:', error)
      );
      this.editor = null;
    }
  }

  private crearEditor(): void {
    if (this.destruido || this.editor) return;

    // El script del CDN puede tardar en cargar la primera vez
    if (typeof ClassicEditor === 'undefined') {
      setTimeout(() => this.crearEditor(), 500);
      return;
    }

    ClassicEditor
      .create(this.contenedor.nativeElement, {
        toolbar: {
          items: [
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'bulletedList', 'numberedList', '|',
            'outdent', 'indent', '|',
            'link', 'blockQuote', '|',
            'undo', 'redo'
          ]
        },
        language: 'es',
        placeholder: this.placeholder,
      })
      .then((editor: any) => {
        // Si la pantalla se cerró mientras cargaba, no se deja vivo
        if (this.destruido) {
          editor.destroy();
          return;
        }

        this.editor = editor;
        editor.setData(this.valor || '');
        this.aplicarSoloLectura();

        editor.model.document.on('change:data', () => {
          const html = editor.getData();
          this.ultimoEmitido = html;
          this.valorChange.emit(html);
        });
      })
      .catch((error: any) => {
        console.error('Error al crear el editor de texto enriquecido:', error);
      });
  }

  private aplicarSoloLectura(): void {
    if (!this.editor) return;
    if (this.soloLectura) {
      this.editor.enableReadOnlyMode('solo-lectura');
    } else {
      this.editor.disableReadOnlyMode('solo-lectura');
    }
  }
}
