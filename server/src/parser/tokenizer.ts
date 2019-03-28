/*
* tokenizer.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Based on code from vscode-python repository:
*  https://github.com/Microsoft/vscode-python
*
* Converts a Python program text stream into a stream of tokens.
*/

import Char from 'typescript-char';

import { TextRange } from '../common/textRange';
import { TextRangeCollection } from '../common/textRangeCollection';
import { isBinary, isDecimal, isHex, isIdentifierChar, isIdentifierStartChar, isOctal } from './characters';
import { CharacterStream } from './characterStream';
import { DedentToken, IdentifierToken, IndentToken, KeywordToken, KeywordType,
    NewLineToken, NewLineType, NumberToken, OperatorFlags, OperatorToken, OperatorType,
    QuoteTypeFlags, StringToken, Token, TokenType } from './tokenizerTypes';

const _keywords: { [key: string]: KeywordType } = {
    'and': KeywordType.And,
    'as': KeywordType.As,
    'assert': KeywordType.Assert,
    'async': KeywordType.Async,
    'await': KeywordType.Await,
    'break': KeywordType.Break,
    'class': KeywordType.Class,
    'continue': KeywordType.Continue,
    '__debug__': KeywordType.Debug,
    'def': KeywordType.Def,
    'del': KeywordType.Del,
    'elif': KeywordType.Elif,
    'else': KeywordType.Else,
    'except': KeywordType.Except,
    'finally': KeywordType.Finally,
    'for': KeywordType.For,
    'from': KeywordType.From,
    'global': KeywordType.Global,
    'if': KeywordType.If,
    'import': KeywordType.Import,
    'in': KeywordType.In,
    'is': KeywordType.Is,
    'lambda': KeywordType.Lambda,
    'nonlocal': KeywordType.Nonlocal,
    'not': KeywordType.Not,
    'or': KeywordType.Or,
    'pass': KeywordType.Pass,
    'raise': KeywordType.Raise,
    'return': KeywordType.Return,
    'try': KeywordType.Try,
    'while': KeywordType.While,
    'with': KeywordType.With,
    'yield': KeywordType.Yield,
    'False': KeywordType.False,
    'None': KeywordType.None,
    'True': KeywordType.True
};

const _operatorInfo: { [key: number]: OperatorFlags } = {
    [OperatorType.Add]: OperatorFlags.Unary | OperatorFlags.Binary,
    [OperatorType.AddEqual]: OperatorFlags.Assignment,
    [OperatorType.Assign]: OperatorFlags.Assignment,
    [OperatorType.BitwiseAnd]: OperatorFlags.Binary,
    [OperatorType.BitwiseAndEqual]: OperatorFlags.Assignment,
    [OperatorType.BitwiseInvert]: OperatorFlags.Unary,
    [OperatorType.BitwiseOr]: OperatorFlags.Binary,
    [OperatorType.BitwiseOrEqual]: OperatorFlags.Assignment,
    [OperatorType.Divide]: OperatorFlags.Binary,
    [OperatorType.DivideEqual]: OperatorFlags.Assignment,
    [OperatorType.Equals]: OperatorFlags.Binary | OperatorFlags.Comparison,
    [OperatorType.ExclusiveOr]: OperatorFlags.Binary,
    [OperatorType.ExclusiveOrEqual]: OperatorFlags.Assignment,
    [OperatorType.FloorDivide]: OperatorFlags.Binary,
    [OperatorType.FloorDivideEqual]: OperatorFlags.Assignment,
    [OperatorType.GreaterThan]: OperatorFlags.Binary | OperatorFlags.Comparison,
    [OperatorType.GreaterThanOrEqual]: OperatorFlags.Binary | OperatorFlags.Comparison,
    [OperatorType.LeftShift]: OperatorFlags.Binary,
    [OperatorType.LeftShiftEqual]: OperatorFlags.Assignment,
    [OperatorType.LessThan]: OperatorFlags.Binary | OperatorFlags.Comparison,
    [OperatorType.LessThanOrEqual]: OperatorFlags.Binary | OperatorFlags.Comparison,
    [OperatorType.MatrixMultiply]: OperatorFlags.Binary,
    [OperatorType.MatrixMultiplyEqual]: OperatorFlags.Assignment,
    [OperatorType.Mod]: OperatorFlags.Binary,
    [OperatorType.ModEqual]: OperatorFlags.Assignment,
    [OperatorType.Multiply]: OperatorFlags.Binary,
    [OperatorType.MultiplyEqual]: OperatorFlags.Assignment,
    [OperatorType.NotEquals]: OperatorFlags.Binary | OperatorFlags.Comparison,
    [OperatorType.Power]: OperatorFlags.Binary,
    [OperatorType.PowerEqual]: OperatorFlags.Assignment,
    [OperatorType.RightShift]: OperatorFlags.Binary,
    [OperatorType.RightShiftEqual]: OperatorFlags.Assignment,
    [OperatorType.Subtract]: OperatorFlags.Binary,
    [OperatorType.SubtractEqual]: OperatorFlags.Assignment,

    [OperatorType.And]: OperatorFlags.Binary,
    [OperatorType.Or]: OperatorFlags.Binary,
    [OperatorType.Not]: OperatorFlags.Unary,
    [OperatorType.Is]: OperatorFlags.Binary,
    [OperatorType.IsNot]: OperatorFlags.Binary,
    [OperatorType.In]: OperatorFlags.Binary,
    [OperatorType.NotIn]: OperatorFlags.Binary
};

