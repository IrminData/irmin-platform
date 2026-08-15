/* eslint-disable import-x/no-nodejs-modules, import-x/no-unused-modules */
import { createElement } from 'react';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ScriptResultDataPanel } from './ScriptResultDataPanel';

describe('ScriptResultDataPanel', () => {
  it('provides a bounded flex column so the structured result body is visible', () => {
    const structuredRows = createElement(
      'div',
      { className: 'h-0 flex-1' },
      'Structured rows'
    );
    const markup = renderToStaticMarkup(
      createElement(ScriptResultDataPanel, undefined, structuredRows)
    );

    assert.match(markup, /class="[^"]*\bflex\b[^"]*"/);
    assert.match(markup, /class="[^"]*\bmin-h-0\b[^"]*"/);
    assert.match(markup, /class="[^"]*\bflex-col\b[^"]*"/);
    assert.match(markup, /class="[^"]*\boverflow-hidden\b[^"]*"/);
  });
});
