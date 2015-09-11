"use strict";

var path = require('path');
var generate = require('markdown-it-testgen');


describe('Default math', function() {
  var md = require('markdown-it')()
        .use(require('../'));

  generate(path.join(__dirname, 'fixtures/default.txt'), md);
});

describe('Math blocks requiring no empty lines', function() {
  var md = require('markdown-it')()
        .use(require('../'), {noEmptyLines: true});

  generate(path.join(__dirname, 'fixtures/noEmptyLines.txt'), md);
});
