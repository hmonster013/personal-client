import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SkillUiComponent } from "../skill-ui/skill-ui.component";
import { SafeHtmlDisplayComponent } from '../safe-html-display/safe-html-display.component';
import { Blog } from '../../../core/models/blog';

@Component({
  selector: 'lib-blog-card-ui',
  imports: [
    CommonModule,
    RouterModule,
    SkillUiComponent,
    SafeHtmlDisplayComponent
],
  templateUrl: './blog-card-ui.component.html',
  styleUrl: './blog-card-ui.component.scss'
})
export class BlogCardUiComponent {
  @Input() currentBLog: Blog | any;

  // Helper methods for template
  get blogDate(): string | null {
    if (this.currentBLog?.created_at) {
      return this.currentBLog.created_at;
    }
    if (this.currentBLog?.createDate) {
      return this.currentBLog.createDate;
    }
    if (this.currentBLog?.updated_at) {
      return this.currentBLog.updated_at;
    }
    return null;
  }

  get blogSkills(): any[] {
    // Try different possible skill property names
    if (this.currentBLog?.skills?.length > 0) {
      return this.currentBLog.skills;
    }
    if (this.currentBLog?.skillsVOs?.length > 0) {
      return this.currentBLog.skillsVOs;
    }
    if (this.currentBLog?.skill_list?.length > 0) {
      return this.currentBLog.skill_list;
    }
    return [];
  }



  get blogTitle(): string {
    return this.currentBLog?.title || 'Untitled Blog';
  }

  get blogDescription(): string {
    return this.currentBLog?.description || this.currentBLog?.content || '';
  }

  get blogId(): number | string {
    return this.currentBLog?.id || 0;
  }



  // Debug method to log blog data structure
  logBlogData(): void {
    console.log('Blog data structure:', this.currentBLog);
    console.log('Available properties:', Object.keys(this.currentBLog || {}));
  }
}
