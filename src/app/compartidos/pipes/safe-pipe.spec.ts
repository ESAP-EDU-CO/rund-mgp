import { TestBed } from '@angular/core/testing';
import { BrowserModule } from '@angular/platform-browser';
import { SafePipe } from './safe-pipe';

describe('SafePipe', () => {
  let pipe: SafePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BrowserModule],
      providers: [SafePipe],
    });
    pipe = TestBed.inject(SafePipe);
  });

  it('debe crear la instancia', () => {
    expect(pipe).toBeTruthy();
  });

  it('debe sanitizar HTML con tipo "html"', () => {
    const resultado = pipe.transform('<b>Texto seguro</b>', 'html');
    expect(resultado).toBeTruthy();
    expect(typeof resultado).not.toBe('string');
  });

  it('debe sanitizar URL con tipo "url"', () => {
    const resultado = pipe.transform('https://esap.edu.co', 'url');
    expect(resultado).toBeTruthy();
  });

  it('debe sanitizar resourceUrl con tipo "resourceUrl"', () => {
    const resultado = pipe.transform('https://esap.edu.co/embed', 'resourceUrl');
    expect(resultado).toBeTruthy();
  });

  it('debe sanitizar style con tipo "style"', () => {
    const resultado = pipe.transform('color: red', 'style');
    expect(resultado).toBeTruthy();
  });

  it('debe lanzar error para tipo desconocido', () => {
    expect(() => pipe.transform('valor', 'tipoInvalido')).toThrowError(
      'Tipo de sanitización no permitido: tipoInvalido'
    );
  });

  it('debe manejar cadena vacía sin errores para tipo "html"', () => {
    expect(() => pipe.transform('', 'html')).not.toThrow();
  });
});
