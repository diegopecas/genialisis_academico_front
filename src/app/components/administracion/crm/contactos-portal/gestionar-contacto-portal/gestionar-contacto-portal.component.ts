import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { ContactosPortalService } from '../../../../../services/portal/contactos-portal.service';

@Component({
  selector: 'app-gestionar-contacto-portal',
  templateUrl: './gestionar-contacto-portal.component.html',
  styleUrl: './gestionar-contacto-portal.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class GestionarContactoPortalComponent implements OnInit {

  titulo = "Gestión de Contacto del Portal";
  accion = "";
  regresar = "/administracion/crm/contactos-portal";
  editable = false;

  public model = {
    id: 0,
    nombre_padre: '',
    email: '',
    telefono: '',
    edad_nino: null,
    mensaje: '',
    como_conocio_detalle: '',
    id_tipo_consulta: 0,
    tipo_consulta: '',
    id_como_conocio: 0,
    como_conocio: '',
    id_programa_interes: 0,
    programa_interes: '',
    id_estado: 0,
    estado: '',
    notas_internas: '',
    fecha_cita: '',
    cita_estado: '',
    created_at: '',
    updated_at: '',
    ip_address: '',
    user_agent: ''
  } as any;

  public catalogos = {
    estados_contacto: [],
    estados_cita: []
  } as any;

  submitted = false;

  constructor(
    private contactosPortalService: ContactosPortalService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Obtener la acción desde los parámetros de la ruta (:accion)
    this.accion = this.route.snapshot.paramMap.get('accion') || 'consultar';
    this.editable = this.accion === 'editar';
    
    if (this.editable) {
      this.titulo = "Editar Contacto del Portal";
    } else {
      this.titulo = "Detalle del Contacto";
    }

    this.obtenerCatalogos();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.obtenerContacto(parseInt(id));
    }
  }

  obtenerCatalogos() {
    this.contactosPortalService.obtenerCatalogos().subscribe({
      next: (response: any) => {
        this.catalogos = response.body;
        console.log("Catálogos obtenidos", this.catalogos);
      },
      error: (error: any) => {
        console.error("Error al obtener catálogos", error);
      }
    });
  }

  obtenerContacto(id: number) {
    this.contactosPortalService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        if (body && body.length > 0) {
          this.model = body[0];
          
          // Formatear fecha_cita para el input datetime-local
          if (this.model.fecha_cita) {
            const fecha = new Date(this.model.fecha_cita);
            this.model.fecha_cita = this.formatearFechaParaInput(fecha);
          }
          
          // Actualizar el título con el nombre del contacto
          if (this.editable) {
            this.titulo = `Editar Contacto: ${this.model.nombre_padre}`;
          } else {
            this.titulo = `Detalle del Contacto: ${this.model.nombre_padre}`;
          }
          
          console.log("Contacto obtenido", this.model);
        }
      },
      error: (error: any) => {
        console.error("Error al obtener contacto", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el contacto',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  async guardarContacto() {
    this.submitted = true;

    // Validación básica
    if (!this.model.id_estado) {
      Swal.fire({
        title: 'Error',
        text: 'Debe seleccionar un estado',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Preparar datos para enviar (solo campos editables)
    const datosActualizar = {
      id: this.model.id,
      id_estado: this.model.id_estado,
      notas_internas: this.model.notas_internas || null,
      fecha_cita: this.model.fecha_cita || null,
      cita_estado: this.model.cita_estado || null
    };

    this.contactosPortalService.actualizar(datosActualizar).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Éxito',
          text: 'Contacto actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.volver();
        });
      },
      error: (error: any) => {
        console.error("Error al actualizar contacto", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el contacto',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }

  formatearFechaParaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return fechaObj.toLocaleDateString('es-CO', opciones);
  }
}