import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SkillUiComponent } from "../skill-ui/skill-ui.component";
import { SafeHtmlDisplayComponent } from '../safe-html-display/safe-html-display.component';

@Component({
  selector: 'lib-blog-card-ui',
  imports: [
    CommonModule,
    SkillUiComponent,
    SafeHtmlDisplayComponent
],
  templateUrl: './blog-card-ui.component.html',
  styleUrl: './blog-card-ui.component.scss'
})
export class BlogCardUiComponent {
  @Input() currentBLog: any;
}
