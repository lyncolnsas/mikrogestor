import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deeply serializes an object, converting Prisma Decimal objects to strings.
 * This is CRITICAL for Next.js Server-to-Client component boundaries.
 */
export function serializeDecimal(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Fast check for common primitives
  if (typeof obj !== 'object') return obj;

  // Handle Date - React supports native Date
  if (obj instanceof Date) return obj;

  // Handle Prisma Decimal / decimal.js
  // Robust check for Decimal: constructor name, or characteristic properties (s, e, d are internal to decimal.js)
  const isDecimal =
    obj.constructor?.name === 'Decimal' ||
    obj.constructor?.name === 'd' ||
    (typeof obj.toFixed === 'function' && typeof obj.toNumber === 'function' && (obj.d || obj.s || obj.e));

  if (isDecimal) {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal);
  }

  // Handle generic objects
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = serializeDecimal(obj[key]);
    }
  }
  return newObj;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