export interface TokenizerOutput {
    tokens: TextRangeCollection<Token>;
    lines: TextRangeCollection<TextRange>;
}

export class Tokenizer {
    private _cs = new CharacterStream('');
    private _tokens: Token[] = [];
    private _prevLineStart = 0;
    private _parenDepth = 0;
    private _lineRanges: TextRange[] = [];
    private _indentAmounts: number[] = [];

    tokenize(text: string, start?: number, length?: number): TokenizerOutput {
        if (start === undefined) {
            start = 0;
        } else if (start < 0 || start > text.length) {
            throw new Error('Invalid range start');
        }

        if (length === undefined) {
            length = text.length;
        } else if (length < 0 || start + length > text.length) {
            throw new Error('Invalid range length');
        }

        this._cs = new CharacterStream(text);
        this._cs.position = start;
        this._tokens = [];
        this._prevLineStart = 0;
        this._parenDepth = 0;
        this._lineRanges = [];
        this._indentAmounts = [];

        const end = start + length;
        while (!this._cs.isEndOfStream()) {
            this._addNextToken();

            if (this._cs.position >= end) {
                break;
            }
        }

        // Insert an implied new line to make parsing easier.
        if (this._tokens.length === 0 || this._tokens[this._tokens.length - 1].type !== TokenType.NewLine) {
            this._tokens.push(new NewLineToken(this._cs.position, 0, NewLineType.Implied));
        }

        // Insert any implied dedent tokens.
        this._setIndent(0);

        // Add a final end-of-stream token to make parsing easier.
        this._tokens.push(new Token(TokenType.EndOfStream, this._cs.position, 0));

        // Add the final line range.
        this._addLineRange();

        return {
            tokens: new TextRangeCollection(this._tokens),
            lines: new TextRangeCollection(this._lineRanges)
        };
    }

    static getOperatorInfo(operatorType: OperatorType): OperatorFlags {
        return _operatorInfo[operatorType];
    }

    static isOperatorAssignment(operatorType?: OperatorType): boolean {
        if (operatorType === undefined || _operatorInfo[operatorType] === undefined) {
            return false;
        }
        return (_operatorInfo[operatorType] & OperatorFlags.Assignment) !== 0;
    }

    static isOperatorComparison(operatorType?: OperatorType): boolean {
        if (operatorType === undefined || _operatorInfo[operatorType] === undefined) {
            return false;
        }
        return (_operatorInfo[operatorType] & OperatorFlags.Comparison) !== 0;
    }

    private _addNextToken(): void {
        this._cs.skipWhitespace();

        if (this._cs.isEndOfStream()) {
            return;
        }

        if (!this._handleCharacter()) {
            this._cs.moveNext();
        }
    }

