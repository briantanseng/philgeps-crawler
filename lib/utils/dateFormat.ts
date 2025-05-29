/**
 * Format date consistently for both server and client
 * Avoids hydration errors by using a consistent format
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = new Date(dateString);
    
    // Use consistent formatting that doesn't depend on locale
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid date';
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function formatNumber(num: number): string {
  // Use a consistent number format that doesn't depend on locale
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}