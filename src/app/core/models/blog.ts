import { Skill, SkillModel } from './skill';
import { Image, ImageModel } from './image';

export interface Blog {
  id: number;
  title: string;
  content: string;
  description: string;
  status: boolean;
  cover_img: Image;
  skills: Skill[];
}

export class BlogModel implements Blog {
  id: number;
  title: string;
  content: string;
  description: string;
  status: boolean;
  cover_img: Image;
  skills: Skill[];

  constructor(
    id: number = 0,
    title: string = '',
    content: string = '',
    description: string = '',
    status: boolean = false,
    cover_img: Image = new ImageModel(),
    skills: Skill[] = []
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.description = description;
    this.status = status;
    this.cover_img = cover_img;
    this.skills = skills;
  }

  static fromJson(json: any): BlogModel {
    return new BlogModel(
      json.id || 0,
      json.title || '',
      json.content || '',
      json.description || '',
      json.status || false,
      json.cover_img ? ImageModel.fromJson(json.cover_img) : new ImageModel(),
      json.skills ? json.skills.map((skill: any) => SkillModel.fromJson(skill)) : []
    );
  }

  toJson(): any {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      description: this.description,
      status: this.status,
      cover_img: this.cover_img instanceof ImageModel
        ? this.cover_img.toJson()
        : this.cover_img,
      skills: this.skills.map(skill =>
        skill instanceof SkillModel ? skill.toJson() : skill
      )
    };
  }

  // Helper methods
  get isPublished(): boolean {
    return this.status;
  }

  get coverImageUrl(): string {
    return this.cover_img.full_url || '';
  }

  get skillNames(): string[] {
    return this.skills.map(skill => skill.name);
  }

  get contentPreview(): string {
    // Remove HTML tags and get first 150 characters
    const textContent = this.content.replace(/<[^>]*>/g, '');
    return textContent.length > 150
      ? textContent.substring(0, 150) + '...'
      : textContent;
  }

  get readingTime(): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  get readingTimeText(): string {
    const time = this.readingTime;
    if (time <= 1) {
      return '1 phút đọc';
    }
    return `${time} phút đọc`;
  }

  hasSkill(skillName: string): boolean {
    return this.skills.some(skill => skill.name === skillName);
  }

  getSkillById(id: number): Skill | null {
    return this.skills.find(skill => skill.id === id) || null;
  }

  generateSlug(): string {
    return this.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  toggleStatus(): void {
    this.status = !this.status;
  }
}

export interface BlogPaging {
  total_rows: number;
  page: number;
  page_size: number;
}

export interface BlogApiResponse {
  status: string;
  message: string;
  data: {
    data_list: Blog[];
    paging: BlogPaging;
  };
}

export class BlogPagingModel implements BlogPaging {
  total_rows: number;
  page: number;
  page_size: number;

  constructor(
    total_rows: number = 0,
    page: number = 1,
    page_size: number = 12
  ) {
    this.total_rows = total_rows;
    this.page = page;
    this.page_size = page_size;
  }

  static fromJson(json: any): BlogPagingModel {
    return new BlogPagingModel(
      json.total_rows || 0,
      json.page || 1,
      json.page_size || 12
    );
  }

  toJson(): any {
    return {
      total_rows: this.total_rows,
      page: this.page,
      page_size: this.page_size
    };
  }

  get totalPages(): number {
    return Math.ceil(this.total_rows / this.page_size);
  }

  get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.page > 1;
  }

  get isFirstPage(): boolean {
    return this.page === 1;
  }

  get isLastPage(): boolean {
    return this.page === this.totalPages;
  }
}

export class BlogApiResponseModel implements BlogApiResponse {
  status: string;
  message: string;
  data: {
    data_list: Blog[];
    paging: BlogPaging;
  };

  constructor(
    status: string = '',
    message: string = '',
    data_list: Blog[] = [],
    paging: BlogPaging = new BlogPagingModel()
  ) {
    this.status = status;
    this.message = message;
    this.data = {
      data_list,
      paging
    };
  }

  static fromJson(json: any): BlogApiResponseModel {
    const data = json.data || {};
    return new BlogApiResponseModel(
      json.status || '',
      json.message || '',
      (data.data_list || []).map((post: any) => BlogModel.fromJson(post)),
      data.paging ? BlogPagingModel.fromJson(data.paging) : new BlogPagingModel()
    );
  }

  toJson(): any {
    return {
      status: this.status,
      message: this.message,
      data: {
        data_list: this.data.data_list.map(post =>
          post instanceof BlogModel ? post.toJson() : post
        ),
        paging: this.data.paging instanceof BlogPagingModel
          ? this.data.paging.toJson()
          : this.data.paging
      }
    };
  }

  get isSuccess(): boolean {
    return this.status === '000';
  }

  get posts(): Blog[] {
    return this.data.data_list;
  }

  get paging(): BlogPaging {
    return this.data.paging;
  }

  get publishedPosts(): Blog[] {
    return this.posts.filter(post => post.status);
  }

  get draftPosts(): Blog[] {
    return this.posts.filter(post => !post.status);
  }
}

// Blog Search Interfaces
export interface BlogSearchParams {
  kw?: string;
  skills?: string;
  skill_ids?: string | number;
  page?: number;
  page_size?: number;
}

export class BlogSearchParamsModel implements BlogSearchParams {
  kw?: string;
  skills?: string;
  skill_ids?: string | number;
  page?: number;
  page_size?: number;

  constructor(
    kw?: string,
    skills?: string,
    skill_ids?: string | number,
    page: number = 1,
    page_size: number = 5
  ) {
    this.kw = kw;
    this.skills = skills;
    this.skill_ids = skill_ids;
    this.page = page;
    this.page_size = page_size;
  }

  static fromJson(json: any): BlogSearchParamsModel {
    return new BlogSearchParamsModel(
      json.kw,
      json.skills,
      json.skill_ids,
      json.page || 1,
      json.page_size || 5
    );
  }

  toJson(): any {
    const params: any = {};
    if (this.kw) params.kw = this.kw;
    if (this.skills) params.skills = this.skills;
    if (this.skill_ids) params.skill_ids = this.skill_ids;
    if (this.page) params.page = this.page;
    if (this.page_size) params.page_size = this.page_size;
    return params;
  }

  // Helper methods
  get hasKeyword(): boolean {
    return !!this.kw && this.kw.trim().length > 0;
  }

  get hasSkillFilter(): boolean {
    return !!this.skills || !!this.skill_ids;
  }

  get hasFilters(): boolean {
    return this.hasKeyword || this.hasSkillFilter;
  }

  clearFilters(): void {
    this.kw = undefined;
    this.skills = undefined;
    this.skill_ids = undefined;
    this.page = 1;
  }

  setKeyword(keyword: string): void {
    this.kw = keyword.trim() || undefined;
    this.page = 1; // Reset to first page when searching
  }

  setSkills(skills: string): void {
    this.skills = skills || undefined;
    this.page = 1; // Reset to first page when filtering
  }

  setSkillIds(skillIds: string | number): void {
    this.skill_ids = skillIds;
    this.page = 1; // Reset to first page when filtering
  }

  setPage(page: number): void {
    this.page = Math.max(1, page);
  }

  setPageSize(pageSize: number): void {
    this.page_size = Math.max(1, pageSize);
    this.page = 1; // Reset to first page when changing page size
  }
}


