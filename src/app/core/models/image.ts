export interface Image {
  id: number;
  public_id: string;
  resource_type: string;
  file_type: string;
  full_url: string;
  uploaded_at: string;
}

export class ImageModel implements Image {
  id: number;
  public_id: string;
  resource_type: string;
  file_type: string;
  full_url: string;
  uploaded_at: string;

  constructor(
    id: number = 0,
    public_id: string = '',
    resource_type: string = '',
    file_type: string = '',
    full_url: string = '',
    uploaded_at: string = ''
  ) {
    this.id = id;
    this.public_id = public_id;
    this.resource_type = resource_type;
    this.file_type = file_type;
    this.full_url = full_url;
    this.uploaded_at = uploaded_at;
  }

  static fromJson(json: any): ImageModel {
    return new ImageModel(
      json.id || 0,
      json.public_id || '',
      json.resource_type || '',
      json.file_type || '',
      json.full_url || '',
      json.uploaded_at || ''
    );
  }

  toJson(): any {
    return {
      id: this.id,
      public_id: this.public_id,
      resource_type: this.resource_type,
      file_type: this.file_type,
      full_url: this.full_url,
      uploaded_at: this.uploaded_at
    };
  }

  // Helper methods
  get uploadedDate(): Date {
    return new Date(this.uploaded_at);
  }

  get formattedUploadDate(): string {
    return this.uploadedDate.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get isImage(): boolean {
    return this.resource_type === 'image';
  }

  get isVideo(): boolean {
    return this.resource_type === 'video';
  }

  get fileExtension(): string {
    const url = this.full_url;
    const lastDot = url.lastIndexOf('.');
    return lastDot !== -1 ? url.substring(lastDot + 1) : '';
  }

  get fileName(): string {
    const parts = this.public_id.split('/');
    return parts[parts.length - 1] || '';
  }
}

// Wrapper for project images (if needed for specific use cases)
export interface ImageWrapper {
  id: number;
  image: Image;
}

export class ImageWrapperModel implements ImageWrapper {
  id: number;
  image: Image;

  constructor(id: number = 0, image: Image = new ImageModel()) {
    this.id = id;
    this.image = image;
  }

  static fromJson(json: any): ImageWrapperModel {
    return new ImageWrapperModel(
      json.id || 0,
      json.image ? ImageModel.fromJson(json.image) : new ImageModel()
    );
  }

  toJson(): any {
    return {
      id: this.id,
      image: this.image instanceof ImageModel 
        ? this.image.toJson() 
        : this.image
    };
  }
}

// Type aliases for backward compatibility and semantic clarity
export type CompanyImage = Image;
export type ProjectImage = Image;
export type CoverImage = Image;
export type BlogImage = Image;

export type CompanyImageModel = ImageModel;
export type ProjectImageModel = ImageModel;
export type CoverImageModel = ImageModel;
export type BlogImageModel = ImageModel;

export type ProjectImageWrapper = ImageWrapper;
export type ProjectImageWrapperModel = ImageWrapperModel;
