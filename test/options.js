"use strict";

var assert = require('assert');

describe('Options', function() {
  it('Should allow single-double `$` as delimiters', function() {
    var md = require('markdown-it')()
          .use(require('../'), {
            inlineDelim: [ [ '$', '$' ] ],
            blockDelim: [ [ '$$', '$$' ] ]
          });

    var res1 = md.render('$1+1 = 2$');
    var res2 = md.render('$$\n1+1 = 2\n$$');
    assert.equal(res1, '<p><span class="math inline">1+1 = 2</span></p>\n');
    assert.equal(res2, '<div class="math block">1+1 = 2\n</div>\n');
  });
  it('Should allow LaTeX style delimiters', function() {
    var md = require('markdown-it')()
          .use(require('../'), {
            inlineDelim: [ [ '\\(', '\\)' ] ],
            blockDelim: [ [ '\\[', '\\]' ] ]
          });

    var res1 = md.render('\\(1+1 = 2\\)'),
        res2 = md.render('\\[\n1+1 = 2\n\\]');
    assert.equal(res1, '<p><span class="math inline">1+1 = 2</span></p>\n');
    assert.equal(res2, '<div class="math block">1+1 = 2\n</div>\n');
  });
  it('Should allow newline in opening block delimiters', function() {
    var md = require('markdown-it')()
          .use(require('../'), {
            inlineDelim: [ [ '$$', '$$' ] ],
            blockDelim: [ [ '$$\n', '$$' ] ]
          });

    var res1 = md.render('$$1+1 = 2$$'),
        res2 = md.render('$$\n1+1 = 2$$');
    assert.equal(res1, '<p><span class="math inline">1+1 = 2</span></p>\n');
    assert.equal(res2, '<div class="math block">1+1 = 2</div>\n');
  });
  it('Should allow newline in closing block delimiters', function() {
    var md = require('markdown-it')()
          .use(require('../'), {
            inlineDelim: [ [ '$$', '$$' ] ],
            blockDelim: [ [ '$$\n', '\n$$' ] ]
          });

    var res1 = md.render('$$1+1 = 2$$'),
        res2 = md.render('$$\n1+1 = 2$$'),
        res3 = md.render('$$\n1+1 = 2\n$$');
    assert.equal(res1, '<p><span class="math inline">1+1 = 2</span></p>\n');
    assert.equal(res2, '<div class="math block">1+1 = 2$$</div>\n');
    assert.equal(res3, '<div class="math block">1+1 = 2\n</div>\n');
  });
  it('Should only support singular newlines in block math closing tags', function() {
    var md = require('markdown-it')()
          .use(require('../'), {
            inlineDelim: [ [ '$$', '$$' ] ],
            blockDelim: [ [ '$$\n', '\n\n$$' ] ]
          });

    var res1 = md.render('$$1+1 = 2$$'),
        res2 = md.render('$$\n1+1 = 2$$'),
        res3 = md.render('$$\n1+1 = 2\n\n$$');
    assert.equal(res1, '<p><span class="math inline">1+1 = 2</span></p>\n');
    assert.equal(res2, '<div class="math block">1+1 = 2$$</div>\n');
    assert.equal(res3, '<div class="math block">1+1 = 2\n\n$$</div>\n');
  });
});

describe("Rendering options", function() {
  it('Should allow different options', function() {
    var md = require('markdown-it')()
          .use(require('../'), {
            renderingOptions: {decimalMark: ','}
          });

    var res1 = md.render("$$40,2$$");
    assert.equal(res1, '<p><span class="math inline">40,2</span></p>\n');

    var res2 = md.render("$$$\n40,2\n$$$");
    assert.equal(res2, '<div class="math block">40,2\n</div>\n');
  });
});

describe("Renderer", function() {
  it('Should allow another renderer', function() {
    var texzilla = require('texzilla');
    var md = require('markdown-it')()
          .use(require('../'), {
            inlineRenderer: function(str) {
              return texzilla.toMathMLString(str);
            },
            blockRenderer: function(str) {
              return texzilla.toMathMLString(str, true);
            }
          });

    var res1 = md.render("$$1+1 = 2$$");
    assert.equal(res1, '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mn>1</mn><mo>+</mo><mn>1</mn><mo>=</mo><mn>2</mn></mrow><annotation encoding="TeX">1+1 = 2</annotation></semantics></math></p>\n');

    var res2 = md.render("$$$\n\\sin(2\\pi)\n$$$");
    assert.equal(res2, '<math display="block" xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mo lspace="0em" rspace="0em">sin</mo><mo stretchy="false">(</mo><mn>2</mn><mi>π</mi><mo stretchy="false">)</mo></mrow><annotation encoding="TeX">\\sin(2\\pi)\n</annotation></semantics></math>\n');
  });
});
