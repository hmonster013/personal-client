import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlogService } from '../../core/services/blog.service';
import { ToastService } from '../../core/services/toast.service';
import { ToastStatus } from '../../shared/utils/ToastStatus';
import { JCode } from '../../shared/utils/JCode';
import { CommonModule } from '@angular/common';
import { SkillUiComponent } from "../../shared/components/skill-ui/skill-ui.component";
import { SafeHtmlDisplayComponent } from '../../shared/components/safe-html-display/safe-html-display.component';
import { URI } from '../../shared/utils/URI';

@Component({
  selector: 'lib-blog-detail',
  imports: [
    CommonModule,
    SkillUiComponent,
    SafeHtmlDisplayComponent
],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.scss'
})
export class BlogDetailComponent implements OnInit {
  blogId: any;
  currentBlog: any;
  response: any;
  toc: { id: string; title: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private blogsService: BlogService,
    private toastService: ToastService,
    private router: Router
  ) {

  }

  ngOnInit(): void {
    this.blogId = this.route.snapshot.paramMap.get('id');
    this.getBlogData(this.blogId);
  }

  getBlogData(blogId: any) {
    this.blogsService.viewDataById(blogId).subscribe((res: any) => {
      this.response = res;
      if (this.response.status == JCode.SUCCESS) {
        this.currentBlog = this.response.data;
        this.generateTableOfContents();
    } else {
        this.toastService.show("Load blog error", ToastStatus.ERROR);
      }
    })
  }

  goToBlog() {
    this.router.navigate([URI.BLOGS]);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  getReadingTime(): number {
    if (!this.currentBlog?.content) return 0;
    const wordsPerMinute = 200;
    const textContent = this.currentBlog.content.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  scrollToSection(id: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Add offset to account for fixed headers or navigation
      const offset = 80; // Adjust this value based on your header height
      const elementPosition = element.offsetTop - offset;

      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  }

  shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(this.currentBlog.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  }

  shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.toastService.show("Link copied to clipboard!", ToastStatus.SUCCESS);
    }).catch(() => {
      this.toastService.show("Failed to copy link", ToastStatus.ERROR);
    });
  }

  private generateTableOfContents() {
    if (!this.currentBlog?.content) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.currentBlog.content;
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

    this.toc = Array.from(headings).map((heading, index) => {
      // Use the same ID generation logic as SafeHtmlDisplayComponent
      let id = heading.id;
      if (!id) {
        const text = heading.textContent || '';
        id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .trim() || `heading-${index}`;
      }

      return {
        id: id,
        title: heading.textContent || ''
      };
    });
  }
}
