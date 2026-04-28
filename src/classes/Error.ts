import { AttestationErrorCode, ErrorCode, ErrorCodeMAP } from '../config/error';

const errorCodeLookup = ErrorCodeMAP as Record<string, string | undefined>;

function resolveZkAttestationErrorMessage(
  code: ErrorCode,
  message: string | undefined,
  subCode: string | undefined
): string | undefined {
  if (message) {
    return message;
  }
  if (subCode) {
    const fromComposite = errorCodeLookup[`${code}:${subCode}`];
    if (fromComposite !== undefined) {
      return fromComposite;
    }
  }
  return errorCodeLookup[code];
}

/** Wire-format `data` field: always a string; omit nested `details` (subCode is top-level). */
function dataForJsonExport(stored: unknown): string {
  if (stored === undefined || stored === null) {
    return '';
  }
  if (typeof stored === 'string') {
    return stored;
  }
  if (typeof stored === 'object' && !Array.isArray(stored)) {
    const o = { ...(stored as Record<string, unknown>) };
    delete o.details;
    if (Object.keys(o).length === 0) {
      return '';
    }
    return JSON.stringify(o);
  }
  return JSON.stringify(stored);
}

export class ZkAttestationError {
  code: AttestationErrorCode;
  message: string;
  subCode?: string;
  data?: unknown;

  constructor(code: AttestationErrorCode, message?: string, data?: unknown, subCode?: string) {
    if (subCode !== undefined && subCode !== '') {
      this.subCode = subCode;
    }
    this.message =
      resolveZkAttestationErrorMessage(code, message, subCode) ||
      errorCodeLookup['99999'] ||
      '';
    this.code = code;
    if (data !== undefined && data !== null && data !== '') {
      this.data = data;
    }
  }

  /**
   * Shape for `JSON.stringify` / logging: `{ code, message, subCode?, data }` with `data` always a string.
   */
  toJSON(): { code: AttestationErrorCode; message: string; data: string; subCode?: string } {
    const data = dataForJsonExport(this.data);
    if (this.subCode !== undefined && this.subCode !== '') {
      return {
        code: this.code,
        message: this.message,
        subCode: this.subCode,
        data,
      };
    }
    return {
      code: this.code,
      message: this.message,
      data,
    };
  }
}
