import { Image, ImageModel } from './image';

export interface Experience {
  id: number;
  company_img: Image;
  company_name: string;
  job_title: string;
  description: string;
  working_period: string;
  join_date: string;
  leave_date: string;
}

export class ExperienceModel implements Experience {
  id: number;
  company_img: Image;
  company_name: string;
  job_title: string;
  description: string;
  working_period: string;
  join_date: string;
  leave_date: string;

  constructor(
    id: number = 0,
    company_img: Image = new ImageModel(),
    company_name: string = '',
    job_title: string = '',
    description: string = '',
    working_period: string = '',
    join_date: string = '',
    leave_date: string = ''
  ) {
    this.id = id;
    this.company_img = company_img;
    this.company_name = company_name;
    this.job_title = job_title;
    this.description = description;
    this.working_period = working_period;
    this.join_date = join_date;
    this.leave_date = leave_date;
  }

  static fromJson(json: any): ExperienceModel {
    return new ExperienceModel(
      json.id || 0,
      json.company_img ? ImageModel.fromJson(json.company_img) : new ImageModel(),
      json.company_name || '',
      json.job_title || '',
      json.description || '',
      json.working_period || '',
      json.join_date || '',
      json.leave_date || ''
    );
  }

  toJson(): any {
    return {
      id: this.id,
      company_img: this.company_img instanceof ImageModel
        ? this.company_img.toJson()
        : this.company_img,
      company_name: this.company_name,
      job_title: this.job_title,
      description: this.description,
      working_period: this.working_period,
      join_date: this.join_date,
      leave_date: this.leave_date
    };
  }

  // Helper methods
  get formattedJoinDate(): Date | null {
    return this.join_date ? new Date(this.join_date) : null;
  }

  get formattedLeaveDate(): Date | null {
    return this.leave_date ? new Date(this.leave_date) : null;
  }

  get isCurrentJob(): boolean {
    return !this.leave_date || this.leave_date === this.join_date;
  }
}
