# Website Color Palette Extractor

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A powerful Chrome extension that extracts and analyzes color palettes from any website with advanced tools for designers and developers.

## ✨ Features

### Core Functions
- **Smart Color Extraction** - Automatically extract colors from web pages with intelligent weighting
- **Color Classification** - Categorize colors into Primary, Secondary, and Accent groups
- **Color Scales** - Generate 11-level color scales for each extracted color
- **WCAG Contrast Checker** - Verify color accessibility with AA/AAA standards
- **Export Options** - Export color schemes in CSS Variables, Tailwind, Figma JSON, or JSON
- **Search & Filter** - Find and filter colors by category or value

### Advanced Features
- CSS Variable support with recursive resolution
- Pseudo-element color extraction (::before, ::after)
- SVG element colors (fill, stroke)
- Background gradient color detection
- Dynamic content monitoring
- Real-time color analysis

## 🚀 Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/website-color.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the project folder

5. The extension icon will appear in your toolbar

## 📖 Usage

1. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - The side panel will open automatically

2. **Extract Colors**
   - Visit any website
   - Click "Refresh Colors" to extract the current page's palette
   - View categorized colors with usage percentages

3. **Analyze Colors**
   - Click "Contrast" to check WCAG compliance
   - Use the search bar to find specific colors
   - Filter by Primary, Secondary, or Accent colors

4. **Export Palette**
   - Click "Export" button
   - Choose your preferred format (CSS, Tailwind, Figma, JSON)
   - Copy the generated code

## 🛠️ Development

### Project Structure
```
website-color/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Color extraction logic
├── sidebar.html          # Side panel UI
├── sidebar.js            # Side panel logic
├── icons/                # Extension icons
└── README.md
```

### Tech Stack
- Chrome Extension Manifest V3
- Vanilla JavaScript
- CSS3 (Flexbox, Grid, Animations)
- Chrome APIs (Side Panel, Scripting, Tabs)

## 🎨 Color Extraction Algorithm

The extension uses a sophisticated algorithm that:
1. Scans all DOM elements
2. Weights colors by element area and visibility
3. Resolves CSS variables recursively
4. Extracts colors from multiple sources:
   - Background colors
   - Text colors
   - Border colors
   - SVG fills and strokes
   - Gradients
   - Pseudo-elements
5. Filters similar colors intelligently
6. Categorizes by usage and saturation

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/website-color/issues) page.

---

**Made with ❤️ for designers and developers**