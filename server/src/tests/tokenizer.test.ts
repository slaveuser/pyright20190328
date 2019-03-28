/*
* tokenizer.test.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Based on code from vscode-python repository:
*  https://github.com/Microsoft/vscode-python
*
* Unit tests for Python tokenizer.
*/

import * as assert from 'assert';

import { Tokenizer } from '../parser/tokenizer';
import { DedentToken, IdentifierToken, IndentToken, NewLineToken, NewLineType,
    NumberToken, OperatorToken, OperatorType, TokenType } from '../parser/tokenizerTypes';

const _implicitTokenCount = 2;
const _implicitTokenCountNoImplicitNewLine = 1;

test('Empty', () => {
    const t = new Tokenizer();
    const results = t.tokenize('');
    assert.equal(results.tokens.count, 0 + _implicitTokenCount);
    assert.equal(results.tokens.length, 0);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.EndOfStream);
});

test('NewLines', () => {
    const t = new Tokenizer();
    const results = t.tokenize('\na\r\nb\r');
    assert.equal(results.tokens.count, 5 + _implicitTokenCountNoImplicitNewLine);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal((results.tokens.getItemAt(0) as NewLineToken).newLineType, NewLineType.LineFeed);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.NewLine);
    assert.equal((results.tokens.getItemAt(2) as NewLineToken).newLineType, NewLineType.CarriageReturnLineFeed);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.NewLine);
    assert.equal((results.tokens.getItemAt(4) as NewLineToken).newLineType, NewLineType.CarriageReturn);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.EndOfStream);
});

test('ParenNewLines', () => {
    const t = new Tokenizer();
    const results = t.tokenize('\n(\n(\n)\n)\n)\n');
    assert.equal(results.tokens.count, 8 + _implicitTokenCountNoImplicitNewLine);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.OpenParenthesis);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.OpenParenthesis);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.CloseParenthesis);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.CloseParenthesis);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(6).type, TokenType.CloseParenthesis);
});

test('BraceNewLines', () => {
    const t = new Tokenizer();
    const results = t.tokenize('\n{\n{\n}\n}\n}\n');
    assert.equal(results.tokens.count, 8 + _implicitTokenCountNoImplicitNewLine);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.OpenCurlyBrace);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.OpenCurlyBrace);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.CloseCurlyBrace);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.CloseCurlyBrace);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(6).type, TokenType.CloseCurlyBrace);
});

test('BracketNewLines', () => {
    const t = new Tokenizer();
    const results = t.tokenize('\n[\n[\n]\n]\n]\n');
    assert.equal(results.tokens.count, 8 + _implicitTokenCountNoImplicitNewLine);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.OpenBracket);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.OpenBracket);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.CloseBracket);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.CloseBracket);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(6).type, TokenType.CloseBracket);
});

test('NewLinesWithWhiteSpace', () => {
    const t = new Tokenizer();
    const results = t.tokenize('  \na   \r\nb  \rc');
    assert.equal(results.tokens.count, 6 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(0).length, 1);
    assert.equal((results.tokens.getItemAt(0) as NewLineToken).newLineType, NewLineType.LineFeed);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.NewLine);
    assert.equal((results.tokens.getItemAt(2) as NewLineToken).newLineType, NewLineType.CarriageReturnLineFeed);
    assert.equal(results.tokens.getItemAt(2).length, 2);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.NewLine);
    assert.equal((results.tokens.getItemAt(4) as NewLineToken).newLineType, NewLineType.CarriageReturn);
    assert.equal(results.tokens.getItemAt(4).length, 1);

    assert.equal(results.tokens.getItemAt(6).type, TokenType.NewLine);
    assert.equal((results.tokens.getItemAt(6) as NewLineToken).newLineType, NewLineType.Implied);
    assert.equal(results.tokens.getItemAt(6).length, 0);
});

test('NewLineEliding', () => {
    const t = new Tokenizer();
    const results = t.tokenize('\n\r\n\r');
    assert.equal(results.tokens.count, 1 + _implicitTokenCountNoImplicitNewLine);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(0).length, 1);
    assert.equal((results.tokens.getItemAt(0) as NewLineToken).newLineType, NewLineType.LineFeed);
});

