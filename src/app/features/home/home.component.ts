import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormsModule } from '@angular/forms';
import { ExperiencesService } from '../../core/services/experiences.service';
import { CommonService } from '../../core/services/common.service';
import { JCode } from '../../shared/utils/JCode';
import { JConstants } from '../../shared/utils/JConstants';
import { ProjectsService } from '../../core/services/projects.service';
import { SkillsService } from '../../core/services/skills.service';
import { ContactService } from '../../core/services/contact.service';
import { SkillUiComponent } from '../../shared/components/skill-ui/skill-ui.component';
import { ToastService } from '../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { Skill, Experience, Project, ContactModel } from '../../core/models';
import { SafeHtmlDisplayComponent } from 'src/app/shared/components/safe-html-display/safe-html-display.component';

interface ContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Component({
  selector: 'app-home',
  imports: [
    SkillUiComponent,
    SafeHtmlDisplayComponent,
    CommonModule,
    FormsModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit{
  listSkills: Skill[] = [];
  listExperiences: Experience[] = [];
  listProjects: Project[] = [];
  selectedExperience: Experience | null = null;
  response: any;
  socialLinks: any = {};

  contactData: ContactData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  constructor(
    private skillsService: SkillsService,
    private toastService: ToastService,
    private experiencesService: ExperiencesService,
    private projectsService: ProjectsService,
    private commonService: CommonService,
    private contactService: ContactService
  ) {

  }

  ngOnInit(): void {
    this.getListSkills();
    this.getListExperiences();
    this.getListProjects();
    this.getAllConfig();
  }

  getListSkills() {
    const formData = {
      noPagination: true
    };

    this.skillsService.list(formData).subscribe({
      next: (res: any) => {
        this.response = res;

        if (this.response.status === JCode.SUCCESS) {
          this.listSkills = this.response.data?.data_list || [];
        } else {
          this.toastService.error("Failed to load skills", "Loading Error");
        }
      },
      error: (error) => {
        console.error('Error loading skills:', error);
        this.toastService.error("Failed to load skills", "Network Error");
      }
    });
  }

  getListExperiences() {
    const formData = {
      page: JConstants.PAGE,
      size: JConstants.MAX
    };

    this.experiencesService.list(formData).subscribe({
      next: (res: any) => {
        this.response = res;

        if (this.response.status === JCode.SUCCESS) {
          this.listExperiences = this.response.data?.data_list || [];
          this.selectedExperience = this.listExperiences.length > 0 ? this.listExperiences[0] : null;
        } else {
          this.toastService.error("Failed to load experiences", "Loading Error");
        }
      },
      error: (error) => {
        console.error('Error loading experiences:', error);
        this.toastService.error("Failed to load experiences", "Network Error");
      }
    });
  }

  getListProjects() {
    const formData = {
      page: JConstants.PAGE,
      size: JConstants.MAX
    };

    this.projectsService.list(formData).subscribe({
      next: (res: any) => {
        this.response = res;

        if (this.response.status === JCode.SUCCESS) {
          this.listProjects = this.response.data?.data_list || [];
        } else {
          this.toastService.error("Failed to load projects", "Loading Error");
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.toastService.error("Failed to load projects", "Network Error");
      }
    });
  }

  changeExperience(experience: Experience) {
    this.selectedExperience = experience;
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

  onSubmitContact(): void {
    if (this.isValidContactForm()) {
      const contact = new ContactModel(
        this.contactData.name,
        this.contactData.email,
        this.contactData.subject,
        this.contactData.message
      );

      // Send to backend
      this.contactService.create(contact).subscribe({
        next: (res: any) => {
          if (res.status === JCode.SUCCESS) {
            this.toastService.success(
              'Thank you for your message! I will get back to you soon.',
              'Message Sent Successfully'
            );
            this.resetContactForm();
          } else {
            this.toastService.error(
              res.message || 'Failed to send message. Please try again.',
              'Send Failed'
            );
          }
        },
        error: (error) => {
          console.error('Contact form error:', error);
          this.toastService.error(
            'Failed to send message. Please check your connection and try again.',
            'Network Error'
          );
        }
      });
    } else {
      this.toastService.warning(
        'Please fill in all required fields correctly.',
        'Form Validation Error'
      );
    }
  }

  private isValidContactForm(): boolean {
    return !!(
      this.contactData.name.trim() &&
      this.contactData.email.trim() &&
      this.contactData.subject.trim() &&
      this.contactData.message.trim() &&
      this.isValidEmail(this.contactData.email)
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private resetContactForm(): void {
    this.contactData = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
  }

  getAllConfig() {
    this.commonService.getAllConfig().subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          this.socialLinks = res.data?.baseLinks || {};
        } else {
          console.error('Error loading config:', res.message);
        }
      },
      error: (error) => {
        console.error('Error loading config:', error);
      }
    });
  }

  scrollToContact(): void {
    const contactElement = document.getElementById('contact');
    if (contactElement) {
      contactElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  openLink(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Test methods for toast service
  testToastSuccess(): void {
    this.toastService.success('This is a success message!', 'Success');
  }

  testToastError(): void {
    this.toastService.error('This is an error message!', 'Error');
  }

  testToastInfo(): void {
    this.toastService.info('This is an info message!', 'Information');
  }

  testToastWarning(): void {
    this.toastService.warning('This is a warning message!', 'Warning');
  }
}