    private _handleCharacter(): boolean {
        // f-strings, b-strings, etc
        const stringPrefixLength = this._getStringPrefixLength();

        if (stringPrefixLength >= 0) {
            let stringPrefix = '';
            if (stringPrefixLength > 0) {
                stringPrefix = this._cs.getText().substr(this._cs.position, stringPrefixLength);
                // Indeed a string
                this._cs.advance(stringPrefixLength);
            }

            const quoteTypeFlags = this._getQuoteTypeFlags(stringPrefix);
            if (quoteTypeFlags !== QuoteTypeFlags.None) {
                this._handleString(quoteTypeFlags, stringPrefixLength);
                return true;
            }
        }

        if (this._cs.currentChar === Char.Hash) {
            this._handleComment();
            return true;
        }

        switch (this._cs.currentChar) {
            case Char.CarriageReturn:
                const length = this._cs.nextChar === Char.LineFeed ? 2 : 1;
                const newLineType = length === 2 ?
                    NewLineType.CarriageReturnLineFeed : NewLineType.CarriageReturn;
                this._handleNewLine(length, newLineType);
                return true;

            case Char.LineFeed:
                this._handleNewLine(1, NewLineType.LineFeed);
                return true;

            case Char.Backslash:
                if (this._cs.nextChar === Char.CarriageReturn) {
                    if (this._cs.lookAhead(2) === Char.LineFeed) {
                        this._cs.advance(3);
                    } else {
                        this._cs.advance(2);
                    }
                    this._addLineRange();
                    return true;
                } else if (this._cs.nextChar === Char.LineFeed) {
                    this._cs.advance(2);
                    this._addLineRange();
                    return true;
                }
                this._handleInvalid();
                return true;

            case Char.OpenParenthesis:
                this._parenDepth++;
                this._tokens.push(new Token(TokenType.OpenParenthesis, this._cs.position, 1));
                break;

            case Char.CloseParenthesis:
                if (this._parenDepth > 0) {
                    this._parenDepth--;
                }
                this._tokens.push(new Token(TokenType.CloseParenthesis, this._cs.position, 1));
                break;

            case Char.OpenBracket:
                this._parenDepth++;
                this._tokens.push(new Token(TokenType.OpenBracket, this._cs.position, 1));
                break;

            case Char.CloseBracket:
                if (this._parenDepth > 0) {
                    this._parenDepth--;
                }
                this._tokens.push(new Token(TokenType.CloseBracket, this._cs.position, 1));
                break;

            case Char.OpenBrace:
                this._parenDepth++;
                this._tokens.push(new Token(TokenType.OpenCurlyBrace, this._cs.position, 1));
                break;

            case Char.CloseBrace:
                if (this._parenDepth > 0) {
                    this._parenDepth--;
                }
                this._tokens.push(new Token(TokenType.CloseCurlyBrace, this._cs.position, 1));
                break;

            case Char.Comma:
                this._tokens.push(new Token(TokenType.Comma, this._cs.position, 1));
                break;

            case Char.Semicolon:
                this._tokens.push(new Token(TokenType.Semicolon, this._cs.position, 1));
                break;

            case Char.Colon:
                this._tokens.push(new Token(TokenType.Colon, this._cs.position, 1));
                break;

            default:
                if (this._isPossibleNumber()) {
                    if (this._tryNumber()) {
                        return true;
                    }
                }

                if (this._cs.currentChar === Char.Period) {
                    if (this._cs.nextChar === Char.Period && this._cs.lookAhead(2) === Char.Period) {
                        this._tokens.push(new Token(TokenType.Ellipsis, this._cs.position, 3));
                        this._cs.advance(3);
                        return true;
                    }
                    this._tokens.push(new Token(TokenType.Dot, this._cs.position, 1));
                    break;
                }

                if (!this._tryIdentifier()) {
                    if (!this._tryOperator()) {
                        this._handleInvalid();
                    }
                }
                return true;
        }
        return false;
    }

    private _addLineRange() {
        const lineLength = this._cs.position - this._prevLineStart;
        if (lineLength > 0) {
            this._lineRanges.push(new TextRange(this._prevLineStart, lineLength));
        }

        this._prevLineStart = this._cs.position;
    }

    private _handleNewLine(length: number, newLineType: NewLineType) {
        if (this._parenDepth === 0 && newLineType !== NewLineType.Implied) {
            // New lines are ignored within parentheses.
            // We'll also avoid adding multiple newlines in a row to simplify parsing.
            if (this._tokens.length === 0 || this._tokens[this._tokens.length - 1].type !== TokenType.NewLine) {
                this._tokens.push(new NewLineToken(this._cs.position, length, newLineType));
            }
        }
        this._cs.advance(length);
        this._addLineRange();
        this._readIndentationAfterNewLine();
    }