test('LineContinuation', () => {
    const t = new Tokenizer();
    const results = t.tokenize('foo  \\\na   \\\r\nb  \\\rc  \\ \n # Comment \\\n');
    assert.equal(results.tokens.count, 6 + _implicitTokenCountNoImplicitNewLine);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.Invalid);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.NewLine);
});

test('Dots', () => {
    const t = new Tokenizer();
    const results = t.tokenize('. .. ... ....');
    assert.equal(results.tokens.count, 6 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.Dot);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.Dot);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Dot);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.Ellipsis);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.Ellipsis);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.Dot);
});

test('PunctiationTokens', () => {
    const t = new Tokenizer();
    const results = t.tokenize(':;,()[]{}->');
    assert.equal(results.tokens.count, 10 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.Colon);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.Semicolon);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Comma);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.OpenParenthesis);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.CloseParenthesis);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.OpenBracket);
    assert.equal(results.tokens.getItemAt(6).type, TokenType.CloseBracket);
    assert.equal(results.tokens.getItemAt(7).type, TokenType.OpenCurlyBrace);
    assert.equal(results.tokens.getItemAt(8).type, TokenType.CloseCurlyBrace);
    assert.equal(results.tokens.getItemAt(9).type, TokenType.Arrow);
});

test('IndentDedent', () => {
    const t = new Tokenizer();
    const results = t.tokenize(
        'test\n' +
        '  i1\n' +
        '  i2  # \n' +
        '       # \n' +
        '  \ti3\n' +
        '\ti4\n' +
        ' i1');
    assert.equal(results.tokens.count, 15 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Indent);
    assert.equal((results.tokens.getItemAt(2) as IndentToken).indentAmount, 2);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(6).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(7).type, TokenType.Indent);
    assert.equal((results.tokens.getItemAt(7) as IndentToken).indentAmount, 8);
    assert.equal(results.tokens.getItemAt(8).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(9).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(10).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(11).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(12).type, TokenType.Dedent);
    assert.equal((results.tokens.getItemAt(12) as DedentToken).indentAmount, 2);
    assert.equal((results.tokens.getItemAt(12) as DedentToken).matchesIndent, true);
    assert.equal(results.tokens.getItemAt(13).type, TokenType.Dedent);
    assert.equal((results.tokens.getItemAt(13) as DedentToken).indentAmount, 1);
    assert.equal((results.tokens.getItemAt(13) as DedentToken).matchesIndent, false);
    assert.equal(results.tokens.getItemAt(14).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(15).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(16).type, TokenType.EndOfStream);
});

test('IndentDedentParen', () => {
    const t = new Tokenizer();
    const results = t.tokenize('test (\n  i1\n       )\n  foo');
    assert.equal(results.tokens.count, 8 + _implicitTokenCount);

    // Test that indent and dedent tokens are suppressed within
    // a parnethetical clause.
    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.OpenParenthesis);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.CloseParenthesis);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.Indent);
    assert.equal(results.tokens.getItemAt(6).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(7).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(8).type, TokenType.Dedent);
    assert.equal(results.tokens.getItemAt(9).type, TokenType.EndOfStream);
});

test('Strings: unclosed', () => {
    const t = new Tokenizer();
    const results = t.tokenize(' "string" """line1\n#line2"""\t\'un#closed');
    assert.equal(results.tokens.count, 3 + _implicitTokenCount);

    const ranges = [[1, 8], [10, 18], [29, 10]];
    for (let i = 0; i < ranges.length; i += 1) {
        assert.equal(results.tokens.getItemAt(i).start, ranges[i][0]);
        assert.equal(results.tokens.getItemAt(i).length, ranges[i][1]);
        assert.equal(results.tokens.getItemAt(i).type, TokenType.String);
    }
});

