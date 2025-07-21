/**
 * Shared data transformation utility functions for the HeartCart application
 * Common patterns for transforming data between formats and structures
 */

/**
 * Group an array of objects by a specified key
 */
export function groupBy<T>(
  array: T[],
  key: keyof T
): { [key: string]: T[] } {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as { [key: string]: T[] });
}

/**
 * Sort array of objects by a property
 */
export function sortBy<T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    // Handle undefined/null values (sort them at the end)
    if (aValue === undefined || aValue === null) return direction === 'asc' ? 1 : -1;
    if (bValue === undefined || bValue === null) return direction === 'asc' ? -1 : 1;
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Paginate an array
 */
export function paginateArray<T>(
  array: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; totalPages: number } {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = array.slice(startIndex, endIndex);
  const totalPages = Math.ceil(array.length / pageSize);
  
  return {
    data: paginatedData,
    total: array.length,
    totalPages
  };
}

/**
 * Convert array to lookup object by ID or specified key
 */
export function arrayToObject<T extends { id: number | string } | { [key: string]: any }>(
  array: T[],
  key: keyof T = 'id' as keyof T
): { [key: string]: T } {
  return array.reduce((obj, item) => {
    const itemKey = String(item[key]);
    obj[itemKey] = item;
    return obj;
  }, {} as { [key: string]: T });
}

/**
 * Flatten a nested array of objects
 */
export function flattenArrays<T>(arrays: T[][]): T[] {
  return ([] as T[]).concat(...arrays);
}

/**
 * Create a hierarchical tree from a flat array using parent-child relationships
 */
export function createTree<T extends { id: number | string; parentId?: number | string | null }>(
  items: T[],
  parentIdKey: keyof T = 'parentId' as keyof T
): (T & { children: (T & { children: any[] })[] })[] {
  const itemMap: { [key: string]: T & { children: any[] } } = {};
  
  // Create temporary items with children array
  items.forEach(item => {
    itemMap[String(item.id)] = { ...item, children: [] };
  });
  
  // Build the tree
  const tree: (T & { children: any[] })[] = [];
  
  items.forEach(item => {
    const id = String(item.id);
    const parentId = item[parentIdKey] as string | number | null | undefined;
    
    if (!parentId) {
      // Root item
      tree.push(itemMap[id]);
    } else {
      // Child item
      const parentIdStr = String(parentId);
      if (itemMap[parentIdStr]) {
        itemMap[parentIdStr].children.push(itemMap[id]);
      }
    }
  });
  
  return tree;
}

/**
 * Transform API data to client-friendly structure
 */
export function transformApiData<T, R>(
  data: T,
  transformer: (item: T) => R
): R {
  return transformer(data);
}

/**
 * Transform array of API data to client-friendly structure
 */
export function transformApiDataArray<T, R>(
  data: T[],
  transformer: (item: T) => R
): R[] {
  return data.map(transformer);
}

/**
 * Extract unique values from an array of objects by key
 */
export function extractUniqueValues<T>(
  array: T[],
  key: keyof T
): Array<T[keyof T]> {
  const valueSet = new Set<T[keyof T]>();
  
  array.forEach(item => {
    if (item[key] !== undefined && item[key] !== null) {
      valueSet.add(item[key]);
    }
  });
  
  return Array.from(valueSet);
}

/**
 * Filter array of objects by multiple criteria
 */
export function filterBy<T>(
  array: T[],
  filters: Partial<Record<keyof T, any>>
): T[] {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      const itemKey = key as keyof T;
      
      // Skip undefined or null filter values
      if (value === undefined || value === null) return true;
      
      // Handle array values (any match)
      if (Array.isArray(value)) {
        return value.includes(item[itemKey]);
      }
      
      // Handle regular comparison
      return item[itemKey] === value;
    });
  });
}

/**
 * Search array of objects for a text query across multiple fields
 */
export function searchObjects<T>(
  array: T[],
  query: string,
  fields: Array<keyof T>
): T[] {
  if (!query) return array;
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return array.filter(item => {
    return fields.some(field => {
      const value = item[field];
      
      if (value === null || value === undefined) return false;
      
      return String(value).toLowerCase().includes(normalizedQuery);
    });
  });
}

/**
 * Calculate statistics from an array of numbers
 */
export function calculateStats(
  values: Array<number | null | undefined>
): {
  min: number;
  max: number;
  average: number;
  median: number;
  sum: number;
  count: number;
} {
  // Filter out null/undefined values
  const validValues = values.filter((v): v is number => 
    v !== null && v !== undefined
  );
  
  if (validValues.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      sum: 0,
      count: 0
    };
  }
  
  // Sort values for calculating median
  const sortedValues = [...validValues].sort((a, b) => a - b);
  
  // Calculate statistics
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const sum = sortedValues.reduce((acc, val) => acc + val, 0);
  const average = sum / sortedValues.length;
  
  // Calculate median
  const midIndex = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[midIndex - 1] + sortedValues[midIndex]) / 2
    : sortedValues[midIndex];
  
  return {
    min,
    max,
    average,
    median,
    sum,
    count: sortedValues.length
  };
}

/**
 * Convert form data to API request format
 */
export function formToApiRequest<T extends object, R extends object>(
  formData: T,
  transformer: (data: T) => R
): R {
  return transformer(formData);
}

/**
 * Convert API response to form data format
 */
export function apiToFormData<T extends object, R extends object>(
  apiData: T,
  transformer: (data: T) => R
): R {
  return transformer(apiData);
}

/**
 * Remove specified properties from an object
 */
export function omitProperties<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj } as Omit<T, K>;
  keys.forEach(key => {
    delete result[key as keyof Omit<T, K>];
  });
  return result;
}

/**
 * Pick only specified properties from an object
 */
export function pickProperties<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((result, key) => {
    result[key] = obj[key];
    return result;
  }, {} as Pick<T, K>);
}