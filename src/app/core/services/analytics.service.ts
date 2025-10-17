import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

declare var gtag: any;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  constructor(private router: Router) { }

  init() {
    this.trackRouteChanges();
  }

  private trackRouteChanges() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (typeof gtag !== 'undefined') {
        gtag('config', 'G-KLELNZVFP9', {
          page_path: event.urlAfterRedirects
        });
      }
    });
  }

  trackEvent(eventName: string, eventCategory: string, eventLabel?: string, eventValue?: number) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: eventCategory,
        event_label: eventLabel,
        value: eventValue
      });
    }
  }
}
