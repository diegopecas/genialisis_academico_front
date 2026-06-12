import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AyudaModalService {

  private abiertoSubject = new BehaviorSubject<boolean>(false);
  abierto$ = this.abiertoSubject.asObservable();

  abrir(): void {
    this.abiertoSubject.next(true);
  }

  cerrar(): void {
    this.abiertoSubject.next(false);
  }

  toggle(): void {
    this.abiertoSubject.next(!this.abiertoSubject.value);
  }
}