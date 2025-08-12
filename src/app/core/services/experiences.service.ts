import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environments';
import { URI } from '../../shared/utils/URI';

@Injectable({
  providedIn: 'root'
})
export class ExperiencesService {

  constructor(private http: HttpClient) { }

  list(formData: any) {
    return this.http.get(`${environment.apiUrl}/${URI.V1}/${URI.EXPERIENCES}/${URI.LIST}`, formData);
  }
}
