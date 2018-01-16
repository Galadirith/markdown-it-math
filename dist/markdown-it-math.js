/*! markdown-it-math 3.0.2 https://github.com/runarberg/markdown-it-math @license MIT */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownitMath = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* Object.assign
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
 * Global_Objects/Object/assign
 *
 * This polyfill doesn't support symbol properties, since ES5 doesn't
 * have symbols anyway:
 */

if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      if (typeof target === 'undefined' || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (typeof nextSource === 'undefined' || nextSource === null) {
          continue;
        }

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (typeof desc !== 'undefined' && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}

},{}],2:[function(require,module,exports){
// markdown-it-math@4802439:lib/rules_block/table.js
// GFM table, non-standard

'use strict';


function getLine(state, line) {
  var pos = state.bMarks[line] + state.blkIndent,
      max = state.eMarks[line];

  return state.src.substr(pos, max - pos);
}

/**
 * Parse a table row for columns/cells
 *
 * @param string str
 *   The table row to parse for columns.
 * @param  array of string openDelims
 *   The opening delimiter sequences for inlines that prevents any contained
 *   pipes from delimiting columns of the parent table block.
 * @param  array of string closeDelims
 *   The closing delimiter sequence for an inline that prevents any containing
 *   pipes from delimiting columns of the parent table block.
 * @return array of string
 *   The unparsed content of the cells/columns identified in str returned as
 *   individual elements of an array. The content is still to be parsed by the
 *   inline rules.
 */
function escapedSplit(str, openDelims, closeDelims) {
  var result = [],
      pos = 0,
      max = str.length,
      ch,
      escapes = 0,
      lastPos = 0,
      lastDelim = 0,
      delimed = false,
      delimMaskMap,
      openDelimIdx = -1,
      closeDelimIdx = -1;

  ch  = str.charCodeAt(pos);

  // Def map for matching open/close delimiter sequence with str@pos
  delimMaskMap  = function (e) {
    return str.substring(pos, pos + e.length) === e;
  };

  while (pos < max) {

    // Determine ID of first matching open/close delimiter sequence
    openDelimIdx  = openDelims.map(delimMaskMap).indexOf(true);
    closeDelimIdx = closeDelims.map(delimMaskMap).indexOf(true);

    // Does str@pos match any opening delimiter?
    if (openDelimIdx > -1 && escapes % 2 === 0 && !delimed) {
      delimed = !delimed;
      lastDelim = pos + openDelims[openDelimIdx].length - 1;
      pos += openDelims[openDelimIdx].length - 1;
    // Does str@pos match any closing delimiter?
    } else if (closeDelimIdx > -1 && escapes % 2 === 0 && delimed) {
      delimed = !delimed;
      lastDelim = pos + closeDelims[closeDelimIdx].length - 1;
      pos += closeDelims[closeDelimIdx].length - 1;
    } else if (ch === 0x7c/* | */ && escapes % 2 === 0 && !delimed) {
      result.push(str.substring(lastPos, pos));
      lastPos = pos + 1;
    } else if (ch === 0x5c/* \ */) {
      escapes++;
    } else {
      escapes = 0;
    }

    pos++;

    // If there was an un-closed delimiter sequence, go back to just after
    // the last delimiter sequence, but as if it was a normal character
    if (pos === max && delimed) {
      delimed = false;
      pos = lastDelim + 1;
    }

    ch = str.charCodeAt(pos);
  }

  result.push(str.substring(lastPos));

  return result;
}

/**
 * A table plock parser with restrictions on pipe placement
 *
 * Partially poulated docstring describing parameters added to
 * `markdown-it-math@4802439:lib/rules_block/table.js`.
 *
 * @param  array of string openDelims
 *   The opening delimiter sequences for inlines that prevents any contained
 *   pipes from delimiting columns of the parent table block.
 * @param  array of string closeDelims
 *   The closing delimiter sequence for an inline that prevents any containing
 *   pipes from delimiting columns of the parent table block.
 */
function table(openDelims, closeDelims, state, startLine, endLine, silent) {
  var ch, lineText, pos, i, nextLine, columns, columnCount, token,
      aligns, t, tableLines, tbodyLines;

  // should have at least three lines
  if (startLine + 2 > endLine) { return false; }

  nextLine = startLine + 1;

  if (state.sCount[nextLine] < state.blkIndent) { return false; }

  // first character of the second line should be '|' or '-'

  pos = state.bMarks[nextLine] + state.tShift[nextLine];
  if (pos >= state.eMarks[nextLine]) { return false; }

  ch = state.src.charCodeAt(pos);
  if (ch !== 0x7C/* | */ && ch !== 0x2D/* - */ && ch !== 0x3A/* : */) { return false; }

  lineText = getLine(state, startLine + 1);
  if (!/^[-:| ]+$/.test(lineText)) { return false; }

  columns = lineText.split('|');
  aligns = [];
  for (i = 0; i < columns.length; i++) {
    t = columns[i].trim();
    if (!t) {
      // allow empty columns before and after table, but not in between columns;
      // e.g. allow ` |---| `, disallow ` ---||--- `
      if (i === 0 || i === columns.length - 1) {
        continue;
      } else {
        return false;
      }
    }

    if (!/^:?-+:?$/.test(t)) { return false; }
    if (t.charCodeAt(t.length - 1) === 0x3A/* : */) {
      aligns.push(t.charCodeAt(0) === 0x3A/* : */ ? 'center' : 'right');
    } else if (t.charCodeAt(0) === 0x3A/* : */) {
      aligns.push('left');
    } else {
      aligns.push('');
    }
  }

  lineText = getLine(state, startLine).trim();
  if (lineText.indexOf('|') === -1) { return false; }
  columns = escapedSplit(lineText.replace(/^\||\|$/g, ''), openDelims, closeDelims);

  // header row will define an amount of columns in the entire table,
  // and align row shouldn't be smaller than that (the rest of the rows can)
  columnCount = columns.length;
  if (columnCount > aligns.length) { return false; }

  if (silent) { return true; }

  token     = state.push('table_open', 'table', 1);
  token.map = tableLines = [ startLine, 0 ];

  token     = state.push('thead_open', 'thead', 1);
  token.map = [ startLine, startLine + 1 ];

  token     = state.push('tr_open', 'tr', 1);
  token.map = [ startLine, startLine + 1 ];

  for (i = 0; i < columns.length; i++) {
    token          = state.push('th_open', 'th', 1);
    token.map      = [ startLine, startLine + 1 ];
    if (aligns[i]) {
      token.attrs  = [ [ 'style', 'text-align:' + aligns[i] ] ];
    }

    token          = state.push('inline', '', 0);
    token.content  = columns[i].trim();
    token.map      = [ startLine, startLine + 1 ];
    token.children = [];

    token          = state.push('th_close', 'th', -1);
  }

  token     = state.push('tr_close', 'tr', -1);
  token     = state.push('thead_close', 'thead', -1);

  token     = state.push('tbody_open', 'tbody', 1);
  token.map = tbodyLines = [ startLine + 2, 0 ];

  for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
    if (state.sCount[nextLine] < state.blkIndent) { break; }

    lineText = getLine(state, nextLine).trim();
    if (lineText.indexOf('|') === -1) { break; }
    columns = escapedSplit(lineText.replace(/^\||\|$/g, ''), openDelims, closeDelims);

    token = state.push('tr_open', 'tr', 1);
    for (i = 0; i < columnCount; i++) {
      token          = state.push('td_open', 'td', 1);
      if (aligns[i]) {
        token.attrs  = [ [ 'style', 'text-align:' + aligns[i] ] ];
      }

      token          = state.push('inline', '', 0);
      token.content  = columns[i] ? columns[i].trim() : '';
      token.children = [];

      token          = state.push('td_close', 'td', -1);
    }
    token = state.push('tr_close', 'tr', -1);
  }
  token = state.push('tbody_close', 'tbody', -1);
  token = state.push('table_close', 'table', -1);

  tableLines[1] = tbodyLines[1] = nextLine;
  state.line = nextLine;
  return true;
}

/**
 * Prepare a table plock parser with restrictions on pipe placement
 *
 * @param  string open
 *   The opening delimiter sequence for an inline that prevents any contained
 *   pipes from delimiting columns of the parent table block.
 * @param  string close
 *   The closing delimiter sequence for an inline that prevents any containing
 *   pipes from delimiting columns of the parent table block.
 * @return function
 *   The table block parser that should be used in place of the existing table
 *   block parser such that the specified inline by `open` and `close` is
 *   respected. The delimiters are added to existing list of delimiter pairs in
 *   `escapedSplitDelimiters` allowing `markdown-it-math` to be `use`'d multiple
 *   times leading to multiple inline delimiters.
 */
module.exports = function makeTable(md) {
  var openDelims  = Array.prototype.concat.apply([], md.math.map(
    function (e) {
      return e.inlineDelim.map(function(i) {
        return i[0];
      });
    }
  ));
  var closeDelims  = Array.prototype.concat.apply([], md.math.map(
    function (e) {
      return e.inlineDelim.map(function(i) {
        return i[1];
      });
    }
  ));

  openDelims.unshift('`');
  closeDelims.unshift('`');

  return table.bind(null, openDelims, closeDelims);
};

},{}],3:[function(require,module,exports){
/* Process inline math */

'use strict';

require('./lib/polyfills');


function scanDelims(state, start, delimLength) {
  var pos = start, lastChar, nextChar, count, can_open, can_close,
      isLastWhiteSpace, isLastPunctChar,
      isNextWhiteSpace, isNextPunctChar,
      left_flanking = true,
      right_flanking = true,
      max = state.posMax,
      isWhiteSpace = state.md.utils.isWhiteSpace,
      isPunctChar = state.md.utils.isPunctChar,
      isMdAsciiPunct = state.md.utils.isMdAsciiPunct;

  // treat beginning of the line as a whitespace
  lastChar = start > 0 ? state.src.charCodeAt(start - 1) : 0x20;

  if (pos >= max) {
    can_open = false;
  }

  pos += delimLength;

  count = pos - start;

  // treat end of the line as a whitespace
  nextChar = pos < max ? state.src.charCodeAt(pos) : 0x20;

  isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctChar(String.fromCharCode(lastChar));
  isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctChar(String.fromCharCode(nextChar));

  isLastWhiteSpace = isWhiteSpace(lastChar);
  isNextWhiteSpace = isWhiteSpace(nextChar);

  if (isNextWhiteSpace) {
    left_flanking = false;
  } else if (isNextPunctChar) {
    if (!(isLastWhiteSpace || isLastPunctChar)) {
      left_flanking = false;
    }
  }

  if (isLastWhiteSpace) {
    right_flanking = false;
  } else if (isLastPunctChar) {
    if (!(isNextWhiteSpace || isNextPunctChar)) {
      right_flanking = false;
    }
  }

  can_open = left_flanking;
  can_close = right_flanking;

  return {
    can_open: can_open,
    can_close: can_close,
    delims: count
  };
}


function makeMath_inline(delims) {
  return function math_inline(state, silent) {
    var startCount,
        found,
        res,
        token,
        closeDelim,
        max = state.posMax,
        start = state.pos;
    var foundDelims = delims.find(function(i) {
      var open = i[0], openDelim = state.src.slice(start, start + open.length);
      return openDelim === open;
    });
    if (!foundDelims) { return false; }
    var open = foundDelims[0],
        close = foundDelims[1];
    if (silent) { return false; }    // Don’t run any pairs in validation mode

    res = scanDelims(state, start, open.length);
    startCount = res.delims;

    if (!res.can_open) {
      state.pos += startCount;
      // Earlier we checked !silent, but this implementation does not need it
      state.pending += state.src.slice(start, state.pos);
      return true;
    }

    state.pos = start + open.length;

    while (state.pos < max) {
      closeDelim = state.src.slice(state.pos, state.pos + close.length);
      if (closeDelim === close) {
        res = scanDelims(state, state.pos, close.length);
        if (res.can_close) {
          found = true;
          break;
        }
      }

      state.md.inline.skipToken(state);
    }

    if (!found) {
      // Parser failed to find ending tag, so it is not a valid math
      state.pos = start;
      return false;
    }

    // Found!
    state.posMax = state.pos;
    state.pos = start + close.length;

    // Earlier we checked !silent, but this implementation does not need it
    token = state.push('math_inline', 'math', 0);
    token.content = state.src.slice(state.pos, state.posMax);
    token.markup = open;

    state.pos = state.posMax + close.length;
    state.posMax = max;

    return true;
  };
}

function makeMath_block(delims) {
  return function math_block(state, startLine, endLine, silent) {
    var len, params, nextLine, token, firstLine, lastLine, lastLinePos, closeDelim,
        haveEndMarker = false,
        closeStartsAtNewline = false,
        pos = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    var foundDelims = delims.find(function(i) {
      var open = i[0], openDelim = state.src.slice(pos, pos + open.length);
      return openDelim === open;
    });
    if (!foundDelims) { return false; }
    var open = foundDelims[0],
        close = foundDelims[1];

    if (close[0] === '\n') {
      closeStartsAtNewline = true;
      close = close.slice(1);
    }

    if (pos + open.length > max + 1) { return false; }

    pos += open.length;
    firstLine = state.src.slice(pos, max);

    // Since start is found, we can report success here in validation mode
    if (silent) { return true; }

    if (firstLine.trim().slice(-close.length) === close) {
      // Single line expression
      firstLine = firstLine.trim().slice(0, -close.length);
      haveEndMarker = true;
    }

    // search end of block
    nextLine = startLine;

    for (;;) {
      if (haveEndMarker) { break; }

      nextLine++;

      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (pos < max && state.tShift[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        break;
      }

      closeDelim = closeStartsAtNewline
        ? state.src.slice(pos, max).trim()
        : state.src.slice(pos, max).trim().slice(-close.length);

      if (closeDelim !== close) {
        continue;
      }

      if (state.tShift[nextLine] - state.blkIndent >= 4) {
        // closing block math should be indented less then 4 spaces
        continue;
      }

      lastLinePos = state.src.slice(0, max).lastIndexOf(close);
      lastLine = state.src.slice(pos, lastLinePos);

      pos += lastLine.length + close.length;

      // make sure tail has spaces only
      pos = state.skipSpaces(pos);

      if (pos < max) { continue; }

      // found!
      haveEndMarker = true;
    }

    // If math block has heading spaces, they should be removed from its inner block
    len = state.tShift[startLine];

    state.line = nextLine + (haveEndMarker ? 1 : 0);

    token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = (firstLine && firstLine.trim() ? firstLine + '\n' : '') +
      state.getLines(startLine + 1, nextLine, len, true) +
      (lastLine && lastLine.trim() ? lastLine : '');
    token.info = params;
    token.map = [ startLine, state.line ];
    token.markup = open;

    return true;
  };
}

function makeMathRenderer(renderingOptions) {
  return renderingOptions && renderingOptions.display === 'block' ?
    function(tokens, idx) {
      return '<div class="math block">' + tokens[idx].content + '</div>\n';
    } :
    function(tokens, idx) {
      return '<span class="math inline">' + tokens[idx].content + '</span>';
    };
}


module.exports = function math_plugin(md, options) {
  // Default options
  options = typeof options === 'object' ? options : {};
  var inlineDelim = options.inlineDelim || [ [ '$$', '$$' ] ],
      blockDelim = options.blockDelim || [ [ '$$$', '$$$' ] ];
  var inlineRenderer = options.inlineRenderer ?
        function(tokens, idx) {
          return options.inlineRenderer(tokens[idx].content);
        } :
      makeMathRenderer(options.renderingOptions);
  var blockRenderer = options.blockRenderer ?
        function(tokens, idx) {
          return options.blockRenderer(tokens[idx].content) + '\n';
        } :
      makeMathRenderer(Object.assign({ display: 'block' },
                                     options.renderingOptions));

  var math_inline = makeMath_inline(inlineDelim);
  var math_block = makeMath_block(blockDelim);

  md.inline.ruler.before('escape', 'math_inline', math_inline);
  md.block.ruler.after('blockquote', 'math_block', math_block, {
    alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
  });
  md.renderer.rules.math_inline = inlineRenderer;
  md.renderer.rules.math_block = blockRenderer;

  // Push configuration options to MarkdownIt instance
  md.math = typeof md.math === 'object' ? md.math : [];
  md.math.push({
    inlineDelim: inlineDelim,
    blockDelim: blockDelim
  });

  // Replace existing table parser with parser that respects new inline delims
  var table_block = require('./lib/table')(md);
  md.block.ruler.at('table', table_block, {
    alt: [ 'paragraph', 'reference' ]
  });
};

},{"./lib/polyfills":1,"./lib/table":2}]},{},[3])(3)
});