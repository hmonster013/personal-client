import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { URI } from 'src/app/shared/utils/URI';
import { environment } from 'src/environments/environments.local';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(
    private http: HttpClient
  ) { }

  getAllConfig() {
    return this.http.get(`${environment.apiUrl}/${URI.V1}/${URI.ALL_CONFIGS}`);
  }
}
