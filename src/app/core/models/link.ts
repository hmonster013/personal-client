export interface Link {
  id: number;
  name: string;
  title: string;
  url: string;
  icon: string;
}

export class LinkModel implements Link {
  id: number;
  name: string;
  title: string;
  url: string;
  icon: string;

  constructor(
    id: number = 0,
    name: string = '',
    title: string = '',
    url: string = '',
    icon: string = ''
  ) {
    this.id = id;
    this.name = name;
    this.title = title;
    this.url = url;
    this.icon = icon;
  }

  static fromJson(json: any): LinkModel {
    return new LinkModel(
      json.id || 0,
      json.name || '',
      json.title || '',
      json.url || '',
      json.icon || ''
    );
  }

  toJson(): any {
    return {
      id: this.id,
      name: this.name,
      title: this.title,
      url: this.url,
      icon: this.icon
    };
  }
}
