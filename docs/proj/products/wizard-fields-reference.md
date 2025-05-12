# Product Wizard Fields Reference

This document provides detailed information about all fields and features in the new product wizard.

## Basic Information Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| Product Name | Text | The primary name displayed to customers | Required, 3-100 characters |
| Slug | Text | URL-friendly version of the name | Required, auto-generated, editable, no spaces or special characters except hyphens |
| Category | Select | Product classification category | Required, must be selected from predefined list |
| Price | Number | Regular selling price | Required, positive number, max 2 decimal places |
| Cost Price | Number | Your acquisition cost | Optional, positive number, max 2 decimal places |
| Brand | Text | Product brand name | Optional, 2-50 characters |
| SKU | Text | Stock Keeping Unit identifier | Optional, up to 50 characters, must be unique |
| Description | Rich Text | Detailed product description | Optional, supports formatting, tables, and embedded media |
| Short Description | Text | Concise product summary | Optional, up to 500 characters |

## Product Images Features

| Feature | Description | Options |
|---------|-------------|---------|
| Image Upload | Add product images | Drag & drop or file selector, multiple upload supported |
| Image Reordering | Change display sequence | Drag & drop interface for rearranging images |
| Image Cropping | Adjust image framing | Built-in cropping tool with aspect ratio presets |
| Image Enhancement | Basic image adjustments | Brightness, contrast, saturation controls |
| Background Removal | AI-powered background removal | Isolate product from background automatically |
| Alt Text | Accessibility text for images | Required for each image, improves SEO |
| Featured Image | Main product display image | First image by default, can be specifically designated |

## Additional Information Features

### General Attributes

| Field | Type | Description |
|-------|------|-------------|
| Weight | Number | Product weight (in grams or kg) |
| Width | Number | Product width (in cm) |
| Height | Number | Product height (in cm) |
| Depth | Number | Product depth (in cm) |
| Material | Text | Primary product material |
| Country of Origin | Select | Manufacturing country |
| Warranty | Text | Warranty information |
| Certification | Multi-select | Product certifications |

### Category-Specific Attributes
Dynamically loaded based on selected category. Common examples:

| Category | Attribute Examples |
|----------|-------------------|
| Electronics | Power requirements, connectivity options, display size, storage capacity |
| Clothing | Size, color, fabric composition, care instructions, fit type |
| Furniture | Assembly required, maximum weight capacity, recommended room |
| Books | Author, ISBN, publisher, page count, format |
| Food & Beverages | Ingredients, dietary information, serving size, storage instructions |

### Custom Attributes

The wizard allows merchants to create custom attributes with these types:
- Text (single line)
- Text Area (multi-line)
- Number
- Select (single choice from options)
- Multi-select (multiple choices from options)
- Boolean (Yes/No)
- Date
- Color

## AI-Powered Features

| Feature | Description | How to Use |
|---------|-------------|------------|
| Attribute Suggestions | AI recommends relevant attributes based on product details | Click "Suggest Attributes" button in Additional Info step |
| Pricing Suggestions | AI suggests optimal pricing based on cost and market data | Available in Basic Info step next to price field |
| Description Enhancement | Improves product descriptions for better SEO | Click "Enhance" button next to description field |
| Tag Generation | Creates relevant tags for improved searchability | Available in Additional Info step |
| Image Analysis | Detects product features from images | Automatically runs when images are uploaded |

## Review & Submit Options

| Option | Description |
|--------|-------------|
| Publish Now | Makes product immediately available in store |
| Schedule Publication | Sets future date/time for product to become available |
| Save as Draft | Stores current progress without publishing |
| Preview | Shows how product will appear to customers |
| Duplicate | Creates a copy of the current product |

## Drafts Management

| Feature | Description |
|---------|-------------|
| Auto-save | Automatically saves progress every 30 seconds |
| Manual Save | Save current progress on demand |
| Draft Listing | View all product drafts with status indicators |
| Completion Indicators | Visual representation of completion status for each section |
| Last Edited | Timestamp of last modification |
| Draft Sharing | Share draft with team members for collaborative editing |
| Version History | Access previous versions of the draft |

## Additional Features

| Feature | Description |
|---------|-------------|
| Form Validation | Real-time validation with clear error messages |
| Progress Tracking | Visual indicator of completion progress |
| Keyboard Navigation | Complete accessibility with keyboard shortcuts |
| Field Dependencies | Dynamic showing/hiding of fields based on other selections |
| Mobile Optimization | Fully responsive interface for all device sizes |
| Context-sensitive Help | Tooltips and help text for complex fields |