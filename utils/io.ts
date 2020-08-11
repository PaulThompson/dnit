import {BufReader} from './deps.ts';

export async function confirmation(msg: string, defValue: boolean, source: Deno.Reader = Deno.stdin) {
  console.log(`${msg} (${defValue ? "Y/n" : "y/N"}):`);

  const br = new BufReader(source);
  const resp = await br.readString("\n");
  if (resp === null) {
    return defValue;
  }
  return resp.startsWith('Y')||resp.startsWith('y');
}
