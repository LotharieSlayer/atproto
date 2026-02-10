import { describe, expect, it } from 'vitest'
import { buildMimeMatcher, extractMimeType } from './mime.js'

describe(buildMimeMatcher, () => {
  it('matches exact MIME types', () => {
    const matcher = buildMimeMatcher('application/json')
    expect(matcher('application/json')).toBe(true)
    expect(matcher('text/plain')).toBe(false)
  })

  it('matches wildcard MIME types', () => {
    const matcher = buildMimeMatcher('image/*')
    expect(matcher('image/png')).toBe(true)
    expect(matcher('image/jpeg')).toBe(true)
    expect(matcher('text/plain')).toBe(false)
  })

  it('matches multiple MIME types', () => {
    const matcher = buildMimeMatcher('application/json, text/*')
    expect(matcher('application/json')).toBe(true)
    expect(matcher('text/plain')).toBe(true)
    expect(matcher('image/png')).toBe(false)
  })

  it('matches any MIME type with */*', () => {
    const matcher = buildMimeMatcher('*/*')
    expect(matcher('application/json')).toBe(true)
    expect(matcher('text/plain')).toBe(true)
    expect(matcher('image/png')).toBe(true)
  })

  it('trims whitespace from encodings', () => {
    const matcher = buildMimeMatcher(' application/json , text/* ')
    expect(matcher('application/json')).toBe(true)
    expect(matcher('text/plain')).toBe(true)
    expect(matcher('image/png')).toBe(false)
  })
})

describe(extractMimeType, () => {
  it('extracts MIME type from content type with parameters', () => {
    const contentType = 'application/json; charset=utf-8'
    const mimeType = extractMimeType(contentType)
    expect(mimeType).toBe('application/json')
  })

  it('returns null for invalid content type', () => {
    const contentType = 'invalid-content-type'
    const mimeType = extractMimeType(contentType)
    expect(mimeType).toBeNull()
  })

  it('returns null for content type with wildcard MIME type', () => {
    const contentType = '*/json'
    const mimeType = extractMimeType(contentType)
    expect(mimeType).toBeNull()
  })

  it('trims whitespace from content type', () => {
    const contentType = '  application/json  ; charset=utf-8  '
    const mimeType = extractMimeType(contentType)
    expect(mimeType).toBe('application/json')
  })

  it('returns null for content type with two slashes in MIME type', () => {
    expect(extractMimeType('application//json')).toBeNull()
    expect(extractMimeType('application/js/on')).toBeNull()
  })

  it('rejects content with missing MIME parts', () => {
    expect(extractMimeType('application')).toBeNull()
    expect(extractMimeType('application/')).toBeNull()
    expect(extractMimeType('application/a')).toBe('application/a')
    expect(extractMimeType('/json')).toBeNull()
  })
})
