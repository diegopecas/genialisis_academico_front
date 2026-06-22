import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { ConfiguracionGlobalService } from '../../../../../services/configuracion-global.service';

@Component({
  selector: 'app-editar-configuracion-global',
  templateUrl: './editar-configuracion-global.component.html',
  styleUrl: './editar-configuracion-global.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class EditarConfiguracionGlobalComponent implements OnInit {

  titulo = "Editar Configuración Global";
  accion = "editar";
  regresar = "/administracion/configuracion/configuracion-global";
  editable = true;
  submitted = false;

  model = {
    id: 0,
    clave: '',
    valor_texto: null as string | null,
    valor_numero: null as number | null,
    valor_fecha: null as string | null,
    descripcion: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private configuracionService: ConfiguracionGlobalService,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'consultar') {
        this.editable = false;
      }

      if (id) {
        this.cargarConfiguracion(id);
      }
    });
  }

  cargarConfiguracion(id: string) {
    this.configuracionService.obtenerById(id).subscribe((response: any) => {
      const config = response.body[0];
      console.log("Configuración cargada", config);
      
      this.model = {
        id: config.id,
        clave: config.clave,
        valor_texto: config.valor_texto,
        valor_numero: config.valor_numero,
        valor_fecha: config.valor_fecha,
        descripcion: config.descripcion
      };

      // Actualizar el título con el nombre del parámetro
      if (this.accion === 'consultar') {
        this.titulo = `Consultar: ${config.clave}`;
      } else {
        this.titulo = `Editar: ${config.clave}`;
      }
    });
  }

  limpiarOtrosValores(tipoActual: string) {
    // Solo permite un tipo de valor a la vez
    if (tipoActual === 'texto') {
      if (this.model.valor_texto) {
        this.model.valor_numero = null;
        this.model.valor_fecha = null;
      }
    } else if (tipoActual === 'numero') {
      if (this.model.valor_numero !== null && this.model.valor_numero !== undefined) {
        this.model.valor_texto = null;
        this.model.valor_fecha = null;
      }
    } else if (tipoActual === 'fecha') {
      if (this.model.valor_fecha) {
        this.model.valor_texto = null;
        this.model.valor_numero = null;
      }
    }
  }

  guardarConfiguracion() {
    this.submitted = true;

    // Validar que al menos un valor esté presente
    if (!this.model.valor_texto && 
        this.model.valor_numero === null && 
        !this.model.valor_fecha) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe ingresar al menos un valor (texto, número o fecha)',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.configuracionService.actualizar(this.model).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Éxito',
          text: 'Configuración actualizada correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.volver();
        });
      },
      error: (error: any) => {
        console.error("Error al actualizar configuración", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la configuración',
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