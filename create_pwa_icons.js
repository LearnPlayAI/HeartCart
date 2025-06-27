const fs = require('fs');
const path = require('path');

// Create PWA icons using the company logo
// This script will use the attached company logo to create proper PWA icons

console.log('Creating PWA icons from company logo...');

// Copy the company logo to the proper PWA icon locations
const logoPath = 'attached_assets/image_1751027972512.png';
const publicDir = 'client/public';

// Icon sizes needed for PWA
const iconSizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
];

try {
  // Copy the logo as base icons
  const logoData = fs.readFileSync(logoPath);
  
  iconSizes.forEach(icon => {
    const iconPath = path.join(publicDir, icon.name);
    fs.writeFileSync(iconPath, logoData);
    console.log(`Created ${icon.name}`);
  });
  
  console.log('PWA icons created successfully!');
} catch (error) {
  console.error('Error creating PWA icons:', error);
}