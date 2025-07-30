import { Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-safe-html-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="safe-html-content"
      [innerHTML]="sanitizedHtml"
      [ngClass]="cssClass">
    </div>
  `,
  styleUrl: './safe-html-display.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SafeHtmlDisplayComponent implements OnChanges {
  @Input() htmlContent: string = '';
  @Input() cssClass: string = '';
  @Input() maxLength: number = 0; // 0 means no limit
  @Input() addHeadingIds: boolean = false; // New input to enable heading ID generation

  sanitizedHtml: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['htmlContent'] || changes['addHeadingIds']) {
      this.updateSanitizedHtml();
    }
  }

  private updateSanitizedHtml(): void {
    if (!this.htmlContent) {
      this.sanitizedHtml = '';
      return;
    }

    let processedHtml = this.htmlContent;

    // Add IDs to headings if enabled
    if (this.addHeadingIds) {
      processedHtml = this.addIdsToHeadings(processedHtml);
    }

    // Truncate if maxLength is specified
    if (this.maxLength > 0 && processedHtml.length > this.maxLength) {
      processedHtml = processedHtml.substring(0, this.maxLength) + '...';
    }

    // Simply sanitize HTML without cleaning
    this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
  }

  private addIdsToHeadings(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading, index) => {
      if (!heading.id) {
        // Generate ID from heading text or use index
        const text = heading.textContent || '';
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .trim() || `heading-${index}`;
        heading.id = id;
      }
    });

    return tempDiv.innerHTML;
  }
}
