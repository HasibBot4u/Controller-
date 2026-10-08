import { describe, it, expect } from 'vitest';
import { validateRelativeFilePath, FileSafetyError } from './path-validator.ts';

describe('File Safety Path Validator', () => {
  it('accepts valid project relative paths', () => {
    expect(validateRelativeFilePath('src/main.ts')).toBe('src/main.ts');
    expect(validateRelativeFilePath('docs/architecture/spec.md')).toBe('docs/architecture/spec.md');
    expect(validateRelativeFilePath('package.json')).toBe('package.json');
  });

  it('rejects directory traversal sequences', () => {
    expect(() => validateRelativeFilePath('../secret.txt')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('src/../../etc/passwd')).toThrow(FileSafetyError);
  });

  it('rejects absolute paths and Windows drive roots', () => {
    expect(() => validateRelativeFilePath('/etc/hosts')).toThrow(FileSafetyError);
    expect(() => validateRelativeFilePath('C:\\Windows\\system32')).toThrow(FileSafetyError);
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
