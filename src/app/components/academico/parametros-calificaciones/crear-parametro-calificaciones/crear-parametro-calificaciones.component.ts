import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Pipe, PipeTransform } from '@angular/core';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ParametrosCalificacionesService } from '../../../../services/parametros-calificaciones.service';
import { ValoresParametrosCalificacionesService } from '../../../../services/valores-parametros-calificaciones.service';

declare var bootstrap: any;

@Pipe({
  name: 'iconFilter',
  standalone: true
})
export class IconFilterPipe implements PipeTransform {
  transform(iconos: any[], buscar: string): any[] {
    if (!buscar) return iconos;
    const buscarLower = buscar.toLowerCase();
    return iconos.filter(icono => 
      icono.nombre.toLowerCase().includes(buscarLower) || 
      icono.clase.toLowerCase().includes(buscarLower)
    );
  }
}

@Component({
  selector: 'app-crear-parametro-calificaciones',
  templateUrl: './crear-parametro-calificaciones.component.html',
  styleUrl: './crear-parametro-calificaciones.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ReactiveFormsModule, FormsModule, IconFilterPipe]
})
export class CrearParametroCalificacionesComponent implements OnInit {

  titulo = "Crear Parámetro de Calificaciones";
  formParametro!: FormGroup;
  formValor!: FormGroup;
  modoEdicion = false;
  modoEdicionValor = false;
  idParametro: any = null;
  mostrarFormularioValor = false;
  valoresParametro: any[] = [];
  buscarIcono = '';
  private modalSelectorIcono: any;

