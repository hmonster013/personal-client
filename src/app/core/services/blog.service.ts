import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environments';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { URI } from '../../shared/utils/URI';
import { BlogApiResponse, BlogSearchParams, Blog } from '../models/blog';

@Injectable({
  providedIn: 'root'
})
export class BlogService {

  constructor(private http: HttpClient) { }

  list(formData: any): Observable<BlogApiResponse> {
    return this.http.get<BlogApiResponse>(`${environment.apiUrl}/${URI.V1}/${URI.BLOGS}/${URI.LIST}`, { params: formData });
  }

  search(params: BlogSearchParams): Observable<BlogApiResponse> {
    // Convert BlogSearchParams to a plain object for HttpParams
    const searchParams: { [key: string]: string | number } = {};

    if (params.kw) searchParams['kw'] = params.kw;
    if (params.skills) searchParams['skills'] = params.skills;
    if (params.skill_ids) searchParams['skill_ids'] = params.skill_ids;
    if (params.page) searchParams['page'] = params.page;
    if (params.page_size) searchParams['page_size'] = params.page_size;

    return this.http.get<BlogApiResponse>(`${environment.apiUrl}/${URI.V1}/${URI.BLOGS}/${URI.SEARCH}`, {
      params: searchParams
    });
  }

  viewDataById(id: string): Observable<{ status: string; message: string; data: Blog }> {
    return this.http.get<{ status: string; message: string; data: Blog }>(`${environment.apiUrl}/${URI.V1}/${URI.BLOGS}/${URI.VIEW}/${id}`);
  }
}
