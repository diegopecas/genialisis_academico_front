import { Component, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() disabled: boolean = false;
  @Input() readOnly: boolean = false; // Nuevo parámetro para controlar si la firma es de solo lectura
  @Output() signatureChange = new EventEmitter<string>();
  
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private drawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  public isFullscreen: boolean = false;
  private tempSignature: string = '';
  
  ngAfterViewInit() {
    this.canvas = this.signatureCanvas.nativeElement;
    const context = this.canvas.getContext('2d');
    
    if (!context) {
      console.error('Failed to get canvas context');
      return;
    }
    
    this.ctx = context;
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Añadir eventos de mouse
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.onMouseUp.bind(this));
    
    // Añadir eventos de touch para móviles
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
  }
  
  // Escuchar eventos de teclado para salir del modo pantalla completa con ESC
  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
  }
  
  private resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    this.canvas.width = this.canvas.offsetWidth * ratio;
    this.canvas.height = this.canvas.offsetHeight * ratio;
    this.ctx.scale(ratio, ratio);
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#000000';
    
    // Si hay firma guardada, redibújala
    if (this.tempSignature) {
      this.internalFromDataURL(this.tempSignature);
    }
  }
  
  onMouseDown(event: MouseEvent) {
    if (this.disabled || this.readOnly || !this.canvas) return;
    
    this.drawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }
  
  onMouseMove(event: MouseEvent) {
    if (!this.drawing || this.disabled || this.readOnly || !this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    this.draw(this.lastX, this.lastY, currentX, currentY);
    this.lastX = currentX;
    this.lastY = currentY;
  }
  
  onMouseUp() {
    if (!this.drawing) return;
    
    this.drawing = false;
    this.tempSignature = this.toDataURL();
    this.signatureChange.emit(this.tempSignature);
  }
  
  onTouchStart(event: TouchEvent) {
    if (this.disabled || this.readOnly || !this.canvas) return;
    
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.lastX = touch.clientX - rect.left;
      this.lastY = touch.clientY - rect.top;
      this.drawing = true;
    }
  }
  
  onTouchMove(event: TouchEvent) {
    if (!this.drawing || this.disabled || this.readOnly || !this.canvas) return;
    
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;
      
      this.draw(this.lastX, this.lastY, currentX, currentY);
      this.lastX = currentX;
      this.lastY = currentY;
    }
  }
  
  onTouchEnd(event: TouchEvent) {
    if (!this.drawing) return;
    
    this.drawing = false;
    this.tempSignature = this.toDataURL();
    this.signatureChange.emit(this.tempSignature);
  }
  
  private draw(startX: number, startY: number, endX: number, endY: number) {
    if (!this.ctx) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }
  
  clear() {
    if (!this.ctx || !this.canvas || this.readOnly) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.tempSignature = '';
    this.signatureChange.emit('');
  }
  
  toDataURL(): string {
    if (!this.canvas) return '';
    
    return this.canvas.toDataURL('image/png');
  }
  
  fromDataURL(dataUrl: string) {
    this.tempSignature = dataUrl;
    this.internalFromDataURL(dataUrl);
  }
  
  private internalFromDataURL(dataUrl: string) {
    if (!dataUrl || !this.canvas || !this.ctx) return;
    
    const img = new Image();
    img.onload = () => {
      if (!this.ctx || !this.canvas) return;
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Calcular las dimensiones para mantener la proporción y ajustar al canvas
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;
      
      // Calcular la relación de aspecto de la imagen
      const imgRatio = img.width / img.height;
      
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      // Ajustar la imagen al canvas manteniendo la proporción
      // Reducimos un poco el tamaño para evitar recortes y añadimos más margen
      if (canvasWidth / canvasHeight > imgRatio) {
        // El canvas es más ancho que la imagen (proporcionalmente)
        drawHeight = canvasHeight * 0.85; // Reducimos al 85% para evitar recortes
        drawWidth = drawHeight * imgRatio;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = canvasHeight * 0.075; // 7.5% de margen arriba
      } else {
        // El canvas es más alto que la imagen (proporcionalmente)
        drawWidth = canvasWidth * 0.85; // Reducimos al 85% para evitar recortes
        drawHeight = drawWidth / imgRatio;
        offsetX = canvasWidth * 0.075; // 7.5% de margen a los lados
        offsetY = (canvasHeight - drawHeight) / 2;
      }
      
      // Dibujar la imagen centrada y ajustada
      this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
    img.src = dataUrl;
  }
  
  // Métodos para pantalla completa
  enterFullscreen() {
    if (this.disabled || this.readOnly) return;
    
    this.isFullscreen = true;
    // Necesitamos un timeout para permitir que el DOM se actualice
    setTimeout(() => {
      this.resizeCanvas();
      // Si hay una firma existente, mantenerla
      if (this.tempSignature) {
        this.internalFromDataURL(this.tempSignature);
      }
    }, 100);
  }
  
  exitFullscreen() {
    this.isFullscreen = false;
    // Necesitamos un timeout para permitir que el DOM se actualice
    setTimeout(() => {
      this.resizeCanvas();
      // Si hay una firma durante el modo pantalla completa, mantenerla
      if (this.tempSignature) {
        this.internalFromDataURL(this.tempSignature);
      }
    }, 100);
  }
  
  acceptFullscreenSignature() {
    // Mantener la firma actual y salir del modo pantalla completa
    this.exitFullscreen();
  }
}