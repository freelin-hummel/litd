export type PagePropertyValue =
  | string
  | number
  | boolean
  | null
  | PagePropertyValue[]
  | { [key: string]: PagePropertyValue };

export interface PageMetadata {
  title: string;
  icon: string | null;
  tags: string[];
  properties: Record<string, PagePropertyValue>;
}

export interface SerializedPage {
  metadata: PageMetadata;
  markdown: string;
}

const PAGE_METADATA_PREFIX = '<!--litd:page ';
const PAGE_METADATA_SUFFIX = '-->';

function isPagePropertyValue(value: unknown): value is PagePropertyValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isPagePropertyValue(item));
  }

  if (typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every((item) => isPagePropertyValue(item));
}

export function isPagePropertiesRecord(
  value: unknown,
): value is Record<string, PagePropertyValue> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((item) => isPagePropertyValue(item));
}

function isPageMetadata(value: unknown): value is PageMetadata {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.title === 'string' &&
    (record.icon === null || typeof record.icon === 'string') &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === 'string') &&
    isPagePropertiesRecord(record.properties)
  );
}

function normalizeMarkdown(markdown: string): string {
  const withoutBom = markdown.replace(/^\uFEFF/, '');
  const withUnixLineEndings = withoutBom.replace(/\r\n/g, '\n');
  const withoutLeadingBlankLines = withUnixLineEndings.replace(/^\n+/, '');
  return withoutLeadingBlankLines.trimEnd();
}

export function normalizePageMetadata(
  metadata: Pick<PageMetadata, 'title'> & Partial<Omit<PageMetadata, 'title'>>,
): PageMetadata {
  return {
    title: metadata.title,
    icon: metadata.icon?.trim() || null,
    tags: (metadata.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    properties: isPagePropertiesRecord(metadata.properties) ? metadata.properties : {},
  };
}

export function serializePage(page: SerializedPage): string {
  const metadata = normalizePageMetadata(page.metadata);
  const markdown = normalizeMarkdown(page.markdown);
  const serializedMetadata = JSON.stringify(metadata);

  return markdown
    ? `${PAGE_METADATA_PREFIX}${serializedMetadata}${PAGE_METADATA_SUFFIX}\n\n${markdown}\n`
    : `${PAGE_METADATA_PREFIX}${serializedMetadata}${PAGE_METADATA_SUFFIX}\n`;
}

export function parsePage(
  serialized: string,
  fallbackMetadata: Pick<PageMetadata, 'title'> & Partial<Omit<PageMetadata, 'title'>>,
): SerializedPage {
  const fallback = normalizePageMetadata(fallbackMetadata);
  const source = serialized.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  if (!source.startsWith(PAGE_METADATA_PREFIX)) {
    return {
      metadata: fallback,
      markdown: normalizeMarkdown(source),
    };
  }

  const metadataEnd = source.indexOf(PAGE_METADATA_SUFFIX, PAGE_METADATA_PREFIX.length);
  if (metadataEnd === -1) {
    return {
      metadata: fallback,
      markdown: normalizeMarkdown(source),
    };
  }

  let metadata = fallback;
  try {
    const parsed: unknown = JSON.parse(
      source.slice(PAGE_METADATA_PREFIX.length, metadataEnd).trim(),
    );
    if (isPageMetadata(parsed)) {
      metadata = normalizePageMetadata(parsed);
    }
  } catch {
    metadata = fallback;
  }

  const markdown = normalizeMarkdown(source.slice(metadataEnd + PAGE_METADATA_SUFFIX.length));
  return { metadata, markdown };
}
