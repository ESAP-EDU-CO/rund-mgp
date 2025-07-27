import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faFilePdf, faFileWord, faFileExcel, faFilePowerpoint, faFile } from '@fortawesome/free-solid-svg-icons';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  exports: [
    FontAwesomeModule
  ]
})
export class IconsModule {
  constructor(library: FaIconLibrary) {
    library.addIcons(
      faFilePdf,
      faFileWord,
      faFileExcel,
      faFilePowerpoint,
      faFile,
    );
  }
}