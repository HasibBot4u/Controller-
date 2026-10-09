import { describe, it, expect } from 'vitest';
import { validateRelativeFilePath, FileSafetyError } from './path-validator.ts';

describe('File Safety Path Validator', () => {
  it('accepts valid project relative paths', () => {
    expect(validateRelativeFilePath('src/main.ts')).toBe('src/main.ts');
    expect(validateRelativeFilePath('docs/architecture/spec.md')).toBe('docs/architecture/spec.md');
    expect(validateRelativeFilePath('package.json')).toBe('package.json');
  });

  it('accepts safe paths with double dots in filename such as foo..bar', () => {
    expect(validateRelativeFilePath('foo..bar')).toBe('foo..bar');
    expect(validateRelativeFilePath('docs/archive..notes.md')).toBe('docs/archive..notes.md');
  });

  it('rejects directory traversal sequences in plain and percent-encoded forms', () => {
    expect(() => validateRelativeFilePath('../secret')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('..%2Fsecret')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('%2e%2e/secret')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('src/../../etc/passwd')).toThrow(FileSafetyError);
  });

  it('rejects absolute paths, Windows drive roots, and leading backslashes', () => {
    expect(() => validateRelativeFilePath('/absolute/path')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('\\absolute')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('C:\\secret')).toThrow(FileSafetyError);
  });

  it('rejects null byte injections', () => {
    expect(() => validateRelativeFilePath('src/app.ts\0.exe')).toThrow(FileSafetyError);
  });

  it('rejects malformed percent encoding', () => {
    expect(() => validateRelativeFilePath('src/%E0%A4%A')).toThrow(FileSafetyError);
  });

  it('rejects excessively long file paths', () => {
    const longPath = 'a/'.repeat(600);
    expect(() => validateRelativeFilePath(longPath)).toThrow(FileSafetyError);
  });
});
