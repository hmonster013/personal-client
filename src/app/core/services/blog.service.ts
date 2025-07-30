import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environments.local';
import { HttpClient } from '@angular/common/http';
import { URI } from '../../shared/utils/URI';

@Injectable({
  providedIn: 'root'
})
export class BlogService {

  constructor(private http: HttpClient) { }

  list(formData: any) {
    return this.http.get(`${environment.apiUrl}/${URI.V1}/${URI.BLOGS}/${URI.LIST}`, formData);
  }

  viewDataById(id: string) {
    return this.http.get(`${environment.apiUrl}/${URI.V1}/${URI.BLOGS}/${URI.VIEW}/${id}`);
  }
}