  iconosDisponibles = [
    // Positivos y calificaciones
    { clase: 'fa-star', nombre: 'Estrella' },
    { clase: 'fa-heart', nombre: 'Corazón' },
    { clase: 'fa-trophy', nombre: 'Trofeo' },
    { clase: 'fa-medal', nombre: 'Medalla' },
    { clase: 'fa-crown', nombre: 'Corona' },
    { clase: 'fa-award', nombre: 'Premio' },
    { clase: 'fa-certificate', nombre: 'Certificado' },
    { clase: 'fa-gem', nombre: 'Gema' },
    { clase: 'fa-flag', nombre: 'Bandera' },
    { clase: 'fa-thumbs-up', nombre: 'Pulgar arriba' },
    { clase: 'fa-check', nombre: 'Verificar' },
    { clase: 'fa-check-circle', nombre: 'Check círculo' },
    { clase: 'fa-check-square', nombre: 'Check cuadrado' },
    { clase: 'fa-check-double', nombre: 'Check doble' },
    
    // Negativos y tristes
    { clase: 'fa-thumbs-down', nombre: 'Pulgar abajo' },
    { clase: 'fa-times', nombre: 'X' },
    { clase: 'fa-times-circle', nombre: 'X círculo' },
    { clase: 'fa-ban', nombre: 'Prohibido' },
    { clase: 'fa-exclamation-triangle', nombre: 'Advertencia' },
    { clase: 'fa-exclamation-circle', nombre: 'Exclamación' },
    { clase: 'fa-skull', nombre: 'Calavera' },
    { clase: 'fa-skull-crossbones', nombre: 'Calavera cruzada' },
    { clase: 'fa-frown', nombre: 'Triste' },
    { clase: 'fa-sad-tear', nombre: 'Lágrima triste' },
    { clase: 'fa-sad-cry', nombre: 'Llorando' },
    { clase: 'fa-angry', nombre: 'Enojado' },
    { clase: 'fa-dizzy', nombre: 'Mareado' },
    { clase: 'fa-tired', nombre: 'Cansado' },
    { clase: 'fa-frown-open', nombre: 'Muy triste' },
    { clase: 'fa-meh', nombre: 'Indiferente' },
    { clase: 'fa-meh-blank', nombre: 'Neutral' },
    { clase: 'fa-meh-rolling-eyes', nombre: 'Ojos en blanco' },
    { clase: 'fa-heartbeat', nombre: 'Latido débil' },
    { clase: 'fa-heart-broken', nombre: 'Corazón roto' },
    
    // Emociones neutras y positivas
    { clase: 'fa-smile', nombre: 'Sonrisa' },
    { clase: 'fa-smile-beam', nombre: 'Sonrisa radiante' },
    { clase: 'fa-grin', nombre: 'Gran sonrisa' },
    { clase: 'fa-grin-beam', nombre: 'Sonrisa enorme' },
    { clase: 'fa-grin-stars', nombre: 'Estrellas en ojos' },
    { clase: 'fa-grin-hearts', nombre: 'Enamorado' },
    { clase: 'fa-laugh', nombre: 'Risa' },
    { clase: 'fa-laugh-beam', nombre: 'Risa brillante' },
    { clase: 'fa-kiss', nombre: 'Beso' },
    { clase: 'fa-grin-wink', nombre: 'Guiño' },
    { clase: 'fa-surprise', nombre: 'Sorprendido' },
    
    // Símbolos y formas
    { clase: 'fa-circle', nombre: 'Círculo' },
    { clase: 'fa-square', nombre: 'Cuadrado' },
    { clase: 'fa-star-half-alt', nombre: 'Media estrella' },
    { clase: 'fa-bookmark', nombre: 'Marcador' },
    { clase: 'fa-plus-circle', nombre: 'Más' },
    { clase: 'fa-minus-circle', nombre: 'Menos' },
    { clase: 'fa-dot-circle', nombre: 'Punto' },
    { clase: 'fa-arrows-alt', nombre: 'Expandir' },
    
    // Flechas y direcciones
    { clase: 'fa-arrow-up', nombre: 'Flecha arriba' },
    { clase: 'fa-arrow-down', nombre: 'Flecha abajo' },
    { clase: 'fa-arrow-circle-up', nombre: 'Flecha círculo arriba' },
    { clase: 'fa-arrow-circle-down', nombre: 'Flecha círculo abajo' },
    { clase: 'fa-level-up-alt', nombre: 'Nivel arriba' },
    { clase: 'fa-level-down-alt', nombre: 'Nivel abajo' },
    { clase: 'fa-long-arrow-alt-up', nombre: 'Flecha larga arriba' },
    { clase: 'fa-long-arrow-alt-down', nombre: 'Flecha larga abajo' },
    
    // Naturaleza
    { clase: 'fa-sun', nombre: 'Sol' },
    { clase: 'fa-moon', nombre: 'Luna' },
    { clase: 'fa-cloud', nombre: 'Nube' },
    { clase: 'fa-cloud-rain', nombre: 'Lluvia' },
    { clase: 'fa-cloud-sun', nombre: 'Parcialmente nublado' },
    { clase: 'fa-bolt', nombre: 'Rayo' },
    { clase: 'fa-umbrella', nombre: 'Paraguas' },
    { clase: 'fa-snowflake', nombre: 'Copo de nieve' },
    { clase: 'fa-fire', nombre: 'Fuego' },
    { clase: 'fa-fire-alt', nombre: 'Llama' },
    { clase: 'fa-water', nombre: 'Agua' },
    { clase: 'fa-seedling', nombre: 'Planta' },
    { clase: 'fa-leaf', nombre: 'Hoja' },
    { clase: 'fa-tree', nombre: 'Árbol' },
    
    // Comida
    { clase: 'fa-apple-alt', nombre: 'Manzana' },
    { clase: 'fa-carrot', nombre: 'Zanahoria' },
    { clase: 'fa-lemon', nombre: 'Limón' },
    { clase: 'fa-candy-cane', nombre: 'Bastón de caramelo' },
    { clase: 'fa-ice-cream', nombre: 'Helado' },
    { clase: 'fa-cookie', nombre: 'Galleta' },
    { clase: 'fa-birthday-cake', nombre: 'Pastel' },
    
    // Animales
    { clase: 'fa-paw', nombre: 'Huella' },
    { clase: 'fa-dog', nombre: 'Perro' },
    { clase: 'fa-cat', nombre: 'Gato' },
    { clase: 'fa-fish', nombre: 'Pez' },
    { clase: 'fa-dove', nombre: 'Paloma' },
    { clase: 'fa-crow', nombre: 'Cuervo' },
    { clase: 'fa-spider', nombre: 'Araña' },
    { clase: 'fa-bug', nombre: 'Insecto' },
    { clase: 'fa-frog', nombre: 'Rana' },
    { clase: 'fa-horse', nombre: 'Caballo' },
    { clase: 'fa-dragon', nombre: 'Dragón' },
    
    // Educación y trabajo
    { clase: 'fa-graduation-cap', nombre: 'Graduación' },
    { clase: 'fa-book', nombre: 'Libro' },
    { clase: 'fa-book-open', nombre: 'Libro abierto' },
    { clase: 'fa-pencil-alt', nombre: 'Lápiz' },
    { clase: 'fa-pen', nombre: 'Pluma' },
    { clase: 'fa-highlighter', nombre: 'Resaltador' },
    { clase: 'fa-eraser', nombre: 'Borrador' },
    { clase: 'fa-lightbulb', nombre: 'Bombilla' },
    { clase: 'fa-brain', nombre: 'Cerebro' },
    { clase: 'fa-user-graduate', nombre: 'Graduado' },
    { clase: 'fa-chalkboard-teacher', nombre: 'Profesor' },
    { clase: 'fa-glasses', nombre: 'Lentes' },
    
    // Música y arte
    { clase: 'fa-music', nombre: 'Música' },
    { clase: 'fa-drum', nombre: 'Tambor' },
    { clase: 'fa-guitar', nombre: 'Guitarra' },
    { clase: 'fa-microphone', nombre: 'Micrófono' },
    { clase: 'fa-palette', nombre: 'Paleta' },
    { clase: 'fa-paint-brush', nombre: 'Pincel' },
    { clase: 'fa-camera', nombre: 'Cámara' },
    { clase: 'fa-film', nombre: 'Película' },
    
    // Deportes
    { clase: 'fa-football-ball', nombre: 'Fútbol' },
    { clase: 'fa-basketball-ball', nombre: 'Baloncesto' },
    { clase: 'fa-baseball-ball', nombre: 'Béisbol' },
    { clase: 'fa-volleyball-ball', nombre: 'Voleibol' },
    { clase: 'fa-running', nombre: 'Corriendo' },
    { clase: 'fa-swimmer', nombre: 'Nadador' },
    { clase: 'fa-bicycle', nombre: 'Bicicleta' },
    { clase: 'fa-dumbbell', nombre: 'Pesa' },
    
    // Tecnología
    { clase: 'fa-rocket', nombre: 'Cohete' },
    { clase: 'fa-robot', nombre: 'Robot' },
    { clase: 'fa-laptop', nombre: 'Laptop' },
    { clase: 'fa-mobile-alt', nombre: 'Móvil' },
    { clase: 'fa-gamepad', nombre: 'Videojuego' },
    { clase: 'fa-wifi', nombre: 'Wifi' },
    { clase: 'fa-satellite', nombre: 'Satélite' },
    
    // Varios
    { clase: 'fa-chart-line', nombre: 'Gráfico ascendente' },
    { clase: 'fa-chart-bar', nombre: 'Gráfico barras' },
    { clase: 'fa-chart-pie', nombre: 'Gráfico circular' },
    { clase: 'fa-percentage', nombre: 'Porcentaje' },
    { clase: 'fa-infinity', nombre: 'Infinito' },
    { clase: 'fa-battery-full', nombre: 'Batería llena' },
    { clase: 'fa-battery-half', nombre: 'Batería media' },
    { clase: 'fa-battery-quarter', nombre: 'Batería baja' },
    { clase: 'fa-battery-empty', nombre: 'Batería vacía' },
    { clase: 'fa-hourglass-start', nombre: 'Reloj inicio' },
    { clase: 'fa-hourglass-half', nombre: 'Reloj medio' },
    { clase: 'fa-hourglass-end', nombre: 'Reloj fin' },
    { clase: 'fa-info-circle', nombre: 'Información' },
    { clase: 'fa-question-circle', nombre: 'Pregunta' },
    { clase: 'fa-bell', nombre: 'Campana' },
    { clase: 'fa-comment', nombre: 'Comentario' },
    { clase: 'fa-comments', nombre: 'Comentarios' },
    { clase: 'fa-envelope', nombre: 'Sobre' },
    { clase: 'fa-gift', nombre: 'Regalo' },
    { clase: 'fa-birthday-cake', nombre: 'Cumpleaños' },
    { clase: 'fa-hands-helping', nombre: 'Ayuda' },
    { clase: 'fa-handshake', nombre: 'Apretón de manos' },
    { clase: 'fa-praying-hands', nombre: 'Manos rezando' }
  ];

