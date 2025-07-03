import { NgModule } from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { SafePipe } from '@pipes/safe-pipe';

@NgModule({
  declarations: [
    SafePipe,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    SafePipe,
    JsonPipe,
    DatePipe,
    AsyncPipe
  ]
})
export class PipesModule { }
