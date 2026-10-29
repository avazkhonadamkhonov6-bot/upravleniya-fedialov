import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { crc32, inflateRawSync } from 'node:zlib';
import { xlsx } from './xlsx';

/** Zip-ро аз рӯи феҳристи марказӣ мехонем — ҳамон тавре ки Excel мехонад */
function unzip(buf: Buffer) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end > 0, 'EOCD ёфт нашуд');
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const localName = buf.readUInt16LE(offset + 26);
    const data = inflateRawSync(buf.subarray(offset + 30 + localName, offset + 30 + localName + size));
    assert.equal(crc32(data), crc, `CRC-и ${name}`);
    files.set(name, data.toString('utf8'));
    p += 46 + nameLen;
  }
  return files;
}

describe('xlsx', () => {
  it('zip-и дуруст бо ҳамаи қисмҳои лозимӣ', () => {
    const files = unzip(xlsx('Фурӯш', ['№', 'Ном'], [[1, 'Бургер']]));
    for (const f of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
      assert.ok(files.has(f), f);
    }
    assert.match(files.get('xl/workbook.xml')!, /name="Фурӯш"/);
  });

  it('рақам — рақам, матн — матн (ҳарфҳои тоҷикӣ ва аломатҳои XML)', () => {
    const sheet = unzip(xlsx('S', ['A', 'B', 'C'], [[12.5, 'Қурутоб & <нон>', null]])).get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, /<c r="A2"><v>12.5<\/v><\/c>/);
    assert.match(sheet, /<t xml:space="preserve">Қурутоб &amp; &lt;нон&gt;<\/t>/);
    assert.doesNotMatch(sheet, /r="C2"/);
  });

  it('сутунҳо пас аз Z: AA, AB…', () => {
    const headers = Array.from({ length: 28 }, (_, i) => `h${i}`);
    const sheet = unzip(xlsx('S', headers, [])).get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, /r="AB1"/);
  });
});