  constructor(
    private fb: FormBuilder,
    private parametrosService: ParametrosCalificacionesService,
    private valoresService: ValoresParametrosCalificacionesService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.inicializarFormValor();
    this.verificarModoEdicion();
  }

  inicializarFormulario() {
    this.formParametro = this.fb.group({
      id: [null],
      nombre: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  inicializarFormValor() {
    this.formValor = this.fb.group({
      id: [null],
      id_parametros_calificaciones: [null],
      valor_cuantitativo: [null, [Validators.required]],
      valor_cualitativo: ['', [Validators.required]],
      icono: ['']
    });
  }

  verificarModoEdicion() {
    this.route.params.subscribe(params => {
      const accion = params['accion'];
      const id = params['id'];
      
      if (accion === 'editar' && id && id !== '0') {
        this.modoEdicion = true;
        this.idParametro = id;
        this.titulo = "Editar Parámetro de Calificaciones";
        this.cargarParametro();
        this.cargarValores();
      } else {
        this.modoEdicion = false;
        this.titulo = "Crear Parámetro de Calificaciones";
      }
    });
  }

  cargarParametro() {
    this.parametrosService.obtenerById(this.idParametro).subscribe({
      next: (response: any) => {
        const parametro = response.body;
        this.formParametro.patchValue(parametro);
        this.formValor.patchValue({
          id_parametros_calificaciones: parametro.id
        });
      },
      error: (error: any) => {
        console.error("Error al cargar parámetro", error);
        Swal.fire('Error', 'No se pudo cargar el parámetro', 'error');
        this.router.navigate(['/academico/parametros-calificaciones']);
      }
    });
  }

  cargarValores() {
    this.valoresService.obtenerPorParametro(this.idParametro).subscribe({
      next: (response: any) => {
        this.valoresParametro = (response.body as any[])
          .sort((a, b) => a.valor_cuantitativo - b.valor_cuantitativo);
      },
      error: (error: any) => {
        console.error("Error al cargar valores", error);
        this.valoresParametro = [];
      }
    });
  }

  guardar() {
    if (this.formParametro.valid) {
      const parametro = this.formParametro.value;

      if (this.modoEdicion) {
        this.parametrosService.actualizar(parametro).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Actualizado',
              text: 'El parámetro ha sido actualizado exitosamente',
              timer: 1500,
              showConfirmButton: false
            });
            this.router.navigate(['/academico/parametros-calificaciones']);
          },
          error: (error: any) => {
            console.error("Error al actualizar parámetro", error);
            Swal.fire('Error', 'No se pudo actualizar el parámetro', 'error');
          }
        });
      } else {
        this.parametrosService.crear(parametro).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Creado',
              text: 'El parámetro ha sido creado exitosamente',
              timer: 1500,
              showConfirmButton: false
            });
            this.router.navigate(['/academico/parametros-calificaciones']);
          },
          error: (error: any) => {
            console.error("Error al crear parámetro", error);
            Swal.fire('Error', 'No se pudo crear el parámetro', 'error');
          }
        });
      }
    }
  }

  abrirSelectorIcono() {
    this.buscarIcono = '';
    const modalElement = document.getElementById('modalSelectorIcono');
    if (modalElement) {
      this.modalSelectorIcono = new bootstrap.Modal(modalElement);
      this.modalSelectorIcono.show();
    }
  }

  seleccionarIcono(claseIcono: string) {
    this.formValor.patchValue({ icono: claseIcono });
    if (this.modalSelectorIcono) {
      this.modalSelectorIcono.hide();
    }
  }

  guardarValor() {
    if (this.formValor.valid) {
      const valor = this.formValor.value;
      
      if (this.modoEdicionValor) {
        this.valoresService.actualizar(valor).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Actualizado',
              text: 'El valor ha sido actualizado exitosamente',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarValores();
            this.cancelarEdicionValor();
          },
          error: (error: any) => {
            console.error("Error al actualizar valor", error);
            Swal.fire('Error', 'No se pudo actualizar el valor', 'error');
          }
        });
      } else {
        this.valoresService.crear(valor).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Creado',
              text: 'El valor ha sido creado exitosamente',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarValores();
            this.limpiarFormValor();
          },
          error: (error: any) => {
            console.error("Error al crear valor", error);
            Swal.fire('Error', 'No se pudo crear el valor', 'error');
          }
        });
      }
    }
  }

  editarValor(valor: any) {
    this.modoEdicionValor = true;
    this.mostrarFormularioValor = true;
    this.formValor.patchValue(valor);
  }

  cancelarEdicionValor() {
    this.modoEdicionValor = false;
    this.limpiarFormValor();
  }

  limpiarFormValor() {
    this.formValor.patchValue({
      id: null,
      valor_cuantitativo: null,
      valor_cualitativo: '',
      icono: ''
    });
  }

  async eliminarValor(valor: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el valor ${valor.valor_cualitativo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.valoresService.eliminar({ id: valor.id }).subscribe({
        next: (response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'El valor ha sido eliminado',
            timer: 1500,
            showConfirmButton: false
          });
          this.cargarValores();
        },
        error: (error: any) => {
          console.error("Error al eliminar valor", error);
          Swal.fire('Error', 'No se pudo eliminar el valor', 'error');
        }
      });
    }
  }

  cancelar() {
    this.router.navigate(['/academico/parametros-calificaciones']);
  }
}