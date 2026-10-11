export function canonical(value: unknown, options?: { historical?: boolean; nfc?: boolean }): Uint8Array<ArrayBuffer>;
export function strictParse(input: string | Uint8Array, options?: { historical?: boolean }): unknown;
export function digest(bytes: Uint8Array): Promise<string>;
export function verifySnapshot(snapshot: any, getArchive: (uri: string) => Uint8Array<ArrayBuffer> | Promise<Uint8Array<ArrayBuffer>>, expectedIntents?: unknown): Promise<Record<string, unknown>[]>;