test('Strings: escaped across multiple lines', () => {
    const t = new Tokenizer();
    const results = t.tokenize(' "a\\\nb" \'c\\\n\rb\'');
    assert.equal(results.tokens.count, 2 + _implicitTokenCount);

    const ranges = [[1, 6], [8, 7]];
    for (let i = 0; i < ranges.length; i += 1) {
        assert.equal(results.tokens.getItemAt(i).start, ranges[i][0]);
        assert.equal(results.tokens.getItemAt(i).length, ranges[i][1]);
        assert.equal(results.tokens.getItemAt(i).type, TokenType.String);
    }
});

test('Strings: block next to regular, double-quoted', () => {
    const t = new Tokenizer();
    const results = t.tokenize('"string""""s2"""');
    assert.equal(results.tokens.count, 2 + _implicitTokenCount);

    const ranges = [[0, 8], [8, 8]];
    for (let i = 0; i < ranges.length; i += 1) {
        assert.equal(results.tokens.getItemAt(i).start, ranges[i][0]);
        assert.equal(results.tokens.getItemAt(i).length, ranges[i][1]);
        assert.equal(results.tokens.getItemAt(i).type, TokenType.String);
    }
});

test('Strings: block next to block, double-quoted', () => {
    const t = new Tokenizer();
    const results = t.tokenize('""""""""');
    assert.equal(results.tokens.count, 2 + _implicitTokenCount);

    const ranges = [[0, 6], [6, 2]];
    for (let i = 0; i < ranges.length; i += 1) {
        assert.equal(results.tokens.getItemAt(i).start, ranges[i][0]);
        assert.equal(results.tokens.getItemAt(i).length, ranges[i][1]);
        assert.equal(results.tokens.getItemAt(i).type, TokenType.String);
    }
});

test('Strings: unclosed sequence of quotes', () => {
    const t = new Tokenizer();
    const results = t.tokenize('"""""');
    assert.equal(results.tokens.count, 1 + _implicitTokenCount);

    const ranges = [[0, 5]];
    for (let i = 0; i < ranges.length; i += 1) {
        assert.equal(results.tokens.getItemAt(i).start, ranges[i][0]);
        assert.equal(results.tokens.getItemAt(i).length, ranges[i][1]);
        assert.equal(results.tokens.getItemAt(i).type, TokenType.String);
    }
});

test('Strings: single quote escape', () => {
    const t = new Tokenizer();
    // tslint:disable-next-line:quotemark
    const results = t.tokenize("'\\'quoted\\''");
    assert.equal(results.tokens.count, 1 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 12);
});

test('Strings: double quote escape', () => {
    const t = new Tokenizer();
    const results = t.tokenize('"\\"quoted\\""');
    assert.equal(results.tokens.count, 1 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 12);
});

test('Strings: single quoted f-string ', () => {
    const t = new Tokenizer();
    // tslint:disable-next-line:quotemark
    const results = t.tokenize("a+f'quoted'");
    assert.equal(results.tokens.count, 3 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(2).length, 9);
});

test('Strings: double quoted f-string ', () => {
    const t = new Tokenizer();
    const results = t.tokenize('x(1,f"quoted")');
    assert.equal(results.tokens.count, 6 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.OpenParenthesis);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.Comma);
    assert.equal(results.tokens.getItemAt(4).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(4).length, 9);
    assert.equal(results.tokens.getItemAt(5).type, TokenType.CloseParenthesis);
});

test('Strings: single quoted multiline f-string ', () => {
    const t = new Tokenizer();
    // tslint:disable-next-line:quotemark
    const results = t.tokenize("f'''quoted'''");
    assert.equal(results.tokens.count, 1 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 13);
});

test('Strings: double quoted multiline f-string ', () => {
    const t = new Tokenizer();
    const results = t.tokenize('f"""quoted """');
    assert.equal(results.tokens.count, 1 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 14);
});

test('Strings: escape at the end of single quoted string ', () => {
    const t = new Tokenizer();
    // tslint:disable-next-line:quotemark
    const results = t.tokenize("'quoted\\'\nx");
    assert.equal(results.tokens.count, 3 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 9);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
});

