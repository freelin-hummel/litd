## Overview

Represent each imported PDF as a canonical `pdf` asset record, then allow workspace surfaces to project that asset in multiple ways:

1. as a top-level PDF page
2. as an embedded full-document viewer
3. as an embedded page-range viewer
4. as an embedded page-region viewer

Every embedded PDF surface should retain a stable link back to the source PDF asset and the targeted subsection of that asset.

## Goals

- make PDFs loadable as first-class workspace content
- support one canonical PDF asset referenced from multiple pages and surfaces
- support full-document, page-range, and page-region targeting
- keep document and board embeddings behaviorally aligned
- preserve deep links from embeds back to the source PDF section

## Non-Goals

- OCR, semantic extraction, or citation graphing in this change
- handwritten annotation layers or collaborative PDF commenting
- server-side PDF preprocessing beyond what is needed to load and address pages/regions

## Canonical Model

Each PDF should be stored as an `AssetRecord` with `type: 'pdf'` plus metadata sufficient to reopen and target the file.

Expected PDF asset metadata:

- source or storage handle
- page count when known
- intrinsic page sizes when known
- optional document outline metadata

PDF embeddings should use canonical asset references plus structured metadata describing the target. The existing asset reference modes map naturally to the desired behavior:

- `embed`: full PDF document embed
- `page`: selected page or page range embed
- `region`: selected rectangular region within a specific PDF page

Target metadata should be explicit and serializable. For example:

- `pageStart`
- `pageEnd`
- `pageIndex`
- `rect` with normalized coordinates in page space
- optional `zoom` or viewport hint

## Surface Types

### Top-level PDF page

A workspace page may present a PDF as its primary content surface. The page should resolve to a source PDF asset and open at the whole document view by default, with optional initial page targeting.

### Embedded PDF in document mode

Document blocks should be able to reference a PDF asset and render:

- the full document
- a subset of pages
- a selected page region

The embed should expose a link or action that opens the source PDF page at the corresponding target.

### Embedded PDF in board/canvas mode

Canvas cards should support the same three targeting modes as document embeds. A PDF card should display the chosen scope and preserve the same deep link behavior back to the source PDF page and target.

## Deep Linking Rules

Every PDF surface must carry enough information to reopen the source PDF in the appropriate section:

- full-document embeds open the source PDF document
- page-range embeds open the source PDF at the first targeted page, while preserving the selected range in metadata
- region embeds open the source PDF at the targeted page and region

This linking behavior should be consistent whether the user follows the link from a document embed or a board card.

## Rendering Notes

- top-level PDF pages prioritize reading/navigation controls over block editing chrome
- document embeds render inline or block-level viewers appropriate to the selected scope
- board embeds render as cards, with thumbnail or preview behavior derived from the same scope metadata
- page-region embeds should visibly communicate that they are cropped views into a larger page

## Risks

- page-region targeting can become unstable if coordinates are not normalized to the original PDF page space
- page-range references need a clear inclusive range contract to avoid off-by-one ambiguity
- board-card previews may need lightweight rendering paths to avoid heavy PDF performance costs

## Validation

- a PDF can be loaded as a top-level page and reopened later
- a full-document embed links back to the source PDF
- a page-range embed preserves its page selection and links back to the correct start page
- a page-region embed preserves its crop target and links back to the same page region
- board cards support the same PDF targeting and linking behavior as document embeds