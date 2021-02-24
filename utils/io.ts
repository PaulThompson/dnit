import { BufReader } from "./deps.ts";

/** Obtain a boolean confirmation - present a message
 * @param msg - Message presented
 * @param defValue - default boolean
 * @param source - value to read from (stdin)
 */
export async function confirmation(
  msg: string,
  defValue: boolean,
  source: Deno.Reader = Deno.stdin,
): Promise<boolean> {
  console.log(`${msg} (${defValue ? "Y/n" : "y/N"}):`);

  const br = new BufReader(source);
  const resp = await br.readString("\n");
  if (resp === null) {
    return defValue;
  }
  return resp.startsWith("Y") || resp.startsWith("y");
}

/** Write string content to Writer and close */
export async function writeAllClose(
  content: string,
  dest: Deno.Writer & Deno.Closer,
): Promise<void> {
  const encoder = new TextEncoder();
  const buf = encoder.encode(content);
  await Deno.writeAll(dest, buf);
  dest.close();
}

/** Copy between source and destination Reader/Writer - close both */
export async function copyAllClose(
  src: Deno.Reader & Deno.Closer,
  dst: Deno.Writer & Deno.Closer,
  options?: {
    bufSize?: number;
  },
): Promise<number> {
  let totalCopiedCount = 0;
  let copyCount = 0;
  do {
    copyCount = await Deno.copy(src, dst, options);
    totalCopiedCount += copyCount;
  } while (copyCount > 0);

  src.close();
  dst.close();
  return totalCopiedCount;
}

/** Read all from Reader and close */
export async function readAllClose(
  reader: Deno.Reader & Deno.Closer,
): Promise<string> {
  const decoder = new TextDecoder();
  const buf = await Deno.readAll(reader);
  reader.close();
  return decoder.decode(buf);
}
