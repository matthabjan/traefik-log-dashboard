/**
 * Shared IP utility functions
 * Consolidated from location.ts and filter-utils.ts to eliminate duplication
 */

/**
 * Check if an IP is private/local
 * Uses the more complete IPv6-aware version from location.ts
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip) return true;

  // 172.16.0.0/12 requires second octet precision.
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      const second = parseInt(parts[1], 10);
      return Number.isFinite(second) && second >= 16 && second <= 31;
    }
    return false;
  }

  // Other IPv4 private ranges
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('127.') ||
    ip === 'localhost'
  ) {
    return true;
  }
  
  // IPv6 loopback, unspecified, unique local (fc00::/7) and link-local (fe80::/10)
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower === '::' || /^f[cd][0-9a-f]{2}:/.test(lower) || /^fe[89ab][0-9a-f]:/.test(lower);
  }

  return false;
}

/**
 * Check if an IPv4 address matches a CIDR range or exact IP
 */
export function matchesIPRange(ip: string, range: string): boolean {
  if (!ip || !range) return false;

  // Exact match
  if (ip === range) return true;

  // CIDR match (IPv4 only; IPv6 addresses never match a CIDR range)
  if (range.includes('/')) {
    if (ip.includes(':')) return false;

    const [subnet, prefixStr] = range.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) return false;

    const ipNum = ipToNumber(ip);
    const subnetNum = ipToNumber(subnet);
    if (ipNum === null || subnetNum === null) return false;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipNum & mask) === (subnetNum & mask);
  }

  return false;
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (!Number.isFinite(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) + octet;
  }
  return num >>> 0;
}

/**
 * Check if an IP matches any entry in a list of CIDR ranges or exact IPs
 */
export function matchesAnyIPRange(ip: string, ranges: string[]): boolean {
  return ranges.some((range) => matchesIPRange(ip, range.trim()));
}

/**
 * Extract IP address from client address string
 * Handles bracketed IPv6 with port, IPv4 with port, zone IDs and IPv4-mapped IPv6
 */
export function extractIP(clientAddr: string): string {
  if (!clientAddr) return '';

  let ip = clientAddr.trim();
  const firstColon = ip.indexOf(':');

  // "[v6]:port" or "[v6]"
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']');
    if (end !== -1) ip = ip.substring(1, end);
  } else if (firstColon !== -1 && firstColon === ip.lastIndexOf(':')) {
    // Exactly one colon: IPv4 with port
    return ip.substring(0, firstColon);
  }

  // Two or more colons: IPv6, keep as is apart from the zone ID
  const zoneIndex = ip.indexOf('%');
  if (zoneIndex !== -1) ip = ip.substring(0, zoneIndex);

  // IPv4-mapped IPv6
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return mapped ? mapped[1] : ip;
}
