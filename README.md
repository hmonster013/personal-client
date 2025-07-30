# PersonalClient - Portfolio & Blog Website

A modern, responsive portfolio and blog website built with Angular 19, showcasing personal projects, experiences, and technical articles.

## 🚀 Features

### Portfolio 
- **Personal Introduction** - Professional overview and contact information
- **Skills Showcase** - Interactive skill cards with proficiency levels
- **Project Gallery** - Detailed project presentations with technologies used
- **Experience Timeline** - Professional and educational background
- **Contact Form** - Direct messaging system with validation

### Blog System
- **Rich Content Display** - CKEditor integration with syntax highlighting
- **Safe HTML Rendering** - Sanitized content display with custom styling
- **Reading Time Estimation** - Automatic calculation based on content length
- **Responsive Design** - Optimized for all device sizes
- **Table of Contents** - Auto-generated navigation for blog posts

### Technical Features
- **Angular 19** - Latest Angular framework with standalone components
- **SCSS Styling** - Modern CSS with variables and mixins
- **FontAwesome Icons** - Comprehensive icon library
- **Toast Notifications** - User-friendly feedback system
- **Responsive Layout** - Mobile-first design approach

## 🛠️ Tech Stack

- **Frontend**: Angular 19, TypeScript, SCSS
- **UI Components**: Custom component library
- **Icons**: FontAwesome 7.0
- **Rich Text**: Quill Editor (ngx-quill)
- **HTTP Client**: Angular HttpClient
- **Routing**: Angular Router
- **Build Tool**: Angular CLI

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Angular CLI

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd personal-client

# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `https://localhost:4200/` (SSL enabled).

## 🏗️ Project Structure

```
src/
├── app/
│   ├── core/                 # Core services and models
│   │   ├── models/          # Data models (Blog, Experience, Skill, etc.)
│   │   └── services/        # API services and utilities
│   ├── features/            # Feature modules
│   │   ├── home/           # Landing page with portfolio
│   │   ├── about/          # About page with detailed info
│   │   ├── blog/           # Blog listing page
│   │   └── blog-detail/    # Individual blog post page
│   ├── layout/             # Layout components
│   │   └── header/         # Navigation header
│   ├── shared/             # Shared components and utilities
│   │   ├── components/     # Reusable UI components
│   │   │   ├── safe-html-display/  # Safe HTML renderer
│   │   │   └── toast/      # Notification system
│   │   └── utils/          # Constants and utilities
│   └── lib/                # UI component library
└── assets/                 # Static assets
```

## 🎨 Key Components

### SafeHtmlDisplayComponent
A specialized component for safely displaying HTML content from CKEditor:
- **HTML Sanitization** - Removes malicious scripts and styles
- **CKEditor Optimization** - Styled for CKEditor output
- **Syntax Highlighting** - Code snippet support with Monokai theme
- **Responsive Design** - Mobile-friendly content display

### Toast Service
Modern notification system with:
- Multiple types (success, error, info, warning)
- Auto-dismiss functionality
- Stacking support
- Custom positioning

## 🔧 Available Scripts

```bash
# Development
npm start              # Start dev server with SSL
npm run build          # Build for production
npm run watch          # Build and watch for changes

# Testing
npm test               # Run unit tests
npm run test:watch     # Run tests in watch mode

# Utilities
ng generate component  # Generate new component
ng generate service    # Generate new service
```

## 🌐 API Integration

The application integrates with a backend API for:
- **Blog Management** - CRUD operations for blog posts
- **Skills & Experience** - Dynamic content loading
- **Contact Form** - Message submission
- **Configuration** - Social links and site settings

### Environment Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'your-api-url-here'
};
```

## 📱 Responsive Design

- **Mobile First** - Optimized for mobile devices
- **Tablet Support** - Enhanced layout for tablets
- **Desktop Experience** - Full-featured desktop interface
- **Touch Friendly** - Optimized for touch interactions

## 🔒 Security Features

- **HTML Sanitization** - XSS protection for user content
- **Input Validation** - Form validation and sanitization
- **Safe Navigation** - Protected routing and navigation
- **Content Security** - Secure handling of external content

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deployment Options
- **Static Hosting** - Netlify, Vercel, GitHub Pages
- **CDN Deployment** - AWS CloudFront, Azure CDN
- **Traditional Hosting** - Apache, Nginx

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**DE013** - Fresh Graduate Information Systems Engineer
- Portfolio: [Your Portfolio URL]
- LinkedIn: [Your LinkedIn]
- Email: [Your Email]

## 🙏 Acknowledgments

- Angular team for the amazing framework
- FontAwesome for the icon library
- CKEditor team for the rich text editor
- All open-source contributors

---

Built with ❤️ using Angular 19