    private _readIndentationAfterNewLine() {
        let spaceCount = 0;

        while (!this._cs.isEndOfStream()) {
            switch (this._cs.currentChar) {
                case Char.Space:
                    spaceCount++;
                    this._cs.moveNext();
                    break;

                case Char.Tab:
                    spaceCount += 8 - (spaceCount % 8);
                    this._cs.moveNext();
                    break;

                case Char.FormFeed:
                    spaceCount = 0;
                    this._cs.moveNext();
                    break;

                default:
                    // Non-blank line. Set the current indent level.
                    this._setIndent(spaceCount);
                    return;

                case Char.Hash:
                case Char.LineFeed:
                case Char.CarriageReturn:
                    // Blank line -- no need to adjust indentation.
                    return;
            }
        }
    }

    private _setIndent(spaceCount: number) {
        // Indentations are ignored within a parenthesized clause.
        if (this._parenDepth > 0) {
            return;
        }

        // Insert indent or dedent tokens as necessary.
        if (this._indentAmounts.length === 0) {
            if (spaceCount > 0) {
                this._indentAmounts.push(spaceCount);
                this._tokens.push(new IndentToken(this._cs.position, 0, spaceCount));
            }
        } else {
            if (this._indentAmounts[this._indentAmounts.length - 1] < spaceCount) {
                this._indentAmounts.push(spaceCount);
                this._tokens.push(new IndentToken(this._cs.position, 0, spaceCount));
            } else {
                // The Python spec says that dedent amounts need to match the indent
                // amount exactly. An error is generated at runtime if it doesn't.
                // We'll record that error condition within the token, allowing the
                // parser to report it later.
                let dedentPoints: number[] = [];
                while (this._indentAmounts.length > 0 &&
                        this._indentAmounts[this._indentAmounts.length - 1] > spaceCount) {
                    dedentPoints.push(this._indentAmounts.length > 1 ?
                        this._indentAmounts[this._indentAmounts.length - 2] : 0);
                    this._indentAmounts.pop();
                }

                dedentPoints.forEach((dedentAmount, index) => {
                    let matchesIndent = index < dedentPoints.length - 1 ||
                        dedentAmount === spaceCount;
                    let actualDedentAmount = index < dedentPoints.length - 1 ?
                        dedentAmount : spaceCount;
                    this._tokens.push(new DedentToken(this._cs.position, 0, actualDedentAmount,
                        matchesIndent));
                });
            }
        }
    }

    private _tryIdentifier(): boolean {
        const start = this._cs.position;
        if (isIdentifierStartChar(this._cs.currentChar)) {
            this._cs.moveNext();
            while (isIdentifierChar(this._cs.currentChar)) {
                this._cs.moveNext();
            }
        }
        if (this._cs.position > start) {
            const value = this._cs.getText().substr(start, this._cs.position - start);
            if (_keywords[value] !== undefined) {
                this._tokens.push(new KeywordToken(start, this._cs.position - start, _keywords[value]));
            } else {
                this._tokens.push(new IdentifierToken(start, this._cs.position - start, value));
            }
            return true;
        }
        return false;
    }

    private _isPossibleNumber(): boolean {
        if (isDecimal(this._cs.currentChar)) {
            return true;
        }

        if (this._cs.currentChar === Char.Period && isDecimal(this._cs.nextChar)) {
            return true;
        }

        return false;
    }

