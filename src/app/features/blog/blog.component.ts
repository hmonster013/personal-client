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
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Blog, Skill, BlogSearchParams, BlogSearchParamsModel } from 'src/app/core/models';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-blog',
  imports: [
    BlogCardUiComponent,
    SkillUiComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule
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

  // Search and filter properties
  searchKeyword: string = '';
  selectedSkills: Set<number> = new Set();
  searchParams: BlogSearchParamsModel = new BlogSearchParamsModel();
  isSearchMode: boolean = false;

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

  // Search methods
  onSearchSubmit(): void {
    if (!this.searchKeyword?.trim()) {
      return; // Don't search if keyword is empty
    }

    this.searchParams.setKeyword(this.searchKeyword.trim());
    this.searchParams.setPage(1);
    this.page = 1;
    this.performSearch();
  }

  onSkillClick(skill: Skill): void {
    console.log('Skill clicked:', skill.name, 'ID:', skill.id); // Debug log

    if (this.selectedSkills.has(skill.id)) {
      this.selectedSkills.delete(skill.id);
      console.log('Skill removed. Selected skills:', Array.from(this.selectedSkills)); // Debug log
    } else {
      this.selectedSkills.add(skill.id);
      console.log('Skill added. Selected skills:', Array.from(this.selectedSkills)); // Debug log
    }

    // Update search params with selected skills
    const skillIds = Array.from(this.selectedSkills).join(',');
    console.log('Skill IDs string:', skillIds); // Debug log

    if (skillIds) {
      this.searchParams.setSkillIds(skillIds);
    } else {
      this.searchParams.skill_ids = undefined;
    }

    // Always reset to page 1 when filters change
    this.searchParams.setPage(1);
    this.page = 1;

    // Force search execution
    this.performSearch();
  }

  isSkillSelected(skill: Skill): boolean {
    return this.selectedSkills.has(skill.id);
  }

  clearAllFilters(): void {
    console.log('Clearing all filters'); // Debug log

    this.searchKeyword = '';
    this.selectedSkills.clear();
    this.searchParams.clearFilters();
    this.isSearchMode = false;
    this.page = 1;

    // Reset form and get original list
    this.form.patchValue({
      page: 1,
      size: this.size
    });
    this.getListBlogs(this.form.value);
  }

  private performSearch(): void {
    this.isSearchMode = this.searchParams.hasFilters;

    if (this.isSearchMode) {
      this.searchParams.setPage(this.page);
      this.searchParams.setPageSize(this.size);

      console.log('Performing search with params:', this.searchParams); // Debug log

      this.blogsService.search(this.searchParams).subscribe(res => {
        this.response = res;
        if (this.response.status == '000') {
          this.listBlogs = this.response.data.data_list;
          this.totalPages = Math.ceil(this.response.data.paging.total_rows / this.response.data.paging.page_size);
          this.totalRows = this.response.data.paging.total_rows;
          this.setListPage(this.totalPages);
        } else {
          this.toastService.show("Search error", ToastStatus.ERROR);
        }
      });
    } else {
      // Load normal blog list when no filters
      this.form.patchValue({
        page: this.page,
        size: this.size
      });
      this.getListBlogs(this.form.value);
    }
  }

  // Override goToPage to handle both search and normal pagination
  goToPage(page: any) {
    this.page = page;

    if (this.isSearchMode) {
      this.searchParams.setPage(this.page);
      this.performSearch();
    } else {
      this.form.patchValue({
        page: this.page,
        size: this.size,
      });
      this.getListBlogs(this.form.value);
    }
  }

  // Helper method for template
  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Helper method to get search status text
  getSearchStatusText(): string {
    const filters = [];
    if (this.searchKeyword) {
      filters.push(`keyword: "${this.searchKeyword}"`);
    }
    if (this.selectedSkills.size > 0) {
      filters.push(`${this.selectedSkills.size} skill(s) selected`);
    }
    return filters.length > 0 ? `Filtered by ${filters.join(', ')}` : '';
  }
}
