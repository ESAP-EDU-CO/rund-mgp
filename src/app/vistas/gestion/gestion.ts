import { Component } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Carga } from "./carga/carga";
import { Edicion } from "./edicion/edicion";

@Component({
  selector: 'mgp-gestion',
  imports: [
    PrimengModule,
    Carga,
    Edicion
  ],
  templateUrl: './gestion.html',
  styleUrl: './gestion.scss'
})
export class Gestion {

}