    private _tryNumber(): boolean {
        const start = this._cs.position;

        if (this._cs.currentChar === Char._0) {
            let radix = 0;
            let leadingChars = 0;

            // Try hex => hexinteger: "0" ("x" | "X") (["_"] hexdigit)+
            if ((this._cs.nextChar === Char.x || this._cs.nextChar === Char.X) && isHex(this._cs.lookAhead(2))) {
                this._cs.advance(2);
                leadingChars = 2;
                while (isHex(this._cs.currentChar)) {
                    this._cs.moveNext();
                }
                radix = 16;
            }
            // Try binary => bininteger: "0" ("b" | "B") (["_"] bindigit)+
            if ((this._cs.nextChar === Char.b || this._cs.nextChar === Char.B) && isBinary(this._cs.lookAhead(2))) {
                this._cs.advance(2);
                leadingChars = 2;
                while (isBinary(this._cs.currentChar)) {
                    this._cs.moveNext();
                }
                radix = 2;
            }
            // Try octal => octinteger: "0" ("o" | "O") (["_"] octdigit)+
            if ((this._cs.nextChar === Char.o || this._cs.nextChar === Char.O) && isOctal(this._cs.lookAhead(2))) {
                this._cs.advance(2);
                leadingChars = 2;
                while (isOctal(this._cs.currentChar)) {
                    this._cs.moveNext();
                }
                radix = 8;
            }
            if (radix > 0) {
                const text = this._cs.getText().substr(start, this._cs.position - start);
                const value = parseInt(text.substr(leadingChars).replace(/_/g, ''), radix);
                if (!isNaN(value)) {
                    this._tokens.push(new NumberToken(start, text.length, value, true));
                    return true;
                }
            }
        }

        let isDecimalInteger = false;
        let mightBeFloatingPoint = false;
        // Try decimal int =>
        //    decinteger: nonzerodigit (["_"] digit)* | "0" (["_"] "0")*
        //    nonzerodigit: "1"..."9"
        //    digit: "0"..."9"
        if (this._cs.currentChar >= Char._1 && this._cs.currentChar <= Char._9) {
            while (isDecimal(this._cs.currentChar)) {
                mightBeFloatingPoint = true;
                this._cs.moveNext();
            }
            isDecimalInteger = this._cs.currentChar !== Char.Period && this._cs.currentChar !== Char.e && this._cs.currentChar !== Char.E;
        }

        // "0" (["_"] "0")*
        if (this._cs.currentChar === Char._0) {
            mightBeFloatingPoint = true;
            while (this._cs.currentChar === Char._0 || this._cs.currentChar === Char.Underscore) {
                this._cs.moveNext();
            }
            isDecimalInteger = this._cs.currentChar !== Char.Period && this._cs.currentChar !== Char.e && this._cs.currentChar !== Char.E;
        }

        if (isDecimalInteger) {
            const text = this._cs.getText().substr(start, this._cs.position - start);
            const value = parseInt(text.replace(/_/g, ''), 10);
            if (!isNaN(value)) {
                this._tokens.push(new NumberToken(start, text.length, value, true));
                return true;
            }
        }

        // Floating point. Sign and leading digits were already skipped over.
        this._cs.position = start;
        if (mightBeFloatingPoint ||
            (this._cs.currentChar === Char.Period && this._cs.nextChar >= Char._0 && this._cs.nextChar <= Char._9)) {
            if (this._skipFloatingPointCandidate()) {
                const text = this._cs.getText().substr(start, this._cs.position - start);
                const value = parseFloat(text);
                if (!isNaN(value)) {
                    this._tokens.push(new NumberToken(start, this._cs.position - start, value, false));
                    return true;
                }
            }
        }

        this._cs.position = start;
        return false;
    }

