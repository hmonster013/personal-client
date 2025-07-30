export interface Contact {
  full_name: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactModel implements Contact {
  full_name: string;
  email: string;
  subject: string;
  message: string;

  constructor(
    full_name: string = '',
    email: string = '',
    subject: string = '',
    message: string = ''
  ) {
    this.full_name = full_name;
    this.email = email;
    this.subject = subject;
    this.message = message;
  }

  static fromJson(json: any): ContactModel {
    return new ContactModel(
      json.full_name || '',
      json.email || '',
      json.subject || '',
      json.message || ''
    );
  }

  toJson(): any {
    return {
      full_name: this.full_name,
      email: this.email,
      subject: this.subject,
      message: this.message
    };
  }

  // Helper methods
  get isValid(): boolean {
    return this.full_name.trim() !== '' &&
           this.email.trim() !== '' &&
           this.subject.trim() !== '' &&
           this.message.trim() !== '' &&
           this.isValidEmail;
  }

  get isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  reset(): void {
    this.full_name = '';
    this.email = '';
    this.subject = '';
    this.message = '';
  }
}
