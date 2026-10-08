import { describe, expect, it } from 'vitest';
import { parsePerson } from '../src/person';

describe('parsePerson', () => {
  it('trims and keeps a valid person', () => {
    expect(parsePerson({ name: '  Ada  ', email: ' ada@example.com ', age: 36 })).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      age: 36,
    });
  });

  it('leaves age out when it is not given', () => {
    expect(parsePerson({ name: 'Ada', email: 'ada@example.com' })).toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('rejects a missing or blank name', () => {
    expect(parsePerson({ email: 'ada@example.com' })).toBe('name is required');
    expect(parsePerson({ name: '   ', email: 'ada@example.com' })).toBe('name is required');
  });

  it('rejects an email without @', () => {
    expect(parsePerson({ name: 'Ada', email: 'ada.example.com' })).toBe('a valid email is required');
  });

  it('rejects a negative or non-numeric age', () => {
    expect(parsePerson({ name: 'Ada', email: 'ada@example.com', age: -1 })).toBe('age must be a positive number');
    expect(parsePerson({ name: 'Ada', email: 'ada@example.com', age: '36' })).toBe('age must be a positive number');
  });

  it('rejects an empty body', () => {
    expect(parsePerson(undefined)).toBe('name is required');
  });
});
