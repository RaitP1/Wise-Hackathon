# Extension Icons

## Required Sizes

The extension requires icons in the following sizes:

- 16x16 pixels (icon16.png) - Extension toolbar
- 32x32 pixels (icon32.png) - Extension management page
- 48x48 pixels (icon48.png) - Extension management page
- 128x128 pixels (icon128.png) - Chrome Web Store

## Creating Icons

### Option 1: Use a Design Tool

1. Create icons in Figma, Sketch, or Adobe Illustrator
2. Export in PNG format at the required sizes
3. Place files in this `icons/` directory

### Option 2: Generate from SVG

Use an online tool like:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

### Option 3: Use ImageMagick

If you have a source image:

```bash
# Install ImageMagick
brew install imagemagick

# Generate all sizes from source
convert source.png -resize 16x16 icon16.png
convert source.png -resize 32x32 icon32.png
convert source.png -resize 48x48 icon48.png
convert source.png -resize 128x128 icon128.png
```

## Design Guidelines

### Recommended Style

- **Colors**: Use bank brand colors (blue, green, or neutral)
- **Icon**: Simple invoice or document symbol
- **Background**: Transparent or solid color
- **Style**: Minimal, modern, professional

### Example Concepts

1. **Invoice Symbol**: Document with lines and money symbol
2. **Bank Icon**: Building with invoice overlay
3. **AI Symbol**: Brain or sparkle icon with document
4. **Transfer Arrow**: Arrow pointing from document to bank

## Placeholder Icons

For development, you can use simple colored squares:

- Create solid color PNG files in each required size
- Use your bank's primary color
- Add a simple white letter "I" or "$" in the center

## Testing

After creating icons:

1. Reload the extension in Chrome/Firefox
2. Check the extension toolbar
3. Visit `chrome://extensions/` to see larger icons
4. Verify all icons look sharp (not blurry)

## Current Status

**⚠️ Icons not yet created**

Please create and add icon files before deploying to production.
