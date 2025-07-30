import { Skill } from './skill';
import { Link, LinkModel } from './link';
import { Image, ImageWrapper, ImageWrapperModel } from './image';

export interface Project {
  id: number;
  name: string;
  descriptions: string;
  link_github: Link;
  link_website: Link;
  skills: Skill[];
  images: ImageWrapper[];
}

export class ProjectModel implements Project {
  id: number;
  name: string;
  descriptions: string;
  link_github: Link;
  link_website: Link;
  skills: Skill[];
  images: ImageWrapper[];

  constructor(
    id: number = 0,
    name: string = '',
    descriptions: string = '',
    link_github: Link = new LinkModel(),
    link_website: Link = new LinkModel(),
    skills: Skill[] = [],
    images: ImageWrapper[] = []
  ) {
    this.id = id;
    this.name = name;
    this.descriptions = descriptions;
    this.link_github = link_github;
    this.link_website = link_website;
    this.skills = skills;
    this.images = images;
  }

  static fromJson(json: any): ProjectModel {
    return new ProjectModel(
      json.id || 0,
      json.name || '',
      json.descriptions || '',
      json.link_github ? LinkModel.fromJson(json.link_github) : new LinkModel(),
      json.link_website ? LinkModel.fromJson(json.link_website) : new LinkModel(),
      json.skills ? json.skills.map((skill: any) => skill) : [],
      json.images ? json.images.map((img: any) => ImageWrapperModel.fromJson(img)) : []
    );
  }

  toJson(): any {
    return {
      id: this.id,
      name: this.name,
      descriptions: this.descriptions,
      link_github: this.link_github instanceof LinkModel
        ? this.link_github.toJson()
        : this.link_github,
      link_website: this.link_website instanceof LinkModel
        ? this.link_website.toJson()
        : this.link_website,
      skills: this.skills,
      images: this.images.map(img =>
        img instanceof ImageWrapperModel ? img.toJson() : img
      )
    };
  }

  // Helper methods
  get hasGithubLink(): boolean {
    return !!(this.link_github && this.link_github.url);
  }

  get hasWebsiteLink(): boolean {
    return !!(this.link_website && this.link_website.url);
  }

  get primaryImage(): Image | null {
    return this.images.length > 0 ? this.images[0].image : null;
  }

  get skillNames(): string[] {
    return this.skills.map(skill => skill.name);
  }

  getImageById(id: number): Image | null {
    const wrapper = this.images.find(img => img.id === id);
    return wrapper ? wrapper.image : null;
  }
}
