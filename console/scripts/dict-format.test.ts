import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeDictionaryValue } from './dict-format';

test('serializes dictionary values without changing their contents', () => {
  const values = [
    String.raw`C:\temp\'quote`,
    'line one\nline two',
    'double " and single \' quotes',
    'Finnish: hyvää päivää',
  ];

  for (const value of values) {
    const serialized = serializeDictionaryValue(value);
    assert.equal(serialized, JSON.stringify(value));
    assert.equal(JSON.parse(serialized), value);
  }
});
