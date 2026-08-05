import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeText,
  hasVisibleContent,
  truncate,
  generatePublicId,
  escapeHtml,
} from '../app/lib/sanitize';

describe('Sanitize Module', () => {
  it('sanitizeText strips HTML tags', () => {
    const raw = '<script>alert("xss")</script>Hello <b>world</b>!';
    const clean = sanitizeText(raw);
    assert.strictEqual(clean, 'alert("xss")Hello world!');
  });

  it('sanitizeText removes null bytes and collapses excessive whitespace', () => {
    const raw = '   Hello\0   world!  \n\n\n\n\nNew paragraph.   ';
    const clean = sanitizeText(raw);
    assert.strictEqual(clean, 'Hello world!\n\nNew paragraph.');
  });

  it('hasVisibleContent correctly identifies meaningful content', () => {
    assert.strictEqual(hasVisibleContent('   '), false);
    assert.strictEqual(hasVisibleContent('\u200B\u200C\u200D'), false);
    assert.strictEqual(hasVisibleContent('Hello'), true);
    assert.strictEqual(hasVisibleContent('  a  '), true);
  });

  it('truncate correctly limits string length', () => {
    assert.strictEqual(truncate('Hello world', 5), 'Hello');
    assert.strictEqual(truncate('Hello', 10), 'Hello');
  });

  it('generatePublicId produces a valid base64url string', () => {
    const id = generatePublicId();
    assert.strictEqual(id.length, 16);
    assert.strictEqual(/^[A-Za-z0-9_-]+$/.test(id), true);
  });

  it('escapeHtml escapes dangerous HTML characters', () => {
    const raw = '<div class="test">& "hello" \'world\'</div>';
    const escaped = escapeHtml(raw);
    assert.strictEqual(
      escaped,
      '&lt;div class=&quot;test&quot;&gt;&amp; &quot;hello&quot; &#39;world&#39;&lt;/div&gt;'
    );
  });
});
