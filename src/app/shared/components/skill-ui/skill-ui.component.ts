import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Skill } from '../../../core/models';

export type SkillBadgeVariant = 'primary' | 'secondary' | 'outline';
export type SkillBadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'lib-skill-ui',
  imports: [CommonModule],
  templateUrl: './skill-ui.component.html',
  styleUrl: './skill-ui.component.scss',
})
export class SkillUiComponent implements OnInit {
  private _currentSkill!: Skill;

  @Input() set currentSkill(value: Skill) {
    this._currentSkill = value;
    if (value?.icon) {
      this.sanitizedIcon = this.sanitizer.bypassSecurityTrustHtml(value.icon);
    } else {
      this.sanitizedIcon = null;
    }
  }

  get currentSkill(): Skill {
    return this._currentSkill;
  }

  @Input() variant: SkillBadgeVariant = 'secondary';
  @Input() size: SkillBadgeSize = 'md';
  @Input() interactive: boolean = false;

  sanitizedIcon: SafeHtml | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {}
}
