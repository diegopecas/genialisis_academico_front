import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { GiniService } from '../../../services/gini.service';

@Component({
  selector: 'app-gini-ingles',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './gini-ingles.component.html',
  styleUrl: './gini-ingles.component.scss'
})
export class GiniInglesComponent implements OnInit, OnDestroy {

  titulo = 'Gini - Inglés';
  nombreGrupo = '';
  modo: 'es-en' | 'en-es' = 'es-en';

  estado: 'inactivo' | 'conectando' | 'escuchando' | 'pensando' | 'hablando' | 'celebrando' | 'error' = 'inactivo';
  estadoFace = 'idle';
  mensajeEstado = 'Lista para comenzar';
  estadoBtn = 'start';
  textoBtn = '🎙️ Iniciar';

  bubbleEs = false;
  bubbleEn = false;
  textoEs = '';
  textoEn = '';

  toastVisible = false;
  toastMsg = '';
  volumen = 1;

  microfonos: MediaDeviceInfo[] = [];
  parlantes: MediaDeviceInfo[] = [];
  microfonoSeleccionado = '';
  parlanteSeleccionado = '';
  mostrarDispositivos = false;
  soportaSinkId = false;

  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private streamLocal: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  isActive = false;
  private connectionTimeout: any = null;
  private inputTranscript = '';
  private outputTranscript = '';

  constructor(private route: ActivatedRoute, private giniService: GiniService) {
    this.nombreGrupo = this.route.snapshot.queryParamMap.get('grupo') || `Grupo ${this.route.snapshot.paramMap.get('idGrupo')}`;
  }

  async ngOnInit() {
    this.soportaSinkId = 'setSinkId' in HTMLAudioElement.prototype;
    await this.cargarDispositivos();
    navigator.mediaDevices.addEventListener('devicechange', () => this.cargarDispositivos());
  }

