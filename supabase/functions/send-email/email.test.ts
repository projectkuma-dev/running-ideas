/**
 * Unit tests for the pure email composer.
 * Run with:  node --test supabase/functions/send-email/email.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmail, type Idea } from './email.ts';

// Fixed timestamps so assertions are stable regardless of when tests run.
const t1 = new Date('2026-06-21T14:05:00').getTime();
const t2 = new Date('2026-06-21T14:09:00').getTime();

test('composes subject with idea count', () => {
  const ideas: Idea[] = [
    { text: 'first', ts: t1 },
    { text: 'second', ts: t2 },
  ];
  const { subject } = buildEmail(ideas);
  assert.match(subject, /Running Ideas/);
  assert.match(subject, /\(2\)$/);
});

test('plain text lists ideas in order, numbered', () => {
  const ideas: Idea[] = [
    { text: 'alpha', ts: t1 },
    { text: 'beta', ts: t2 },
  ];
  const { text } = buildEmail(ideas);
  assert.match(text, /1\. \[.*\] alpha/);
  assert.match(text, /2\. \[.*\] beta/);
  // alpha must appear before beta
  assert.ok(text.indexOf('alpha') < text.indexOf('beta'));
});

test('singular vs plural wording', () => {
  const one = buildEmail([{ text: 'solo', ts: t1 }]);
  assert.match(one.text, /1 idea captured/);
  const many = buildEmail([{ text: 'a', ts: t1 }, { text: 'b', ts: t2 }]);
  assert.match(many.text, /2 ideas captured/);
});

test('HTML-escapes user text but leaves plain text raw', () => {
  const ideas: Idea[] = [{ text: 'tom & jerry <script>alert(1)</script>', ts: t1 }];
  const { html, text } = buildEmail(ideas);
  assert.ok(html.includes('tom &amp; jerry &lt;script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  // plain text is not a markup context, so it stays literal
  assert.ok(text.includes('tom & jerry <script>alert(1)</script>'));
});

test('throws on empty input', () => {
  assert.throws(() => buildEmail([]), /no ideas/);
});
