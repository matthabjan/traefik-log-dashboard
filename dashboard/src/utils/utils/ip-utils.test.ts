import { describe, expect, it } from 'vitest';
import { extractIP, isPrivateIP, matchesIPRange } from './ip-utils';

describe('isPrivateIP', () => {
  it('marks only 172.16.0.0/12 as private in the 172 range', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
    expect(isPrivateIP('172.15.255.255')).toBe(false);
    expect(isPrivateIP('172.32.0.0')).toBe(false);
    expect(isPrivateIP('172.67.10.10')).toBe(false);
  });

  it('marks IPv6 loopback, unique local and link-local addresses as private', () => {
    expect(isPrivateIP('fd12:3456::1')).toBe(true);
    expect(isPrivateIP('FC00::1')).toBe(true);
    expect(isPrivateIP('fe80::1')).toBe(true);
    expect(isPrivateIP('febf::1')).toBe(true);
    expect(isPrivateIP('::1')).toBe(true);
  });

  it('treats other IPv6 addresses as public', () => {
    expect(isPrivateIP('2a01:599:90e:d9b4:6c10:784f:761:62c9')).toBe(false);
    expect(isPrivateIP('fec0::1')).toBe(false);
    expect(isPrivateIP('2001:db8::1')).toBe(false);
  });
});

describe('extractIP', () => {
  it('extracts IPv4 and IPv6 addresses from client address fields', () => {
    expect(extractIP('1.1.1.1:443')).toBe('1.1.1.1');
    expect(extractIP('[2001:4860:4860::8888]:443')).toBe('2001:4860:4860::8888');
    expect(extractIP('2001:4860:4860::8888')).toBe('2001:4860:4860::8888');
  });

  it('keeps full-length and compressed IPv6 addresses intact', () => {
    expect(extractIP('2a01:599:90e:d9b4:6c10:784f:761:62c9')).toBe('2a01:599:90e:d9b4:6c10:784f:761:62c9');
    expect(extractIP('2a01:599::62c9')).toBe('2a01:599::62c9');
    expect(extractIP('::1')).toBe('::1');
  });

  it('strips brackets, ports and zone IDs', () => {
    expect(extractIP('[2a01::1]:443')).toBe('2a01::1');
    expect(extractIP('1.2.3.4:5555')).toBe('1.2.3.4');
    expect(extractIP('1.2.3.4')).toBe('1.2.3.4');
    expect(extractIP('fe80::1%eth0')).toBe('fe80::1');
  });

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(extractIP('::ffff:192.168.1.10')).toBe('192.168.1.10');
  });

  it('returns an empty string for empty input', () => {
    expect(extractIP('')).toBe('');
  });
});

describe('matchesIPRange', () => {
  it('never matches an IPv6 address against an IPv4 CIDR range', () => {
    expect(matchesIPRange('10.1.2.3', '10.0.0.0/8')).toBe(true);
    expect(matchesIPRange('fd12::5', '0.0.0.0/0')).toBe(false);
    expect(matchesIPRange('10::1', '10.0.0.0/8')).toBe(false);
  });
});
