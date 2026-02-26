import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ConfigService } from './config.service';
import { getEndpointUrl } from './api-config';
import { DataCategoria, CategoriaBase, DataTabla, Anivel } from './data-types';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  public dataCategorias: DataCategoria[] | undefined;
  public categorias: CategoriaBase[] = [];
  public labels: Record<string, string> = {};

  private readonly aNivel: Anivel[] = [
    { label: 'Direcciones territoriales', superLabel: 'Distribución territorial' }
  ];

  private getUrl(endpointKey: string): string {
    return getEndpointUrl(endpointKey, this.configService.getApiBaseUrl());
  }

  getCategorias(): Observable<DataCategoria[]> {
    return this.http.get<{ arbol: DataCategoria[] }>(this.getUrl('categorias')).pipe(
      map((response: any) => response.arbol || response),
      catchError(error => throwError(() => error))
    );
  }

  getCruce(uuids: string[]): Observable<DataTabla> {
    const [x, y] = uuids;
    const url = this.getUrl('cruce') + `/${x}/${y}`;
    return this.http.get<{ cruce: DataTabla }>(url).pipe(
      map((response: any) => response.cruce || response),
      catchError(error => throwError(() => error))
    );
  }

  setCategorias(resp: DataCategoria[]): DataCategoria[] {
    resp.forEach((supercat: DataCategoria) => {
      supercat.children?.forEach((cat: DataCategoria) => {
        const ajusteAnivel: Anivel | undefined = this.aNivel.find((nivel: Anivel) => nivel.label === cat.label);
        if (ajusteAnivel) {
          cat.label = ajusteAnivel.superLabel;
          const ghostNodo: DataCategoria[] = [{
            label: ajusteAnivel.label,
            children: JSON.parse(JSON.stringify(cat.children)),
            key: cat.key + '-0',
            uuid: cat.uuid,
            numDocs: cat.numDocs,
            path: cat.path,
          }];
          ghostNodo[0].children?.forEach((subnodo: DataCategoria, numSubNodo: number) => subnodo.key = ghostNodo[0].key + '-' + numSubNodo);
          cat.children = ghostNodo;
        }
      });
    });
    this.dataCategorias = resp;
    return resp;
  }
}
