import { Component, Input } from '@angular/core';
import { Documento } from '@servicios/data';

@Component({
  selector: 'mgp-firma-certificado',
  imports: [],
  templateUrl: './firma-certificado.html',
  styleUrl: './firma-certificado.scss'
})
export class FirmaCertificado {
  @Input() firma: Documento.Firma | undefined;
}
