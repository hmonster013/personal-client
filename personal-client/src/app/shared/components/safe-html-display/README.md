# SafeHtmlDisplayComponent

Component để hiển thị HTML content một cách an toàn, được tối ưu hóa đặc biệt cho nội dung từ CKEditor với cấu hình:

```python
CKEDITOR_CONFIGS = {
    'default': {
        'toolbar': 'Custom',
        'toolbar_Custom': [
            ['Format', 'Bold', 'Italic', 'Underline'],
            ['NumberedList', 'BulletedList'],
            ['Blockquote', 'CodeSnippet'],
            ['Link', 'Unlink'],
            ['Image'],
            ['RemoveFormat', 'Source'],
        ],
        'extraPlugins': 'codesnippet',
        'codeSnippet_theme': 'monokai_sublime',
        'height': 300,
        'allowedContent': True,
    }
}
```

## Tính năng

- **Hỗ trợ đầy đủ CKEditor**: Format, Bold, Italic, Underline, Lists, Blockquote, Code, Links, Images
- **Code Syntax Highlighting**: Hỗ trợ CodeSnippet plugin với theme monokai_sublime
- **Sanitize HTML**: An toàn với nội dung từ CKEditor
- **Responsive Design**: Tự động điều chỉnh cho mobile và desktop
- **Customizable**: Có thể override styles và thêm CSS class tùy chỉnh

## Cách sử dụng

### 1. Import component

```typescript
import { SafeHtmlDisplayComponent } from '../safe-html-display/safe-html-display.component';

@Component({
  selector: 'your-component',
  imports: [
    SafeHtmlDisplayComponent,
    // other imports...
  ],
  // ...
})
```

### 2. Sử dụng trong template

#### Cơ bản
```html
<app-safe-html-display 
  [htmlContent]="yourHtmlString">
</app-safe-html-display>
```

#### Với CSS class tùy chỉnh
```html
<app-safe-html-display 
  [htmlContent]="experience.description"
  cssClass="experience-description">
</app-safe-html-display>
```

#### Với giới hạn độ dài
```html
<app-safe-html-display 
  [htmlContent]="blog.content"
  [maxLength]="500"
  cssClass="blog-preview">
</app-safe-html-display>
```

### 3. Tùy chỉnh CSS

Bạn có thể override styles bằng cách sử dụng `::ng-deep`:

```scss
.your-custom-class {
  ::ng-deep .safe-html-content {
    font-size: 1rem;
    line-height: 1.6;
    
    p {
      margin-bottom: 1rem;
    }
    
    h1, h2, h3 {
      color: #333;
      margin: 1.5rem 0 1rem 0;
    }
    
    ul, ol {
      padding-left: 2rem;
    }
  }
}
```

## Ví dụ thực tế

### Experience Description
```html
<!-- Thay vì -->
<div [innerHTML]="selectedExperience.description"></div>

<!-- Sử dụng -->
<app-safe-html-display 
  [htmlContent]="selectedExperience.description"
  cssClass="experience-description">
</app-safe-html-display>
```

### Blog Content từ CKEditor
```html
<!-- Thay vì -->
<div [innerHTML]="currentBlog.content"></div>

<!-- Sử dụng -->
<app-safe-html-display
  [htmlContent]="currentBlog.content"
  cssClass="blog-article-content">
</app-safe-html-display>
```

### Project Description với giới hạn độ dài
```html
<app-safe-html-display 
  [htmlContent]="project.description"
  [maxLength]="200"
  cssClass="project-preview">
</app-safe-html-display>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `htmlContent` | `string` | `''` | Nội dung HTML cần hiển thị |
| `cssClass` | `string` | `''` | CSS class tùy chỉnh |
| `maxLength` | `number` | `0` | Giới hạn độ dài (0 = không giới hạn) |

## Bảo mật

Component này đã được thiết kế để:
- Loại bỏ các thẻ `<script>` và `<style>`
- Loại bỏ event handlers (onclick, onload, etc.)
- Loại bỏ javascript: URLs
- Sử dụng Angular's DomSanitizer để sanitize HTML
- An toàn với nội dung từ CKEditor

## Hỗ trợ CKEditor

Component được tối ưu hóa đặc biệt cho CKEditor với các tính năng:

### 1. Text Formatting
- **Bold** (`<strong>`, `<b>`) - Font weight 700
- **Italic** (`<em>`, `<i>`) - Font style italic
- **Underline** (`<u>`) - Text decoration underline

### 2. Headings (Format dropdown)
- H1-H6 với responsive font sizes
- Scroll margin cho sticky navigation
- Proper spacing và typography

### 3. Lists
- **Numbered Lists** (`<ol>`) với decimal numbering
- **Bulleted Lists** (`<ul>`) với disc bullets
- **Nested Lists** với circle và square bullets
- Responsive padding

### 4. Blockquotes
- Gradient background với primary color
- Quote icon tự động
- Responsive padding và margins
- Border trái với primary color

### 5. Code Snippets
- **Inline code** với background và border
- **Code blocks** với monokai_sublime theme
- Syntax highlighting support
- Responsive font sizes

### 6. Links và Images
- **Links** với hover effects và primary color
- **Images** responsive với border radius và shadow
- Auto-sizing và centering

### 7. Tables (nếu có)
- Responsive design
- Hover effects
- Primary color cho headers

## Demo và Testing

Sử dụng `SafeHtmlDemoComponent` để test các tính năng:

```typescript
import { SafeHtmlDemoComponent } from './demo.component';
```

Xem `ckeditor-demo-content.ts` để có ví dụ về nội dung CKEditor đầy đủ.
