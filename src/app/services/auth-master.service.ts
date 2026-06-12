import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthMasterService {

  private endpoint = environment.api + 'auth/pre-login';

  constructor(private http: HttpClient) { }

  preLogin(usuario: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Skip-Tenant': 'true'
    });
    
    return this.http.post<any>(this.endpoint, { usuario }, { headers });
  }
}