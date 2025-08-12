import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environments';
import { URI } from '../../shared/utils/URI';

@Injectable({
  providedIn: 'root'
})
export class SkillsService {

  constructor(private http: HttpClient) { }

  list(formData: any) {
    const params = new HttpParams({ fromObject: formData });
    return this.http.get(`${environment.apiUrl}/${URI.V1}/${URI.SKILLS}/${URI.LIST}`, { params });
  }
}
