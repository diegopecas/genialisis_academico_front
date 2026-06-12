import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { GaleriasXGruposService } from '../../../../services/galerias-x-grupos.service';
import { GaleriasService } from '../../../../services/galerias.service';
import { GruposService } from '../../../../services/grupos.service';

@Component({
  selector: 'app-crear-galeria',
  templateUrl: './crear-galeria.component.html',
  styleUrl: './crear-galeria.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearGaleriaComponent implements OnInit {

  titulo = "Crear Galería";
  accion = "crear";
  regresar = "/operaciones/galerias";
  editable = true;
  submitted = false;

  model = {
    id: null as number | null,
    nombre: '',
    descripcion: '',
    thumbnail: '',
    fecha: '',
    es_publica: 1,
    activo: 1,
    orden: 0
  };

  grupos: any[] = [];
  gruposSeleccionados: number[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private galeriasService: GaleriasService,
    private gruposService: GruposService,
    private galeriasXGruposService: GaleriasXGruposService
  ) {
    this.model.fecha = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.cargarGrupos();
    
    const accion = this.route.snapshot.paramMap.get('accion');
    const id = this.route.snapshot.paramMap.get('id');
    
    if (accion === 'editar' && id && id !== '0') {
      this.accion = "editar";
      this.titulo = "Editar Galería"; // Título temporal mientras carga
      this.cargarGaleria(parseInt(id));
    } else if (accion === 'consultar' && id && id !== '0') {
      this.accion = "consultar";
      this.titulo = "Consultar Galería";
      this.editable = false;
      this.cargarGaleria(parseInt(id));
    }
  }

  cargarGrupos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = response.body || [];
      },
      error: (error) => {
        console.error("Error al cargar grupos:", error);
      }
    });
  }

  cargarGaleria(id: number) {
    this.galeriasService.obtenerById(id).subscribe({
      next: (response: any) => {
        const galeria = response.body;
        this.model = {
          id: galeria.id,
          nombre: galeria.nombre,
          descripcion: galeria.descripcion,
          thumbnail: galeria.thumbnail || '',
          fecha: galeria.fecha?.split('T')[0] || '',
          es_publica: galeria.es_publica,
          activo: galeria.activo,
          orden: galeria.orden || 0
        };
        
        // CORREGIDO: Actualizar título con el nombre de la galería
        if (this.accion === 'editar') {
          this.titulo = `Editar: ${galeria.nombre}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar: ${galeria.nombre}`;
        }
        
        // Cargar grupos asignados
        this.cargarGruposAsignados(id);
      },
      error: (error) => {
        console.error("Error al cargar galería:", error);
        Swal.fire('Error', 'No se pudo cargar la galería', 'error');
        this.volver();
      }
    });
  }

  cargarGruposAsignados(idGaleria: number) {
    this.galeriasXGruposService.obtenerPorGaleria(idGaleria).subscribe({
      next: (response: any) => {
        const grupos = response.body || [];
        this.gruposSeleccionados = grupos.map((g: any) => g.id_grupo);
      },
      error: (error) => {
        console.error("Error al cargar grupos asignados:", error);
      }
    });
  }

  toggleGrupo(idGrupo: number) {
    const index = this.gruposSeleccionados.indexOf(idGrupo);
    if (index > -1) {
      this.gruposSeleccionados.splice(index, 1);
    } else {
      this.gruposSeleccionados.push(idGrupo);
    }
  }

  isGrupoSeleccionado(idGrupo: number): boolean {
    return this.gruposSeleccionados.includes(idGrupo);
  }

  validarFormulario(): boolean {
    if (!this.model.nombre || !this.model.fecha) {
      Swal.fire('Error', 'El nombre y la fecha son obligatorios', 'error');
      return false;
    }

    if (this.model.es_publica === 0 && this.gruposSeleccionados.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un grupo para galerías privadas', 'error');
      return false;
    }

    return true;
  }

  guardar() {
    this.submitted = true;

    if (!this.validarFormulario()) {
      return;
    }

    const galeria = { ...this.model };

    if (this.accion === 'crear') {
      this.galeriasService.crear(galeria).subscribe({
        next: (response: any) => {
          const idGaleria = response.id;
          
          // Asignar grupos si es privada
          if (galeria.es_publica === 0 && this.gruposSeleccionados.length > 0) {
            this.asignarGrupos(idGaleria);
          } else {
            Swal.fire('Éxito', 'Galería creada correctamente', 'success');
            this.router.navigate(['/operaciones/galerias']);
          }
        },
        error: (error) => {
          console.error("Error al crear galería:", error);
          Swal.fire('Error', 'No se pudo crear la galería', 'error');
        }
      });
    } else {
      this.galeriasService.actualizar(galeria).subscribe({
        next: () => {
          // Asignar grupos si es privada
          if (galeria.es_publica === 0 && this.gruposSeleccionados.length > 0) {
            this.asignarGrupos(galeria.id!);
          } else {
            Swal.fire('Éxito', 'Galería actualizada correctamente', 'success');
            this.router.navigate(['/operaciones/galerias']);
          }
        },
        error: (error) => {
          console.error("Error al actualizar galería:", error);
          Swal.fire('Error', 'No se pudo actualizar la galería', 'error');
        }
      });
    }
  }

  asignarGrupos(idGaleria: number) {
    this.galeriasXGruposService.asignarGrupos(idGaleria, this.gruposSeleccionados).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Galería guardada y grupos asignados correctamente', 'success');
        this.router.navigate(['/operaciones/galerias']);
      },
      error: (error) => {
        console.error("Error al asignar grupos:", error);
        Swal.fire('Advertencia', 'Galería guardada pero hubo un error al asignar grupos', 'warning');
        this.router.navigate(['/operaciones/galerias']);
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }

  gestionarImagenes() {
    if (this.model.id) {
      this.router.navigate(['/operaciones/galerias/imagenes/' + this.model.id]);
    }
  }
}