    private _tryOperator(): boolean {
        let length = 0;
        const nextChar = this._cs.nextChar;
        let operatorType: OperatorType;

        switch (this._cs.currentChar) {
            case Char.Plus:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.AddEqual : OperatorType.Add;
                break;

            case Char.Ampersand:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.BitwiseAndEqual : OperatorType.BitwiseAnd;
                break;

            case Char.Bar:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.BitwiseOrEqual : OperatorType.BitwiseOr;
                break;

            case Char.Caret:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.ExclusiveOrEqual : OperatorType.ExclusiveOr;
                break;

            case Char.Equal:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.Equals : OperatorType.Assign;
                break;

            case Char.ExclamationMark:
                if (nextChar !== Char.Equal) {
                    return false;
                }
                length = 2;
                operatorType = OperatorType.NotEquals;
                break;

            case Char.Percent:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.ModEqual : OperatorType.Mod;
                break;

            case Char.Tilde:
                length = 1;
                operatorType = OperatorType.BitwiseInvert;
                break;

            case Char.Hyphen:
                if (nextChar === Char.Greater) {
                    this._tokens.push(new Token(TokenType.Arrow, this._cs.position, 2));
                    this._cs.advance(2);
                    return true;
                }

                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.SubtractEqual : OperatorType.Subtract;
                break;

            case Char.Asterisk:
                if (nextChar === Char.Asterisk) {
                    length = this._cs.lookAhead(2) === Char.Equal ? 3 : 2;
                    operatorType = length === 3 ? OperatorType.PowerEqual : OperatorType.Power;
                } else {
                    length = nextChar === Char.Equal ? 2 : 1;
                    operatorType = length === 2 ? OperatorType.MultiplyEqual : OperatorType.Multiply;
                }
                break;

            case Char.Slash:
                if (nextChar === Char.Slash) {
                    length = this._cs.lookAhead(2) === Char.Equal ? 3 : 2;
                    operatorType = length === 3 ? OperatorType.FloorDivideEqual : OperatorType.FloorDivide;
                } else {
                    length = nextChar === Char.Equal ? 2 : 1;
                    operatorType = length === 2 ? OperatorType.DivideEqual : OperatorType.Divide;
                }
                break;

            case Char.Less:
                if (nextChar === Char.Less) {
                    length = this._cs.lookAhead(2) === Char.Equal ? 3 : 2;
                    operatorType = length === 3 ? OperatorType.LeftShiftEqual : OperatorType.LeftShift;
                } else {
                    length = nextChar === Char.Equal ? 2 : 1;
                    operatorType = length === 2 ? OperatorType.LessThanOrEqual : OperatorType.LessThan;
                }
                break;

            case Char.Greater:
                if (nextChar === Char.Greater) {
                    length = this._cs.lookAhead(2) === Char.Equal ? 3 : 2;
                    operatorType = length === 3 ? OperatorType.RightShiftEqual : OperatorType.RightShift;
                } else {
                    length = nextChar === Char.Equal ? 2 : 1;
                    operatorType = length === 2 ? OperatorType.GreaterThanOrEqual : OperatorType.GreaterThan;
                }
                break;

            case Char.At:
                length = nextChar === Char.Equal ? 2 : 1;
                operatorType = length === 2 ? OperatorType.MatrixMultiplyEqual : OperatorType.MatrixMultiply;
                break;

            default:
                return false;
        }
        this._tokens.push(new OperatorToken(this._cs.position, length, operatorType));
        this._cs.advance(length);
        return length > 0;
    }

    private _handleInvalid(): boolean {
        const start = this._cs.position;
        this._cs.skipToWhitespace();
        const length = this._cs.position - start;
        if (length > 0) {
            this._tokens.push(new Token(TokenType.Invalid, start, length));
            return true;
        }
        return false;
    }

    private _handleComment(): void {
        this._cs.skipToEol();
    }

    private _getStringPrefixLength(): number {
        if (this._cs.currentChar === Char.SingleQuote || this._cs.currentChar === Char.DoubleQuote) {
            // Simple string, no prefix
            return 0;
        }

        if (this._cs.nextChar === Char.SingleQuote || this._cs.nextChar === Char.DoubleQuote) {
            switch (this._cs.currentChar) {
                case Char.f:
                case Char.F:
                case Char.r:
                case Char.R:
                case Char.b:
                case Char.B:
                case Char.u:
                case Char.U:
                    // Single-char prefix like u"" or r""
                    return 1;
                default:
                    break;
            }
        }

        if (this._cs.lookAhead(2) === Char.SingleQuote || this._cs.lookAhead(2) === Char.DoubleQuote) {
            const prefix = this._cs.getText().substr(this._cs.position, 2).toLowerCase();
            switch (prefix) {
                case 'rf':
                case 'fr':
                case 'ur':
                case 'ru':
                case 'br':
                case 'rb':
                    return 2;
                default:
                    break;
            }
        }
        return -1;
    }

    private _getQuoteTypeFlags(prefix: string): QuoteTypeFlags {
        let flags = QuoteTypeFlags.None;

        if (prefix.length > 0) {
            prefix = prefix.toLowerCase();
            if (prefix[0] === 'u') {
                flags |= QuoteTypeFlags.Unicode;
            } else if (prefix[0] === 'b') {
                flags |= QuoteTypeFlags.Byte;
            }

            if (prefix[prefix.length - 1] === 'r') {
                flags |= QuoteTypeFlags.Raw;
            }
        }

        if (this._cs.currentChar === Char.SingleQuote) {
            flags |= QuoteTypeFlags.SingleQuote;
            if (this._cs.nextChar === Char.SingleQuote && this._cs.lookAhead(2) === Char.SingleQuote) {
                flags |= QuoteTypeFlags.Triplicate;
            }
            return flags;
        }
        if (this._cs.currentChar === Char.DoubleQuote) {
            flags |= QuoteTypeFlags.DoubleQuote;
            if (this._cs.nextChar === Char.DoubleQuote && this._cs.lookAhead(2) === Char.DoubleQuote) {
                flags |= QuoteTypeFlags.Triplicate;
            }
            return flags;
        }
        return QuoteTypeFlags.None;
    }

