import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class WebAuthnService {

  private endpoint = environment.api + 'webauthn';
  private endpointAuth = environment.api + 'auth/webauthn';

  constructor(private http: HttpClient) {}

  soportado(): boolean {
    return !!window.PublicKeyCredential;
  }

  verificarDisponibilidad(usuario: string): Observable<any> {
    const body = JSON.stringify({ usuario });
    return this.http.post<any>(`${this.endpoint}/disponible`, body, httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  registrar(dispositivo: string = ''): Observable<any> {
    if (!dispositivo) {
      dispositivo = this.detectarDispositivo();
    }

    return this.http.post<any>(`${this.endpoint}/registro/opciones`, {}, httpOptions).pipe(
      switchMap((opciones: any) => {
        return from(this.crearCredencial(opciones)).pipe(
          switchMap((credencial: any) => {
            const body = JSON.stringify({
              challengeId: opciones.challengeId,
              credentialId: credencial.credentialId,
              publicKey: credencial.publicKey,
              clientDataJSON: credencial.clientDataJSON,
              dispositivo: dispositivo
            });
            return this.http.post<any>(`${this.endpoint}/registro/verificar`, body, httpOptions);
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Autenticación CON tenant ya configurado (requiere usuario)
   */
  autenticar(usuario: string): Observable<any> {
    const body = JSON.stringify({ usuario });

    return this.http.post<any>(`${this.endpoint}/auth/opciones`, body, httpOptions).pipe(
      switchMap((opciones: any) => {
        if (!opciones.disponible) {
          return throwError(() => new Error('No hay credenciales biométricas registradas'));
        }
        return from(this.obtenerCredencial(opciones)).pipe(
          switchMap((assertion: any) => {
            const bodyVerificar = JSON.stringify({
              challengeId: opciones.challengeId,
              credentialId: assertion.credentialId,
              clientDataJSON: assertion.clientDataJSON,
              authenticatorData: assertion.authenticatorData,
              signature: assertion.signature
            });
            return this.http.post<any>(`${this.endpoint}/auth/verificar`, bodyVerificar, httpOptions);
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Login directo SIN usuario, SIN tenant (discoverable credentials)
   * El dispositivo muestra las passkeys guardadas, el usuario elige
   */
  loginDirecto(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Skip-Tenant': 'true'
    });

    return this.http.post<any>(`${this.endpointAuth}/opciones`, {}, { headers }).pipe(
      switchMap((opciones: any) => {
        return from(this.obtenerCredencial(opciones)).pipe(
          switchMap((assertion: any) => {
            const bodyVerificar = JSON.stringify({
              challengeId: opciones.challengeId,
              credentialId: assertion.credentialId,
              clientDataJSON: assertion.clientDataJSON,
              authenticatorData: assertion.authenticatorData,
              signature: assertion.signature
            });
            return this.http.post<any>(`${this.endpointAuth}/verificar`, bodyVerificar, { headers });
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  listarCredenciales(): Observable<any> {
    return this.http.get<any>(`${this.endpoint}/credenciales`, httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  eliminarCredencial(id: string): Observable<any> {
    return this.http.request<any>('delete', `${this.endpoint}/credenciales`, {
      body: JSON.stringify({ id }),
      headers: httpOptions.headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ================================================================
  // Métodos privados - Interacción con el navegador
  // ================================================================

  private async crearCredencial(opciones: any): Promise<any> {
    const publicKeyOptions = opciones.publicKey;

    const createOptions: PublicKeyCredentialCreationOptions = {
      rp: publicKeyOptions.rp,
      user: {
        id: this.base64urlToBuffer(publicKeyOptions.user.id),
        name: publicKeyOptions.user.name,
        displayName: publicKeyOptions.user.displayName
      },
      challenge: this.base64urlToBuffer(publicKeyOptions.challenge),
      pubKeyCredParams: publicKeyOptions.pubKeyCredParams,
      timeout: publicKeyOptions.timeout,
      excludeCredentials: (publicKeyOptions.excludeCredentials || []).map((cred: any) => ({
        id: this.base64urlToBuffer(cred.id),
        type: cred.type,
        transports: cred.transports
      })),
      authenticatorSelection: publicKeyOptions.authenticatorSelection,
      attestation: publicKeyOptions.attestation
    };

    const credential = await navigator.credentials.create({
      publicKey: createOptions
    }) as PublicKeyCredential;

    const response = credential.response as AuthenticatorAttestationResponse;

    const publicKeyBuffer = response.getPublicKey ? response.getPublicKey() : null;
    let publicKeyB64 = '';
    if (publicKeyBuffer) {
      publicKeyB64 = this.spkiToPem(publicKeyBuffer);
    }

    return {
      credentialId: this.bufferToBase64url(credential.rawId),
      publicKey: publicKeyB64,
      clientDataJSON: this.bufferToBase64url(response.clientDataJSON)
    };
  }

  private async obtenerCredencial(opciones: any): Promise<any> {
    const publicKeyOptions = opciones.publicKey;

    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge: this.base64urlToBuffer(publicKeyOptions.challenge),
      rpId: publicKeyOptions.rpId,
      allowCredentials: (publicKeyOptions.allowCredentials || []).map((cred: any) => ({
        id: this.base64urlToBuffer(cred.id),
        type: cred.type,
        transports: cred.transports
      })),
      userVerification: publicKeyOptions.userVerification,
      timeout: publicKeyOptions.timeout
    };

    const assertion = await navigator.credentials.get({
      publicKey: getOptions
    }) as PublicKeyCredential;

    const response = assertion.response as AuthenticatorAssertionResponse;

    return {
      credentialId: this.bufferToBase64url(assertion.rawId),
      clientDataJSON: this.bufferToBase64url(response.clientDataJSON),
      authenticatorData: this.bufferToBase64url(response.authenticatorData),
      signature: this.bufferToBase64url(response.signature)
    };
  }

  // ================================================================
  // Utilidades de conversión
  // ================================================================

  private base64urlToBuffer(base64url: string): ArrayBuffer {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private spkiToPem(spkiBuffer: ArrayBuffer): string {
    const b64 = this.arrayBufferToBase64(spkiBuffer);
    const lines = b64.match(/.{1,64}/g) || [];
    return '-----BEGIN PUBLIC KEY-----\n' + lines.join('\n') + '\n-----END PUBLIC KEY-----';
  }

  private detectarDispositivo(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return 'iPhone/iPad';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Dispositivo desconocido';
  }

  private handleError(error: any) {
    return throwError(() => error);
  }
}