import { Component, EventEmitter, Output } from '@angular/core';
import { AddFirma } from './add-firma/add-firma';
import { EditaFirma } from './edita-firma/edita-firma';
import { PrimengModule } from '@modulos/primeng/primeng-module';

@Component({
  selector: 'mgp-admin-firmas',
  imports: [
    AddFirma,
    EditaFirma,
    PrimengModule,
  ],
  templateUrl: './admin-firmas.html',
  styleUrl: './admin-firmas.scss'
})
export class AdminFirmas {
  tabActual: any = 0;
  @Output() cerrar: EventEmitter<void> = new EventEmitter<void>();
  cierraDialogo(): void {
    this.cerrar.emit();
  }
}
