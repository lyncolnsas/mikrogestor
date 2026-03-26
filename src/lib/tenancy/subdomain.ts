/**
 * Utility to extract subdomain from hostname.
 * Supports localhost:3000, www.mikrogestor.com, and tenant-slug.mikrogestor.com.
 */
export function getSubdomain(host: string, baseDomain?: string): string | null {
    // 1. Remove port if exists
    const hostName = host.split(":")[0];

    // 2. Handle localhost or custom IP/Hostname for local development
    if (hostName.endsWith('.localhost')) {
        const parts = hostName.split('.');
        // Extract subdomain (e.g., 'tenant1.localhost' -> 'tenant1')
        return parts.length > 1 ? parts[0] : null;
    }

    // 3. Handle Production domain
    // Default base domain if not provided (configurable via env later)
    const productionDomain = baseDomain || process.env.NEXT_PUBLIC_BASE_DOMAIN || "mikrogestor.com.br";

    if (!hostName.endsWith(productionDomain)) return null;

    // Remove the base domain part
    const subdomainPart = hostName.replace(`.${productionDomain}`, "");

    // Handle "www" as a special case (usually ignored or treated as root)
    if (subdomainPart === "www" || subdomainPart === hostName) return null;

    // Return the subdomain if it's there
    return subdomainPart || null;
}
