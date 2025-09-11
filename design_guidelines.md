# SwiftX Design Guidelines

## Design Approach
**Design System Approach**: Material Design adapted for technical tools, emphasizing function over visual flair. This utility-focused application prioritizes efficiency, learnability, and precision for professional users.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (default):
- Background: 215 25% 8% (deep navy-black)
- Surface: 215 20% 12% (elevated panels)
- Primary: 200 85% 60% (bright technical blue)
- Text primary: 0 0% 95%
- Text secondary: 0 0% 70%
- Success: 140 60% 55% (encoding success)
- Warning: 45 85% 65% (format warnings)
- Error: 0 70% 60% (decoding errors)

**Light Mode**:
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Primary: 200 85% 45%
- Text primary: 215 25% 15%
- Text secondary: 215 15% 40%

### B. Typography
- **Primary**: Inter (Google Fonts) - clean, technical readability
- **Monospace**: JetBrains Mono - encoding/decoding displays
- **Sizes**: text-sm (12px), text-base (16px), text-lg (18px), text-xl (20px)
- **Weights**: font-normal (400), font-medium (500), font-semibold (600)

### C. Layout System
**Spacing Primitives**: Tailwind units 2, 4, 8, 12, 16
- Micro spacing: p-2, m-2 (8px)
- Standard spacing: p-4, gap-4 (16px)  
- Section spacing: p-8, mb-8 (32px)
- Large spacing: p-12, mt-12 (48px)
- Hero spacing: p-16 (64px)

### D. Component Library

**Navigation**:
- Top navigation bar with logo, mode toggle, settings
- Sidebar for encoding format categories (collapsible)
- Breadcrumb navigation for complex workflows

**Core Components**:
- **Input/Output Panels**: Split-screen design with resizable dividers
- **Format Selector**: Dropdown with search and categorization (Base64, URL, Hex, etc.)
- **Detection Badge**: ML confidence indicator with color coding
- **Processing Status**: Real-time progress bars and success indicators
- **History Panel**: Recent encodings with quick-access buttons

**Forms & Controls**:
- Outlined input fields with technical styling
- Toggle switches for options (auto-detect, real-time mode)
- Action buttons: Primary (encode/decode), Secondary (copy, clear)
- Slider controls for encoding parameters

**Data Display**:
- Code blocks with syntax highlighting
- Comparison tables for format specifications
- Performance metrics dashboard
- Error messaging with technical details

**Overlays**:
- Format documentation modals
- Settings panels with advanced options
- Export/import dialogs

### E. Animations
Minimal, performance-focused:
- Subtle fade transitions (200ms) for mode switching
- Progress indicators for processing
- Success/error state micro-animations

## Key Design Principles

1. **Technical Precision**: Every element serves functionality
2. **Performance Visibility**: Users see processing speed and accuracy metrics
3. **Professional Aesthetics**: Clean, uncluttered interface for focused work
4. **Accessibility**: Full keyboard navigation, screen reader support
5. **Consistency**: Predictable patterns across all encoding formats

## Layout Structure
- **Header**: Navigation, branding, controls (60px height)
- **Main Workspace**: Input/output panels (70% of viewport)
- **Sidebar**: Format selection and tools (250px width, collapsible)
- **Footer**: Status bar with performance metrics (40px height)

## Images Section
**No large hero image needed** - this is a utility-focused application. Include only:
- Small logo/icon (32x32px) in navigation
- Format type icons (16x16px) in selectors - use technical iconography
- Status indicators - simple geometric shapes for encoding states

The interface prioritizes screen real estate for actual encoding work rather than decorative imagery.