test('Strings: escape at the end of double quoted string ', () => {
    const t = new Tokenizer();
    const results = t.tokenize('"quoted\\"\nx');
    assert.equal(results.tokens.count, 3 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 9);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
});

test('Strings: b/u/r-string', () => {
    const t = new Tokenizer();
    const results = t.tokenize('b"b" u"u" br"br" ur"ur"');
    assert.equal(results.tokens.count, 4 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 4);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(1).length, 4);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(2).length, 6);
    assert.equal(results.tokens.getItemAt(3).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(3).length, 6);
});

test('Strings: escape at the end of double quoted string ', () => {
    const t = new Tokenizer();
    const results = t.tokenize('"quoted\\"\nx');
    assert.equal(results.tokens.count, 3 + _implicitTokenCount);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.String);
    assert.equal(results.tokens.getItemAt(0).length, 9);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.NewLine);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
});

test('Comments', () => {
    const t = new Tokenizer();
    const results = t.tokenize(' #co"""mment1\n\t\n#comm\'ent2 ');
    assert.equal(results.tokens.count, 1 + _implicitTokenCountNoImplicitNewLine);
    assert.equal(results.tokens.getItemAt(0).type, TokenType.NewLine);
});

test('Period to operator token', () => {
    const t = new Tokenizer();
    const results = t.tokenize('x.y');
    assert.equal(results.tokens.count, 3 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.Dot);
    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
});

test('@ to operator token', () => {
    const t = new Tokenizer();
    const results = t.tokenize('@x');
    assert.equal(results.tokens.count, 2 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(1).type, TokenType.Identifier);
});

test('Unknown token', () => {
    const t = new Tokenizer();
    const results = t.tokenize('`$');
    assert.equal(results.tokens.count, 1 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Invalid);
});

test('Hex number', () => {
    const t = new Tokenizer();
    const results = t.tokenize('1 0X2 0xFe_Ab 0x');
    assert.equal(results.tokens.count, 5 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(0).length, 1);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).value, 1);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(1).length, 3);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).value, 2);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(2).length, 7);
    assert.equal((results.tokens.getItemAt(2) as NumberToken).value, 0xFEAB);
    assert.equal((results.tokens.getItemAt(2) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(3).length, 1);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(4).length, 1);
});

test('Binary number', () => {
    const t = new Tokenizer();
    const results = t.tokenize('1 0B1 0b010 0b3 0b');
    assert.equal(results.tokens.count, 7 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(0).length, 1);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).value, 1);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(1).length, 3);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).value, 1);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(2).length, 5);
    assert.equal((results.tokens.getItemAt(2) as NumberToken).value, 2);
    assert.equal((results.tokens.getItemAt(2) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(3).length, 1);
    assert.equal((results.tokens.getItemAt(3) as NumberToken).value, 0);
    assert.equal((results.tokens.getItemAt(3) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(4).length, 2);

    assert.equal(results.tokens.getItemAt(5).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(5).length, 1);

    assert.equal(results.tokens.getItemAt(6).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(6).length, 1);
});

test('Octal number', () => {
    const t = new Tokenizer();
    const results = t.tokenize('1 0o4 0O0_7_7 -0o200 0o9 0oO');
    assert.equal(results.tokens.count, 9 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(0).length, 1);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).value, 1);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(1).length, 3);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).value, 4);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(2).length, 7);
    assert.equal((results.tokens.getItemAt(2) as NumberToken).value, 0o77);
    assert.equal((results.tokens.getItemAt(2) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(3).length, 1);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(4).length, 5);
    assert.equal((results.tokens.getItemAt(4) as NumberToken).value, 0o200);
    assert.equal((results.tokens.getItemAt(4) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(5).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(5).length, 1);
    assert.equal((results.tokens.getItemAt(5) as NumberToken).value, 0);
    assert.equal((results.tokens.getItemAt(5) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(6).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(6).length, 2);
    assert.equal((results.tokens.getItemAt(6) as IdentifierToken).value, 'o9');

    assert.equal(results.tokens.getItemAt(7).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(7).length, 1);
    assert.equal((results.tokens.getItemAt(7) as NumberToken).value, 0);
    assert.equal((results.tokens.getItemAt(7) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(8).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(8).length, 2);
    assert.equal((results.tokens.getItemAt(8) as IdentifierToken).value, 'oO');
});

test('Decimal number', () => {
    const t = new Tokenizer();
    const results = t.tokenize('-2147483647 ++2147483647');
    assert.equal(results.tokens.count, 5 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(0).length, 1);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(1).length, 10);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).value, 2147483647);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).isInteger, true);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(2).length, 1);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(3).length, 1);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(4).length, 10);
    assert.equal((results.tokens.getItemAt(4) as NumberToken).value, 2147483647);
    assert.equal((results.tokens.getItemAt(4) as NumberToken).isInteger, true);
});

