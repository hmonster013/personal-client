import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environments.local';
import { URI } from '../../shared/utils/URI';
import { Contact } from '../models/contact';

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  constructor(private http: HttpClient) { }

  create(contactData: Contact) {
    return this.http.post(`${environment.apiUrl}/${URI.V1}/${URI.CONTACTS}/${URI.CREATE}`, contactData);
  }
}
