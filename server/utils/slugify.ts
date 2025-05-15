/**
 * Create a slug from a string
 * Converts spaces to hyphens, removes special characters,
 * and ensures consistent formatting for URL-friendly strings
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple hyphens with single hyphen
}