test('Decimal number operator', () => {
    const t = new Tokenizer();
    const results = t.tokenize('a[: -1]');
    assert.equal(results.tokens.count, 6 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(4).length, 1);
});

test('Floating point number', () => {
    const t = new Tokenizer();
    const results = t.tokenize('3.0 .2 ++.3e+12 --.4e1 1e-4 0.01');
    assert.equal(results.tokens.count, 10 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Number);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).value, 3);
    assert.equal((results.tokens.getItemAt(0) as NumberToken).isInteger, false);
    assert.equal(results.tokens.getItemAt(0).length, 3);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Number);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).value, 0.2);
    assert.equal((results.tokens.getItemAt(1) as NumberToken).isInteger, false);
    assert.equal(results.tokens.getItemAt(1).length, 2);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(2).length, 1);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(3).length, 1);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Number);
    assert.equal((results.tokens.getItemAt(4) as NumberToken).value, 0.3e12);
    assert.equal((results.tokens.getItemAt(4) as NumberToken).isInteger, false);
    assert.equal(results.tokens.getItemAt(4).length, 6);

    assert.equal(results.tokens.getItemAt(5).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(5).length, 1);

    assert.equal(results.tokens.getItemAt(6).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(6).length, 1);

    assert.equal(results.tokens.getItemAt(7).type, TokenType.Number);
    assert.equal((results.tokens.getItemAt(7) as NumberToken).value, 0.4e1);
    assert.equal((results.tokens.getItemAt(7) as NumberToken).isInteger, false);
    assert.equal(results.tokens.getItemAt(7).length, 4);

    assert.equal(results.tokens.getItemAt(8).type, TokenType.Number);
    assert.equal((results.tokens.getItemAt(8) as NumberToken).value, 1e-4);
    assert.equal((results.tokens.getItemAt(8) as NumberToken).isInteger, false);
    assert.equal(results.tokens.getItemAt(8).length, 4);

    assert.equal(results.tokens.getItemAt(9).type, TokenType.Number);
    assert.equal((results.tokens.getItemAt(9) as NumberToken).value, 0.01);
    assert.equal((results.tokens.getItemAt(9) as NumberToken).isInteger, false);
    assert.equal(results.tokens.getItemAt(9).length, 4);
});

test('Floating point numbers with parens', () => {
    const t = new Tokenizer();
    const results = t.tokenize('(3.0) (.2) (+.3e+12, .4e1; 0)');
    assert.equal(results.tokens.count, 14 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(1).length, 3);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(4).length, 2);

    assert.equal(results.tokens.getItemAt(8).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(8).length, 6);

    assert.equal(results.tokens.getItemAt(10).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(10).length, 4);

    assert.equal(results.tokens.getItemAt(12).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(12).length, 1);
});

test('Floating point numbers with operators', () => {
    const t = new Tokenizer();
    const results = t.tokenize('88.9/100.0*4.0-2.0,');
    assert.equal(results.tokens.count, 8 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(0).length, 4);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(2).length, 5);

    assert.equal(results.tokens.getItemAt(4).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(4).length, 3);

    assert.equal(results.tokens.getItemAt(6).type, TokenType.Number);
    assert.equal(results.tokens.getItemAt(6).length, 3);
});

