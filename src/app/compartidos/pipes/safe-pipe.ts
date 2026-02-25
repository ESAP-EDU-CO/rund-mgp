import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeStyle, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safe',
  // eslint-disable-next-line @angular-eslint/prefer-standalone
  standalone: false
})
export class SafePipe implements PipeTransform {
  protected sanitizer: DomSanitizer = inject(DomSanitizer);
  public transform(value: any, type: string): SafeHtml | SafeStyle | SafeUrl | SafeResourceUrl {
    switch (type) {
      case 'html': return this.sanitizer.bypassSecurityTrustHtml(value);
      case 'style': return this.sanitizer.bypassSecurityTrustStyle(value);
      case 'url': return this.sanitizer.bypassSecurityTrustUrl(value);
      case 'resourceUrl': return this.sanitizer.bypassSecurityTrustResourceUrl(value);
      default: throw new Error(`Tipo de sanitización no permitido: ${type}`);
    }
  }
}
