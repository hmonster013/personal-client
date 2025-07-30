import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { JCode } from '../../shared/utils/JCode';
import { JConstants } from '../../shared/utils/JConstants';
import { SkillsService } from '../../core/services/skills.service';
import { ExperiencesService } from '../../core/services/experiences.service';
import { ToastService } from '../../core/services/toast.service';
import { ToastStatus } from '../../shared/utils/ToastStatus';
import { SkillUiComponent } from "../../shared/components/skill-ui/skill-ui.component";
import { SafeHtmlDisplayComponent } from '../../shared/components/safe-html-display/safe-html-display.component';
import { Skill, Experience } from 'src/app/core/models';

@Component({
  selector: 'app-about',
  imports: [
    CommonModule,
    SkillUiComponent,
    SafeHtmlDisplayComponent
],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit{
  form: any;
  listSkills: Skill[] = [];
  listExperiences: Experience[] = [];
  response: any;
  isLoadingExperiences: boolean = false;

  // Personal information
  personalInfo = {
    name: 'Huy',
    title: 'Fresh Graduate | Backend Developer | Information Systems Engineer',
    avatar: 'assets/img.png',
    yearsExperience: 2,
    projectsCompleted: 20,
    technologiesUsed: 10
  };

  constructor(
    private skillsService: SkillsService,
    private experiencesService: ExperiencesService,
    private toastService: ToastService,
  ) {

  }

  ngOnInit(): void {
    this.getListSkills();
    this.getListExperiences();
  }

  getListSkills() {
      let formAll = {
        noPagination: true
      };

      this.skillsService.list(formAll).subscribe(res => {
        this.response = res;

        if (this.response.status == JCode.SUCCESS) {
          this.listSkills = this.response.data.data_list;
        } else {
          this.toastService.show("Load skill error", ToastStatus.ERROR);
        }
      });
    }

  getListExperiences() {
    this.isLoadingExperiences = true;
    const formData = {
      page: JConstants.PAGE,
      size: JConstants.MAX
    };

    this.experiencesService.list(formData).subscribe({
      next: (res: any) => {
        this.response = res;

        if (this.response.status === JCode.SUCCESS) {
          this.listExperiences = this.response.data?.data_list || [];
        } else {
          this.toastService.show("Load experience error", ToastStatus.ERROR);
        }
        this.isLoadingExperiences = false;
      },
      error: (error) => {
        console.error('Error loading experiences:', error);
        this.toastService.show("Load experience error", ToastStatus.ERROR);
        this.isLoadingExperiences = false;
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return dateString;
    }
  }

  getDateRange(joinDate: string, leaveDate: string): string {
    const formattedJoinDate = this.formatDate(joinDate);
    const formattedLeaveDate = this.formatDate(leaveDate);

    // If dates are the same or leave date is empty, show as current
    if (!leaveDate || joinDate === leaveDate) {
      return `${formattedJoinDate} - Hiện tại`;
    }

    return `${formattedJoinDate} - ${formattedLeaveDate}`;
  }
}