test('Underscore numbers', () => {
    const t = new Tokenizer();
    const results = t.tokenize('1_0_0_0 0_0 .5_00_3e-4 0xC__A_FE_F00D 10_000_000.0 0b_0011_1111_0100_1110');
    const lengths = [7, 3, 10, 14, 12, 22];
    const isIntegers = [true, true, false, true, false, true];
    assert.equal(results.tokens.count, 6 + _implicitTokenCount);

    for (let i = 0; i < lengths.length; i += 1) {
        assert.equal(results.tokens.getItemAt(i).type, TokenType.Number);
        assert.equal(results.tokens.getItemAt(i).length, lengths[i]);
        assert.equal((results.tokens.getItemAt(i) as NumberToken).isInteger, isIntegers[i]);
    }
});

test('Simple expression, leading minus', () => {
    const t = new Tokenizer();
    const results = t.tokenize('x == -y');
    assert.equal(results.tokens.count, 4 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(0).length, 1);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(1).length, 2);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Operator);
    assert.equal(results.tokens.getItemAt(2).length, 1);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(3).length, 1);
});

test('Operators', () => {
    const text = '< << <<= ' +
        '== != > >> >>= >= <=' +
        '+ - ~ %' +
        '* ** / // /= //=' +
        '*= += -= %= **= ' +
        '& &= | |= ^ ^=';
    const results = new Tokenizer().tokenize(text);
    const lengths = [
        1, 2, 3,
        2, 2, 1, 2, 3, 2, 2,
        1, 1, 1, 1,
        1, 2, 1, 2, 2, 3,
        2, 2, 2, 2, 3,
        1, 2, 1, 2, 1, 2];
    const operatorTypes = [
        OperatorType.LessThan,
        OperatorType.LeftShift,
        OperatorType.LeftShiftEqual,
        OperatorType.Equals,
        OperatorType.NotEquals,
        OperatorType.GreaterThan,
        OperatorType.RightShift,
        OperatorType.RightShiftEqual,
        OperatorType.GreaterThanOrEqual,
        OperatorType.LessThanOrEqual,
        OperatorType.Add,
        OperatorType.Subtract,
        OperatorType.BitwiseInvert,
        OperatorType.Mod,
        OperatorType.Multiply,
        OperatorType.Power,
        OperatorType.Divide,
        OperatorType.FloorDivide,
        OperatorType.DivideEqual,
        OperatorType.FloorDivideEqual,
        OperatorType.MultiplyEqual,
        OperatorType.AddEqual,
        OperatorType.SubtractEqual,
        OperatorType.ModEqual,
        OperatorType.PowerEqual,
        OperatorType.BitwiseAnd,
        OperatorType.BitwiseAndEqual,
        OperatorType.BitwiseOr,
        OperatorType.BitwiseOrEqual,
        OperatorType.ExclusiveOr,
        OperatorType.ExclusiveOrEqual];
    assert.equal(results.tokens.count - _implicitTokenCount, lengths.length);
    assert.equal(results.tokens.count - _implicitTokenCount, operatorTypes.length);
    for (let i = 0; i < lengths.length; i += 1) {
        const t = results.tokens.getItemAt(i);
        assert.equal(t.type, TokenType.Operator, `${t.type} at ${i} is not an operator`);
        assert.equal((t as OperatorToken).operatorType, operatorTypes[i]);
        assert.equal(t.length, lengths[i],
            `Length ${t.length} at ${i} (text ${text.substr(t.start, t.length)}), expected ${lengths[i]}`);
    }
});

test('Identifiers', () => {
    const t = new Tokenizer();
    const results = t.tokenize('and __and __and__ and__');
    assert.equal(results.tokens.count, 4 + _implicitTokenCount);

    assert.equal(results.tokens.getItemAt(0).type, TokenType.Keyword);
    assert.equal(results.tokens.getItemAt(0).length, 3);

    assert.equal(results.tokens.getItemAt(1).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(1).length, 5);

    assert.equal(results.tokens.getItemAt(2).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(2).length, 7);

    assert.equal(results.tokens.getItemAt(3).type, TokenType.Identifier);
    assert.equal(results.tokens.getItemAt(3).length, 5);
});
