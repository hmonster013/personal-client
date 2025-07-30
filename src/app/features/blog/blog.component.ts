import { Component, OnInit } from '@angular/core';
import { BlogCardUiComponent } from '../../shared/components/blog-card-ui/blog-card-ui.component';
import { BlogService } from '../../core/services/blog.service';
import { JCode } from '../../shared/utils/JCode';
import { JConstants } from '../../shared/utils/JConstants';
import { SkillsService } from '../../core/services/skills.service';
import { SkillUiComponent } from '../../shared/components/skill-ui/skill-ui.component';
import { ToastService } from '../../core/services/toast.service';
import { ToastStatus } from '../../shared/utils/ToastStatus';
import { URI } from '../../shared/utils/URI';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Blog, Skill } from 'src/app/core/models';

@Component({
  selector: 'app-blog',
  imports: [
    BlogCardUiComponent,
    SkillUiComponent,
    CommonModule
  ],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.scss'
})
export class BlogComponent implements OnInit{
  form: any;
  listSkills: Skill[] = [];
  listBlogs: Blog[] = [];
  response: any;
  page: number = 1;
  size: number = 10;
  totalRows: any;
  totalPages: any;
  listPage: any;

  constructor(
    private skillsService: SkillsService,
    private toastService: ToastService,
    private blogsService: BlogService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.createFormGroup();
    this.getListSkills();

    this.form.patchValue({
      page: JConstants.PAGE,
      size: JConstants.SIZE
    });

    this.getListBlogs(this.form.value);
  }

  getListSkills() {
    let formAll = {
      page: JConstants.PAGE,
      size: JConstants.MAX
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

  getListBlogs(formData: any) {
    this.blogsService.list(formData).subscribe(res => {
      this.response = res;
      if (this.response.status == '000') {
        this.listBlogs = this.response.data.data_list;
        this.totalPages = this.response.data.paging.totalPages;
        this.totalRows = this.response.data.paging.totalRows;
        this.setListPage(this.totalPages);
      } else if (this.response.status == '001') {
        this.router.navigate(['/access-deny'])
      }
    });
  }

  setListPage(totalPages: any) {
    this.listPage = [];
    for (let i = 1; i <= totalPages; i++) {
      this.listPage.push(i)
    }
  }

  goToPage(page: any) {
    this.page = page;

    this.form.patchValue({
      page: this.page,
      size: this.size,
    });

    this.getListBlogs(this.form.value);
  }

  goToHome() {
    this.router.navigate([URI.HOME]);
  }

  createFormGroup() {
    this.form = new FormGroup({
      id: new FormControl(''),
      page: new FormControl(''),
      size: new FormControl(''),
      name: new FormControl('')
    })
  }

  // Helper method for template
  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }
}
