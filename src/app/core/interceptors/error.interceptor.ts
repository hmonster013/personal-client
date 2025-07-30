import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { AuthenticationService } from "../services/authentication.service";
import { catchError, Observable, throwError } from "rxjs";
import { Injectable } from "@angular/core";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor (
    private authenticationService: AuthenticationService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
      return next.handle(req).pipe(catchError(err => {
        if ([401, 403].includes(err.status)) {
          this.authenticationService.logout();
        }

        const error = err.error.message || err.statusText;
        return throwError(() => error);
      }))
  }
}
