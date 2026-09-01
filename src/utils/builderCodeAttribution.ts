type Hex = `0x${string}`;

/** ERC-8021 suffix identifier (16 bytes). */
const ERC_SUFFIX = '80218021802180218021802180218021';

function stringToHex(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('hex');
  }

  return Array.from(value)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

function concatHex(parts: string[]): Hex {
  return `0x${parts.join('')}` as Hex;
}

/** Schema 0 (canonical registry) ERC-8021 data suffix for Base Builder Codes. */
export function createBuilderDataSuffix(builderCodes: string[]): Hex {
  const codes = builderCodes.join(',');
  const codesHex = stringToHex(codes);
  const codesLengthHex = codes.length.toString(16).padStart(2, '0');
  const schemaIdHex = '00';

  return concatHex([codesHex, codesLengthHex, schemaIdHex, ERC_SUFFIX]);
}

export function hasBuilderCodeSuffix(data: string | undefined, builderCodes: string[]): boolean {
  if (!data || data === '0x') return false;

  const normalized = data.toLowerCase();
  if (!normalized.endsWith(ERC_SUFFIX)) return false;

  return builderCodes.every((code) => normalized.includes(stringToHex(code)));
}

/** Append ERC-8021 builder-code suffix to transaction calldata when missing. */
export function appendBuilderCodeToTxData(
  data: string | undefined | null,
  builderCodes: string[]
): Hex {
  const normalized = !data || data === '0x' ? '0x' : data;
  if (hasBuilderCodeSuffix(normalized, builderCodes)) {
    return normalized as Hex;
  }

  const suffix = createBuilderDataSuffix(builderCodes);
  if (normalized === '0x') {
    return suffix;
  }

  return `0x${normalized.slice(2)}${suffix.slice(2)}` as Hex;
}