    private _handleString(quoteTypeFlags: QuoteTypeFlags, stringPrefixLength: number): void {
        let start = this._cs.position - stringPrefixLength;
        let quoteLength = 1;

        if (quoteTypeFlags & QuoteTypeFlags.Triplicate) {
            this._cs.advance(3);
            this._skipToTripleEndQuote(quoteTypeFlags & QuoteTypeFlags.SingleQuote ?
                Char.SingleQuote : Char.DoubleQuote);
            quoteLength = 3;
        } else {
            this._cs.moveNext();
            this._skipToSingleEndQuote(quoteTypeFlags & QuoteTypeFlags.SingleQuote ?
                Char.SingleQuote : Char.DoubleQuote);
        }

        let end = this._cs.position;

        // TODO - need to handle proper de-escaping to get string value
        const value = this._cs.getText().substr(start + stringPrefixLength + quoteLength,
            end - start - quoteLength * 2 - stringPrefixLength);
        this._tokens.push(new StringToken(start, end - start, quoteTypeFlags, value));
    }

    private _skipToSingleEndQuote(quote: number): void {
        let isEscaped = false;

        while (!this._cs.isEndOfStream()) {
            if (this._cs.currentChar === Char.LineFeed || this._cs.currentChar === Char.CarriageReturn) {
                if (!isEscaped) {
                    // Unterminated single-line string
                    return;
                } else {
                    // TODO - need to properly handle escapes \ooo, \xhh, \N{name}, \uxxxx and \Uxxxxxxxx
                    isEscaped = false;

                    // Skip over the escaped new line (either one or two characters).
                    if (this._cs.currentChar === Char.LineFeed && this._cs.nextChar === Char.CarriageReturn) {
                        this._cs.advance(2);
                        continue;
                    } else {
                        this._cs.moveNext();
                        continue;
                    }
                }
            }

            if (this._cs.currentChar === Char.Backslash) {
                isEscaped = !isEscaped;
            } else {
                if (!isEscaped && this._cs.currentChar === quote) {
                    break;
                }
                isEscaped = false;
            }
            this._cs.moveNext();
        }

        this._cs.moveNext();
    }

    private _skipToTripleEndQuote(quote: number): void {
        while (!this ._cs.isEndOfStream() && (this._cs.currentChar !== quote ||
                this._cs.nextChar !== quote || this._cs.lookAhead(2) !== quote)) {

            // TODO - need to handle escaping of all flavors
            if (this._cs.currentChar === Char.CarriageReturn) {
                if (this._cs.nextChar === Char.LineFeed) {
                    this._cs.moveNext();
                }
                this._cs.moveNext();
                this._addLineRange();
            } else if (this._cs.currentChar === Char.LineFeed) {
                this._cs.moveNext();
                this._addLineRange();
            } else {
                this._cs.moveNext();
            }
        }
        this._cs.advance(3);
    }

    private _skipFloatingPointCandidate(): boolean {
        // Determine end of the potential floating point number
        const start = this._cs.position;
        this._skipFractionalNumber();
        if (this._cs.position > start) {
            // Optional exponent sign
            if (this._cs.currentChar === Char.e || this._cs.currentChar === Char.E) {
                this._cs.moveNext();

                // Skip exponent value
                this._skipDecimalNumber(true);
            }
        }
        return this._cs.position > start;
    }

    private _skipFractionalNumber(): void {
        this._skipDecimalNumber(false);
        if (this._cs.currentChar === Char.Period) {
            // Optional period
            this._cs.moveNext();
        }
        this._skipDecimalNumber(false);
    }

    private _skipDecimalNumber(allowSign: boolean): void {
        if (allowSign && (this._cs.currentChar === Char.Hyphen || this._cs.currentChar === Char.Plus)) {
            // Optional sign
            this._cs.moveNext();
        }
        while (isDecimal(this._cs.currentChar)) {
            // Skip integer part
            this._cs.moveNext();
        }
    }
}
