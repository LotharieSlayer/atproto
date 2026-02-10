export type MimeMatcher = (mime: string) => boolean

const anyEncodingMatcher: MimeMatcher = () => true
const noEncodingMatcher: MimeMatcher = () => false

export function buildMimeMatcher(allowedEncodings: string): MimeMatcher {
  // /!\ Both building and executing the matchers are on hot paths. This is why
  // we avoid creating closures (they are expensive to garbage collect in JS).

  // If the allowed encodings include '*/*', we can match any encoding without
  // further checks.
  if (allowedEncodings.includes('*/*')) {
    return anyEncodingMatcher
  }

  // If there's only one allowed encoding and it's a specific MIME type (no
  // wildcards), we can create a simple matcher that checks for equality. This
  // is the most common case for XRPC methods.
  if (!allowedEncodings.includes(',') && isMimeLime(allowedEncodings)) {
    const encoding = allowedEncodings.trim()
    return (mime) => mime === encoding
  }

  const encodings = allowedEncodings.split(',').map(trim)
  if (!encodings.length) return noEncodingMatcher

  const exactEncodingMatcher = buildExactEncodingMatcher(encodings)
  const wildcardEncodingMatcher = buildWildcardEncodingMatcher(encodings)

  return exactEncodingMatcher && wildcardEncodingMatcher
    ? (mime) => exactEncodingMatcher(mime) || wildcardEncodingMatcher(mime)
    : wildcardEncodingMatcher ?? exactEncodingMatcher ?? noEncodingMatcher
}

function buildExactEncodingMatcher(
  encodings: readonly string[],
): null | MimeMatcher {
  const mimes = encodings.filter(isMimeLime)
  if (!mimes.length) return null
  return exactEncodingMatcher.bind(new Set(mimes))
}

function exactEncodingMatcher(this: Set<string>, mime: string): boolean {
  return this.has(mime)
}

function buildWildcardEncodingMatcher(
  encodings: readonly string[],
): null | MimeMatcher {
  const prefixes = encodings.filter(isWildcardEncoding).map(stripLastChar)
  if (!prefixes.length) return null
  return wildcardEncodingMatcher.bind(new Set(prefixes))
}

function wildcardEncodingMatcher(this: Set<string>, mime: string): boolean {
  for (const prefix of this) if (mime.startsWith(prefix)) return true
  return false
}

function trim(str: string): string {
  return str.trim()
}

function isWildcardEncoding(encoding: string): encoding is `${string}/*` {
  return encoding.endsWith('/*') && !encoding.startsWith('*/')
}

function isMimeLime(encoding: string): boolean {
  return (
    !encoding.includes('*') && !encoding.includes(' ') && encoding.includes('/')
  )
}

function stripLastChar(str: string): string {
  return str.slice(0, -1)
}

export function extractMimeType(contentType: string): string | null {
  // /!\ Hot path

  // The result of this function will be matched against "trusted" encodings
  // using the code above so there is no need to be super strict in validating
  // the mime type format.

  const semicolonIndex = contentType.indexOf(';')
  const slashIndex = contentType.lastIndexOf(
    '/',
    semicolonIndex === -1 ? undefined : semicolonIndex,
  )

  if (
    // No slash found
    slashIndex === -1 ||
    // More than one slash
    contentType.lastIndexOf('/', slashIndex - 1) !== -1 ||
    // Wildcard in MIME type
    contentType.lastIndexOf('*', semicolonIndex) !== -1
  ) {
    return null
  }

  const mime =
    semicolonIndex === -1
      ? contentType.trim()
      : contentType.slice(0, semicolonIndex).trim()

  // Reject MIME types with leading or trailing slashes, as they are malformed
  if (mime.charCodeAt(0) === 47 || mime.charCodeAt(mime.length - 1) === 47) {
    return null
  }

  return mime
}
