import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { AuthenticationService } from "../services/authentication.service";
import { Observable } from "rxjs";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environments.local";

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor (
    private authenticationService: AuthenticationService
  ) {

  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const user = this.authenticationService.userValue;
    const token = user?.token;
    const isApiUrl = req.url.startsWith(environment.apiUrl);

    if (token && isApiUrl) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req);
  }
}