  async cargarDispositivos() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.microfonos = devices.filter(d => d.kind === 'audioinput');
      this.parlantes = devices.filter(d => d.kind === 'audiooutput');
      if (!this.microfonoSeleccionado && this.microfonos.length) this.microfonoSeleccionado = this.microfonos[0].deviceId;
      if (!this.parlanteSeleccionado && this.parlantes.length) this.parlanteSeleccionado = this.parlantes[0].deviceId;
    } catch (_) {}
  }

  async aplicarParlante() {
    if (this.audioEl && this.soportaSinkId && this.parlanteSeleccionado) {
      try { await (this.audioEl as any).setSinkId(this.parlanteSeleccionado); } catch (_) {}
    }
  }

  setModo(m: 'es-en' | 'en-es') { this.modo = m; }

  toggleSesion() {
    if (this.isActive) { this.detener(); } else { this.iniciar(); }
  }

  async iniciar() {
    try {
      this.setAvatarState('pensando');
      this.textoBtn = '⏳ Conectando...';
      this.estadoBtn = 'stop';

      const sesion = await this.giniService.generarSesion(this.modo).toPromise();
      const ephemeralKey = sesion?.value || sesion?.client_secret?.value || sesion?.client_secret;
      if (!ephemeralKey) throw new Error('No se recibió token de sesión');

      const audioConstraints: MediaStreamConstraints = {
        audio: this.microfonoSeleccionado ? { deviceId: { exact: this.microfonoSeleccionado } } : true
      };
      this.streamLocal = await navigator.mediaDevices.getUserMedia(audioConstraints);

      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      this.audioEl = document.getElementById('giniAudio') as HTMLAudioElement;
      this.audioEl.volume = this.volumen;

      this.pc.ontrack = async (e) => {
        this.audioEl!.srcObject = e.streams[0];
        await this.aplicarParlante();
        this.audioEl!.play().catch(() => {});
      };

      this.streamLocal.getTracks().forEach(t => this.pc!.addTrack(t, this.streamLocal!));

      this.dc = this.pc.createDataChannel('oai-events');
      this.dc.onopen = () => this.onDcOpen();
      this.dc.onmessage = (e) => this.onDcMessage(e);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' }
      });

      if (!sdpRes.ok) throw new Error('SDP error ' + sdpRes.status);

      const answerSdp = await sdpRes.text();
      await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      this.connectionTimeout = setTimeout(() => {
        if (!this.isActive) { this.showToast('⚠️ Tiempo de conexión agotado'); this.detener(); }
      }, 15000);

    } catch (err: any) {
      this.showToast('❌ ' + (err?.message || 'Error de conexión'));
      this.detener();
    }
  }

  private onDcOpen() {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    this.dc?.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'realtime',
        output_modalities: ['audio'],
        audio: {
          output: { voice: 'shimmer' },
          input: {
            transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600 }
          }
        }
      }
    }));
    this.setAvatarState('escuchando');
    this.textoBtn = '⏹️ Detener';
    this.estadoBtn = 'stop';
    this.isActive = true;
  }

  private onDcMessage(e: MessageEvent) {
    let event: any;
    try { event = JSON.parse(e.data); } catch { return; }

    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.setAvatarState('escuchando');
        this.hideBubbles();
        this.inputTranscript = '';
        this.outputTranscript = '';
        break;
      case 'input_audio_buffer.speech_stopped':
        this.setAvatarState('pensando');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.inputTranscript = event.transcript || '';
        if (this.inputTranscript) this.showBubble(this.modo === 'es-en' ? 'es' : 'en', this.inputTranscript);
        break;
      case 'response.audio_transcript.delta':
        this.outputTranscript += event.delta || '';
        break;
      case 'response.audio.started':
      case 'output_audio_buffer.started':
        this.setAvatarState('hablando');
        break;
      case 'response.audio_transcript.done':
        this.outputTranscript = event.transcript || this.outputTranscript;
        if (this.outputTranscript) this.showBubble(this.modo === 'es-en' ? 'en' : 'es', this.outputTranscript);
        break;
      case 'response.done':
        this.setAvatarState('escuchando');
        const lower = this.outputTranscript.toLowerCase();
        const celebWords = ['great','excellent','wonderful','amazing','bravo','muy bien','excelente','perfecto','genial','fantástico'];
        if (celebWords.some(w => lower.includes(w))) {
          this.setAvatarState('celebrando');
          this.launchConfetti();
          setTimeout(() => this.setAvatarState('escuchando'), 2000);
        }
        this.outputTranscript = '';
        break;
      case 'error':
        this.showToast('Error: ' + (event.error?.message || 'desconocido'));
        break;
    }
  }

  detener() {
    this.isActive = false;
    if (this.connectionTimeout) { clearTimeout(this.connectionTimeout); this.connectionTimeout = null; }
    this.dc?.close();
    this.pc?.close();
    this.streamLocal?.getTracks().forEach(t => t.stop());
    if (this.audioEl) { this.audioEl.srcObject = null; }
    this.dc = null; this.pc = null; this.streamLocal = null; this.audioEl = null;
    this.setAvatarState('inactivo');
    this.hideBubbles();
    this.textoBtn = '🎙️ Iniciar';
    this.estadoBtn = 'start';
  }

  cambiarVolumen(event: any) {
    this.volumen = parseFloat(event.target.value);
    if (this.audioEl) this.audioEl.volume = this.volumen;
  }

  private setAvatarState(state: string) {
    this.estado = state as any;
    const faceMap: any = {
      inactivo: 'idle', conectando: 'thinking', escuchando: 'listening',
      pensando: 'thinking', hablando: 'speaking', celebrando: 'celebrating', error: 'idle'
    };
    this.estadoFace = faceMap[state] || 'idle';
    const texts: any = {
      inactivo: 'Lista para comenzar', conectando: '⚡ Conectando...',
      escuchando: '👂 Escuchando...', pensando: '💭 Traduciendo...',
      hablando: '🗣️ Hablando en inglés', celebrando: '🎉 ¡Muy bien!', error: 'Error de conexión'
    };
    this.mensajeEstado = texts[state] || state;
  }

  private showBubble(tipo: 'es' | 'en', texto: string) {
    if (tipo === 'es') { this.textoEs = '🇨🇴 ' + texto; this.bubbleEs = true; }
    else { this.textoEn = '🇺🇸 ' + texto; this.bubbleEn = true; }
  }

  private hideBubbles() { this.bubbleEs = false; this.bubbleEn = false; }

  showToast(msg: string) {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 3500);
  }

  private launchConfetti() {
    const container = document.getElementById('confettiGini');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = '';
    const colors = ['#FF6B9D','#FFD700','#00BCD4','#9B59B6','#2ed573','#FF8C42'];
    const shapes = ['■','●','▲','★'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      piece.style.cssText = `left:${Math.random()*100}%;color:${colors[Math.floor(Math.random()*colors.length)]};font-size:${8+Math.random()*12}px;animation-delay:${Math.random()*0.5}s;animation-duration:${1.5+Math.random()}s;`;
      container.appendChild(piece);
    }
    setTimeout(() => { container.style.display = 'none'; }, 2500);
  }

  ngOnDestroy() { this.detener(); }
}