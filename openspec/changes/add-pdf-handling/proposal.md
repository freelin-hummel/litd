## Why

The workspace model already has first-class `pdf` assets and asset reference modes for `embed`, `page`, and `region`, but there is no behavior spec for loading or rendering PDFs yet. That leaves an important content type defined in the model but unavailable in the product.

This change introduces PDF handling as a first-class workspace capability. A PDF should be loadable as its own top-level page, and the same source PDF should be embeddable inside documents or boards as a full file, a selected subset of pages, or a selected rectangular region within a page.

## What Changes

- add first-class PDF asset loading and canonical storage behavior
- allow a workspace page to use a PDF as its top-level content surface
- allow document and canvas embeds that reference a full PDF, a page range, or a selected page region
- require embedded PDF surfaces to retain deep links back to the source PDF and selected section
- require board/card rendering for embedded PDFs with the same targeting behavior as document embeds

## Impact

- makes PDFs usable as durable source material inside the workspace
- creates a shared targeting model for full-document, page-range, and page-region references
- lays the groundwork for retrieval, annotation, and citation flows built on stable PDF anchors