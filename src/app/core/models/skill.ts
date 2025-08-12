export interface Skill {
  id: number;
  name: string;
  icon: string;
}

export class SkillModel implements Skill {
  id: number;
  name: string;
  icon: string;

  constructor(id: number = 0, name: string = '', icon: string = '') {
    this.id = id;
    this.name = name;
    this.icon = icon;
  }

  static fromJson(json: any): SkillModel {
    return new SkillModel(
      json.id || 0,
      json.name || '',
      json.icon || ''
    );
  }

  toJson(): any {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon
    };
  }
}
