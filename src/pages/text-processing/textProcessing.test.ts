import { describe, it, expect } from 'vitest';
import { trimLines } from './textProcessing';

describe('trimLines', () => {
  it('should trim trailing spaces from multiple lines', () => {
    const input = "line one   \nline two  \nline three ";
    const expected = "line one\nline two\nline three";
    expect(trimLines(input)).toBe(expected);
  });

  it('should not affect leading whitespace', () => {
    const input = "  indented line\n    more indentation  ";
    const expected = "  indented line\n    more indentation";
    expect(trimLines(input)).toBe(expected);
  });

  it('should handle tabs as trailing whitespace', () => {
    const input = "line with tab\t\nnext line";
    const expected = "line with tab\nnext line";
    expect(trimLines(input)).toBe(expected);
  });

  it('should return an empty string when input is empty', () => {
    expect(trimLines("")).toBe("");
  });

  it('should preserve empty lines', () => {
    const input = "line one\n\nline three  ";
    const expected = "line one\n\nline three";
    expect(trimLines(input)).toBe(expected);
  });

  it('should handle strings with only whitespace', () => {
    const input = "   \n   ";
    const expected = "\n";
    expect(trimLines(input)).toBe(expected);
  });

  it('should handle a single line with no newline character', () => {
    const input = "no newline   ";
    const expected = "no newline";
    expect(trimLines(input)).toBe(expected);
  });
});
