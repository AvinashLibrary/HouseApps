export interface ImageInput {
    /** Base64-encoded image data, no data: URL prefix. */
    base64: string;
    /** MIME type, e.g. "image/png", "image/jpeg". */
    mimeType: string;
  }