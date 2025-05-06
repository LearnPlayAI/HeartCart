# Product Management Implementation Plan

This document outlines the implementation plan for enhancing the product management features in the TeeMeYou admin panel, with a focus on the product creation and editing functionality.

## Table of Contents

1. [Multiple Image Upload](#1-multiple-image-upload-with-replit-object-store)
2. [Enhanced Flash Deal DateTime Support](#2-flash-deal-date-and-time-picker)
3. [AI-Powered Product Analysis](#3-google-gemini-ai-integration-for-auto-filling)
4. [AI-Generated Product Tags](#4-ai-generated-product-tags)
5. [Image Cropping Functionality](#5-image-cropping-functionality)
6. [Background Removal Tool](#6-background-removal-tool)
7. [Main Image Selection](#7-main-image-selection)
8. [Complete UI Flow](#8-complete-ui-flow)
9. [Implementation Timeline](#9-implementation-timeline)
10. [Required Dependencies](#10-required-dependencies)

## 1. Multiple Image Upload with Replit Object Store

### Requirements
- Allow admins to upload multiple product images
- Store images in Replit Object Store with organized folder structure
- Show thumbnail previews of uploaded images
- Support drag-and-drop functionality

### Implementation
1. Add `react-dropzone` for drag-and-drop file uploads
2. Create a file upload component with the following features:
   - Drag and drop zone
   - File selection dialog
   - Image preview grid
   - File type validation (image files only)
   - Size limit validation

3. Implement server-side handling:
   ```typescript
   // Server endpoint to handle uploads
   app.post("/api/products/images", isAuthenticated, async (req, res) => {
     try {
       // Get temporary productId or use a placeholder until product is created
       const { tempProductId } = req.body;
       const files = req.files; // Using multer middleware for multipart form data
       
       const uploadedImages = [];
       
       for (const file of files) {
         // Generate unique filename with timestamp
         const timestamp = Date.now();
         const filename = `${timestamp}_${file.originalname.replace(/\s+/g, '_')}`;
         const objectKey = `products/${tempProductId}/${filename}`;
         
         // Upload to Replit Object Store
         await objectStore.put(
           objectKey,
           file.buffer,
           { contentType: file.mimetype }
         );
         
         const url = objectStore.getUrl(objectKey);
         uploadedImages.push({ 
           url,
           filename,
           objectKey,
           isMain: uploadedImages.length === 0 // First image is main by default
         });
       }
       
       res.status(200).json({ images: uploadedImages });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

4. Create folder structure in Replit Object Store:
   - `/products/{product_id}/{timestamp}_{filename}`

## 2. Flash Deal Date and Time Picker

### Requirements
- Allow admins to select both date and time for flash deal end
- Validate that end date/time is in the future
- Provide a user-friendly datetime selection interface

### Implementation
1. Replace the current date input with `react-datepicker`
2. Update form component:
   ```jsx
   <FormField
     control={form.control}
     name="flashDealEnd"
     render={({ field }) => (
       <FormItem>
         <FormLabel>Flash Deal End Date & Time</FormLabel>
         <FormControl>
           <DatePicker
             selected={field.value ? new Date(field.value) : null}
             onChange={(date) => field.onChange(date?.toISOString())}
             showTimeSelect
             timeFormat="HH:mm"
             timeIntervals={15}
             dateFormat="MMMM d, yyyy h:mm aa"
             minDate={new Date()}
             placeholderText="Select date and time"
             className="w-full rounded-md border border-input bg-background px-3 py-2"
           />
         </FormControl>
         <FormMessage />
       </FormItem>
     )}
   />
   ```

3. Update validation schema:
   ```typescript
   flashDealEnd: z.string()
     .refine(
       (date) => !date || new Date(date) > new Date(),
       { message: "Flash deal end time must be in the future" }
     )
     .optional()
     .nullable(),
   ```

## 3. Google Gemini AI Integration for Auto-filling

### Requirements
- Analyze product images using Google Gemini 1.5 Flash
- Extract product details from images
- Auto-fill product form fields based on AI analysis
- Allow admin review before applying suggestions

### Implementation
1. Create a server endpoint for Gemini API integration:
   ```typescript
   app.post("/api/ai/analyze-product", isAuthenticated, async (req, res) => {
     try {
       const { imageUrls } = req.body;
       
       // Validate Google Gemini API key
       if (!process.env.GEMINI_API_KEY) {
         return res.status(400).json({ error: "Gemini API key not configured" });
       }
       
       // Initialize Gemini API
       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
       
       // Prepare image data
       const imagePromises = imageUrls.map(url => fetch(url).then(r => r.arrayBuffer()));
       const imageBuffers = await Promise.all(imagePromises);
       
       // Convert to base64 for Gemini API
       const imageContents = imageBuffers.map(buffer => {
         return {
           inlineData: {
             data: Buffer.from(buffer).toString('base64'),
             mimeType: "image/jpeg" // Adjust based on actual image type
           }
         };
       });
       
       // Create prompt
       const prompt = `
         Analyze these product images and extract the following information:
         1. Product name
         2. Detailed description
         3. Category (from the following options: ${/* categories list */})
         4. Appropriate price range in South African Rand (ZAR)
         5. Key features and specifications
         6. Brand name (if visible)
         7. Suggested tags for product search
         
         Format the response as a JSON object with these fields.
       `;
       
       // Generate content
       const result = await model.generateContent([prompt, ...imageContents]);
       const response = await result.response;
       const text = response.text();
       
       // Parse JSON from the response
       const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                         text.match(/{[\s\S]*?}/);
       
       if (!jsonMatch) {
         return res.status(500).json({ error: "Failed to parse AI response" });
       }
       
       const jsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
       
       // Return AI suggestions
       res.status(200).json({ 
         suggestions: jsonResponse,
         rawResponse: text
       });
     } catch (error) {
       console.error("Gemini API error:", error);
       res.status(500).json({ error: error.message || "Failed to analyze images" });
     }
   });
   ```

2. Add an "Analyze with AI" button in the product form:
   ```jsx
   {uploadedImages.length > 0 && (
     <Button
       type="button"
       variant="outline"
       onClick={analyzeImagesWithAI}
       disabled={aiAnalysisLoading}
     >
       {aiAnalysisLoading ? (
         <>
           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           Analyzing Images...
         </>
       ) : (
         <>
           <Sparkles className="mr-2 h-4 w-4" />
           Analyze with AI
         </>
       )}
     </Button>
   )}
   ```

3. Create an AI suggestion review modal:
   ```jsx
   <Dialog open={!!aiSuggestions} onOpenChange={() => setAiSuggestions(null)}>
     <DialogContent className="max-w-3xl">
       <DialogHeader>
         <DialogTitle>AI-Generated Product Details</DialogTitle>
         <DialogDescription>
           Review the AI suggestions before applying them to the form.
         </DialogDescription>
       </DialogHeader>
       
       <div className="grid gap-4 py-4">
         {/* Display AI suggestions with Apply/Ignore buttons */}
         {aiSuggestions && Object.entries(aiSuggestions).map(([key, value]) => (
           <div key={key} className="border rounded-md p-3">
             <div className="flex justify-between items-center mb-2">
               <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
               <Button 
                 size="sm" 
                 variant="ghost" 
                 onClick={() => applyAISuggestion(key, value)}
               >
                 Apply
               </Button>
             </div>
             <p className="text-sm text-muted-foreground">{value}</p>
           </div>
         ))}
       </div>
       
       <DialogFooter>
         <Button variant="outline" onClick={() => setAiSuggestions(null)}>
           Cancel
         </Button>
         <Button onClick={applyAllAISuggestions}>
           Apply All Suggestions
         </Button>
       </DialogFooter>
     </DialogContent>
   </Dialog>
   ```

## 4. AI-Generated Product Tags

### Requirements
- Generate product tags based on image analysis
- Allow adding, editing, and removing tags
- Store tags in the database

### Implementation
1. Update the product schema to include tags:
   ```typescript
   // In shared/schema.ts
   export const products = pgTable("products", {
     // ...existing fields
     tags: text("tags").array(),
   });
   ```

2. Add tag input component to the form:
   ```jsx
   <FormField
     control={form.control}
     name="tags"
     render={({ field }) => (
       <FormItem>
         <FormLabel>Product Tags</FormLabel>
         <FormControl>
           <TagInput
             value={field.value || []}
             onChange={field.onChange}
             placeholder="Enter tags and press Enter"
             suggestions={aiTagSuggestions}
           />
         </FormControl>
         <FormDescription>
           Add tags to help customers find this product. Press Enter after each tag.
         </FormDescription>
         <FormMessage />
       </FormItem>
     )}
   />
   ```

3. Implement a custom `TagInput` component for tag management:
   ```jsx
   // components/ui/tag-input.tsx
   import { X, Plus } from "lucide-react";
   import { useState } from "react";
   import { Badge } from "@/components/ui/badge";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   
   export function TagInput({
     value = [],
     onChange,
     placeholder,
     suggestions = [],
   }) {
     const [inputValue, setInputValue] = useState("");
     
     const handleAddTag = (tag) => {
       if (tag && !value.includes(tag)) {
         onChange([...value, tag]);
       }
       setInputValue("");
     };
     
     const handleRemoveTag = (tag) => {
       onChange(value.filter((t) => t !== tag));
     };
     
     return (
       <div className="border rounded-md p-2">
         <div className="flex flex-wrap gap-2 mb-2">
           {value.map((tag) => (
             <Badge key={tag} variant="secondary" className="gap-1">
               {tag}
               <Button
                 variant="ghost"
                 size="sm"
                 className="h-4 w-4 p-0"
                 onClick={() => handleRemoveTag(tag)}
               >
                 <X className="h-3 w-3" />
               </Button>
             </Badge>
           ))}
         </div>
         
         <div className="flex">
           <Input
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             placeholder={placeholder}
             onKeyDown={(e) => {
               if (e.key === "Enter") {
                 e.preventDefault();
                 handleAddTag(inputValue.trim());
               }
             }}
           />
           <Button
             type="button"
             variant="ghost"
             size="sm"
             onClick={() => handleAddTag(inputValue.trim())}
           >
             <Plus className="h-4 w-4" />
           </Button>
         </div>
         
         {suggestions.length > 0 && (
           <div className="mt-2">
             <p className="text-sm text-muted-foreground mb-1">Suggestions:</p>
             <div className="flex flex-wrap gap-1">
               {suggestions.map((tag) => (
                 <Badge
                   key={tag}
                   variant="outline"
                   className="cursor-pointer"
                   onClick={() => handleAddTag(tag)}
                 >
                   {tag}
                 </Badge>
               ))}
             </div>
           </div>
         )}
       </div>
     );
   }
   ```

## 5. Image Cropping Functionality

### Requirements
- Allow admins to crop uploaded images
- Support zooming and panning
- Preview cropped results before saving

### Implementation
1. Add `react-image-crop` for image cropping:
   ```jsx
   import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
   import 'react-image-crop/dist/ReactCrop.css';
   ```

2. Implement a cropping modal:
   ```jsx
   const [cropModalOpen, setCropModalOpen] = useState(false);
   const [currentImage, setCurrentImage] = useState(null);
   const [crop, setCrop] = useState(null);
   const imgRef = useRef(null);
   
   const handleCropComplete = (crop) => {
     setCrop(crop);
   };
   
   const handleImageCrop = async () => {
     if (!crop || !imgRef.current) return;
     
     const croppedImageBlob = await getCroppedImg(
       imgRef.current,
       crop,
       currentImage.filename
     );
     
     // Replace the image in the uploadedImages array
     const updatedImages = uploadedImages.map(img => 
       img.id === currentImage.id 
         ? { ...img, file: croppedImageBlob, cropped: true } 
         : img
     );
     
     setUploadedImages(updatedImages);
     setCropModalOpen(false);
   };
   
   // Add crop modal to the component
   <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
     <DialogContent className="max-w-3xl">
       <DialogHeader>
         <DialogTitle>Crop Image</DialogTitle>
         <DialogDescription>
           Adjust the crop area to highlight the product. Drag to reposition.
         </DialogDescription>
       </DialogHeader>
       
       <div className="overflow-auto">
         {currentImage && (
           <ReactCrop
             crop={crop}
             onChange={c => setCrop(c)}
             onComplete={handleCropComplete}
             aspect={1} // Optional: fixed aspect ratio
           >
             <img
               ref={imgRef}
               src={currentImage.previewUrl}
               alt="Crop preview"
               className="max-w-full max-h-[60vh]"
             />
           </ReactCrop>
         )}
       </div>
       
       <DialogFooter>
         <Button variant="outline" onClick={() => setCropModalOpen(false)}>
           Cancel
         </Button>
         <Button onClick={handleImageCrop}>
           Apply Crop
         </Button>
       </DialogFooter>
     </DialogContent>
   </Dialog>
   ```

3. Create helper function for cropping:
   ```javascript
   function getCroppedImg(image, crop, fileName) {
     const canvas = document.createElement('canvas');
     const scaleX = image.naturalWidth / image.width;
     const scaleY = image.naturalHeight / image.height;
     
     canvas.width = crop.width;
     canvas.height = crop.height;
     
     const ctx = canvas.getContext('2d');
     
     ctx.drawImage(
       image,
       crop.x * scaleX,
       crop.y * scaleY,
       crop.width * scaleX,
       crop.height * scaleY,
       0,
       0,
       crop.width,
       crop.height
     );
     
     return new Promise((resolve) => {
       canvas.toBlob((blob) => {
         blob.name = fileName;
         resolve(blob);
       }, 'image/jpeg', 0.95);
     });
   }
   ```

## 6. Background Removal Tool

### Requirements
- Use Google Gemini 1.5 Flash API for background removal
- Allow background removal on a per-image basis
- Preview images with and without backgrounds
- Store both versions of the image

### Implementation
1. Create an endpoint for background removal:
   ```typescript
   app.post("/api/ai/remove-background", isAuthenticated, async (req, res) => {
     try {
       const { imageUrl } = req.body;
       
       // Validate Gemini API key
       if (!process.env.GEMINI_API_KEY) {
         return res.status(400).json({ error: "Gemini API key not configured" });
       }
       
       // Initialize Gemini API
       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
       
       // Fetch image data
       const imageResponse = await fetch(imageUrl);
       const imageBuffer = await imageResponse.arrayBuffer();
       
       // Convert to base64 for Gemini API
       const imageContent = {
         inlineData: {
           data: Buffer.from(imageBuffer).toString('base64'),
           mimeType: "image/jpeg" // Adjust based on actual image type
         }
       };
       
       // Create prompt for background removal
       const prompt = `
         Remove the background from this product image. 
         Return only the product with a transparent background.
         Generate a high-quality PNG image with the background removed.
       `;
       
       // Generate content
       const result = await model.generateContent([prompt, imageContent]);
       const response = await result.response;
       
       // Extract base64 image from response
       const matches = response.text().match(/data:image\/png;base64,([^"]*)/);
       
       if (!matches || !matches[1]) {
         return res.status(500).json({ error: "Failed to extract processed image" });
       }
       
       const base64Data = matches[1];
       const imageData = Buffer.from(base64Data, 'base64');
       
       // Get original filename
       const urlParts = imageUrl.split('/');
       const originalFilename = urlParts[urlParts.length - 1];
       const filenameWithoutExt = originalFilename.split('.')[0];
       
       // Upload to Replit Object Store
       const objectKey = `products/bg-removed/${filenameWithoutExt}_nobg.png`;
       
       await objectStore.put(
         objectKey,
         imageData,
         { contentType: 'image/png' }
       );
       
       const processedUrl = objectStore.getUrl(objectKey);
       
       res.status(200).json({ 
         originalUrl: imageUrl,
         processedUrl: processedUrl
       });
     } catch (error) {
       console.error("Background removal error:", error);
       res.status(500).json({ error: error.message || "Failed to remove background" });
     }
   });
   ```

2. Add UI components for background removal:
   ```jsx
   const [processingBgRemoval, setProcessingBgRemoval] = useState({});
   
   const removeBackground = async (imageId) => {
     const image = uploadedImages.find(img => img.id === imageId);
     if (!image) return;
     
     setProcessingBgRemoval(prev => ({ ...prev, [imageId]: true }));
     
     try {
       const response = await fetch('/api/ai/remove-background', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ imageUrl: image.url })
       });
       
       if (!response.ok) throw new Error('Failed to remove background');
       
       const data = await response.json();
       
       // Update image with bg-removed version
       setUploadedImages(prev => prev.map(img => 
         img.id === imageId 
           ? { ...img, bgRemovedUrl: data.processedUrl, hasBgRemoved: true } 
           : img
       ));
     } catch (error) {
       toast({
         title: "Background removal failed",
         description: error.message,
         variant: "destructive"
       });
     } finally {
       setProcessingBgRemoval(prev => ({ ...prev, [imageId]: false }));
     }
   };
   
   // Add background removal button to image preview
   <div className="absolute bottom-2 right-2 flex space-x-1">
     <Button
       size="sm"
       variant="secondary"
       disabled={processingBgRemoval[image.id]}
       onClick={() => removeBackground(image.id)}
     >
       {processingBgRemoval[image.id] ? (
         <Loader2 className="h-3 w-3 animate-spin" />
       ) : (
         image.hasBgRemoved ? "Toggle BG" : "Remove BG"
       )}
     </Button>
   </div>
   ```

3. Implement image toggle between original and background-removed versions:
   ```jsx
   const [showBgRemoved, setShowBgRemoved] = useState({});
   
   // In the image preview component
   <img
     src={image.hasBgRemoved && showBgRemoved[image.id] 
       ? image.bgRemovedUrl 
       : image.url}
     alt={`Product image ${index + 1}`}
     className="object-contain w-full h-full"
   />
   
   {image.hasBgRemoved && (
     <Button
       size="sm"
       variant="ghost"
       className="absolute bottom-2 left-2"
       onClick={() => setShowBgRemoved(prev => ({
         ...prev,
         [image.id]: !prev[image.id]
       }))}
     >
       {showBgRemoved[image.id] ? "Show Original" : "Show No BG"}
     </Button>
   )}
   ```

## 7. Main Image Selection

### Requirements
- Allow admin to select one image as the main product image
- Clearly indicate which image is the main one
- Ensure the main image is properly stored and referenced

### Implementation
1. Add main image selection functionality:
   ```jsx
   const setMainImage = (imageId) => {
     setUploadedImages(prev => prev.map(img => ({
       ...img,
       isMain: img.id === imageId
     })));
   };
   
   // Add to image preview component
   <div className="absolute top-2 left-2">
     <Button
       size="sm"
       variant={image.isMain ? "default" : "outline"}
       onClick={() => setMainImage(image.id)}
     >
       {image.isMain ? (
         <>
           <Check className="h-3 w-3 mr-1" />
           Main
         </>
       ) : (
         "Set as Main"
       )}
     </Button>
   </div>
   ```

2. Update product submission to properly identify the main image:
   ```typescript
   // During form submission
   const onSubmitProduct = (data) => {
     // Find the main image
     const mainImage = uploadedImages.find(img => img.isMain);
     
     // Prepare image data for submission
     const images = uploadedImages.map(img => ({
       url: img.hasBgRemoved && img.useNoBackground ? img.bgRemovedUrl : img.url,
       isMain: img.isMain,
       objectKey: img.objectKey
     }));
     
     // Add to form data
     const formData = {
       ...data,
       imageUrl: mainImage ? mainImage.url : null,
       additionalImages: images.filter(img => !img.isMain).map(img => img.url)
     };
     
     createProduct(formData);
   };
   ```

## 8. Complete UI Flow

### Requirements
- Create a stepped wizard for better user experience
- Guide admins through the product creation process
- Validate each step before proceeding

### Implementation
1. Create a multi-step form structure:
   ```jsx
   const steps = [
     { id: 'basic-info', label: 'Basic Info' },
     { id: 'images', label: 'Images' },
     { id: 'ai-analysis', label: 'AI Analysis' },
     { id: 'details', label: 'Additional Details' },
     { id: 'review', label: 'Review' }
   ];
   
   const [currentStep, setCurrentStep] = useState(0);
   
   const goToNextStep = async () => {
     // Validate current step
     const fieldsToValidate = {
       0: ['name', 'slug', 'categoryId', 'price', 'stock'],
       1: [], // Images step doesn't require validation
       2: [], // AI analysis step doesn't require validation
       3: ['description'],
       4: []  // Review step doesn't require validation
     }[currentStep];
     
     const result = await form.trigger(fieldsToValidate);
     if (!result) return;
     
     // For the images step, validate that at least one image is uploaded
     if (currentStep === 1 && uploadedImages.length === 0) {
       toast({
         title: "Please upload at least one image",
         variant: "destructive"
       });
       return;
     }
     
     setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
   };
   
   const goToPreviousStep = () => {
     setCurrentStep(prev => Math.max(prev - 1, 0));
   };
   ```

2. Add step navigation UI:
   ```jsx
   <nav aria-label="Progress">
     <ol role="list" className="flex space-x-2 mb-6">
       {steps.map((step, index) => (
         <li key={step.id} className="flex-1">
           <div
             className={cn(
               "group flex flex-col border rounded-md p-2 cursor-pointer",
               currentStep === index
                 ? "border-primary bg-primary/5"
                 : index < currentStep
                 ? "border-green-500/30 bg-green-50"
                 : "border-gray-200"
             )}
             onClick={() => {
               // Only allow going back or to completed steps
               if (index <= currentStep) {
                 setCurrentStep(index);
               }
             }}
           >
             <span className="text-xs font-medium">
               Step {index + 1}
             </span>
             <span className={cn(
               "text-sm",
               currentStep === index 
                 ? "text-primary font-medium" 
                 : "text-muted-foreground"
             )}>
               {step.label}
             </span>
           </div>
         </li>
       ))}
     </ol>
   </nav>
   ```

3. Create step content components:
   ```jsx
   const StepContent = () => {
     switch (currentStep) {
       case 0:
         return <BasicInfoStep form={form} />;
       case 1:
         return <ImagesStep 
           uploadedImages={uploadedImages} 
           setUploadedImages={setUploadedImages}
           removeBackground={removeBackground}
           setMainImage={setMainImage}
           processingBgRemoval={processingBgRemoval}
           analyzeImagesWithAI={analyzeImagesWithAI}
           aiAnalysisLoading={aiAnalysisLoading}
         />;
       case 2:
         return <AIAnalysisStep 
           aiSuggestions={aiSuggestions}
           applyAISuggestion={applyAISuggestion}
           applyAllAISuggestions={applyAllAISuggestions}
           form={form}
         />;
       case 3:
         return <DetailsStep form={form} />;
       case 4:
         return <ReviewStep 
           form={form} 
           uploadedImages={uploadedImages}
         />;
       default:
         return null;
     }
   };
   ```

4. Implement step navigation buttons:
   ```jsx
   <div className="flex justify-between mt-6">
     {currentStep > 0 && (
       <Button type="button" variant="outline" onClick={goToPreviousStep}>
         Previous
       </Button>
     )}
     
     <div className="flex-1" />
     
     {currentStep < steps.length - 1 ? (
       <Button type="button" onClick={goToNextStep}>
         Continue
       </Button>
     ) : (
       <Button 
         type="button" 
         disabled={isPending}
         onClick={handleSubmit(onSubmitProduct)}
       >
         {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
         Create Product
       </Button>
     )}
   </div>
   ```

## 9. Implementation Timeline

1. **Week 1: Foundation**
   - Update database schema for tags and multiple images
   - Implement basic image upload with Replit Object Store
   - Create multi-step form structure
   
2. **Week 2: Image Processing**
   - Implement image cropping functionality
   - Add main image selection
   - Create modals for image editing
   
3. **Week 3: AI Integration**
   - Set up Google Gemini API integration
   - Implement background removal feature
   - Add AI-powered product analysis
   
4. **Week 4: Refinement & Testing**
   - Implement tag input and management
   - Refine UI and UX
   - Comprehensive testing and bug fixing

## 10. Required Dependencies

1. **Client-side Dependencies**
   ```bash
   npm install react-dropzone react-image-crop react-datepicker @google/generative-ai
   ```

2. **Server-side Dependencies**
   ```bash
   npm install multer sharp @replit/object-storage
   ```

3. **Environment Variables**
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```

---

This implementation plan covers all the requested features for the product management system. Each feature is designed to work with the existing codebase and follows best practices for React development with a focus on using open-source solutions.