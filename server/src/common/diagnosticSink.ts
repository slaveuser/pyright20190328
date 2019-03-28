/*
* diagnostics.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Class that represents errors and warnings.
*/

import { Diagnostic, DiagnosticCategory, DiagnosticTextRange } from './diagnostic';
import { convertOffsetsToRange } from './positionUtils';
import { TextRange } from './textRange';
import { TextRangeCollection } from './textRangeCollection';

// Represents a collection of diagnostics within a file.
export interface FileDiagnostics {
    filePath: string;
    diagnostics: Diagnostic[];
}

// Creates and tracks a list of diagnostics.
export class DiagnosticSink {
    diagnostics: Diagnostic[] = [];

    constructor(diagnostics?: Diagnostic[]) {
        this.diagnostics = diagnostics || [];
    }

    discard() {
        this.diagnostics = [];
    }

    addError(message: string, range?: DiagnosticTextRange) {
        this.addDiagnostic(new Diagnostic(DiagnosticCategory.Error, message, range));
    }

    addWarning(message: string, range?: DiagnosticTextRange) {
        this.addDiagnostic(new Diagnostic(DiagnosticCategory.Warning, message, range));
    }

    addDiagnostic(diag: Diagnostic) {
        this.diagnostics.push(diag);
    }

    addDiagnostics(diagsToAdd: Diagnostic[]) {
        this.diagnostics.push(...diagsToAdd);
    }
}

// Specialized version of DiagnosticSink that works with TextRange objects
// and converts text ranges to line and column numbers.
export class TextRangeDiagnosticSink extends DiagnosticSink {
    private _lines: TextRangeCollection<TextRange>;

    constructor(lines: TextRangeCollection<TextRange>, diagnostics?: Diagnostic[]) {
        super(diagnostics);
        this._lines = lines;
    }

    addErrorWithTextRange(message: string, range: TextRange) {
        this.addError(message, convertOffsetsToRange(range.start, range.end, this._lines));
    }

    addWarningWithTextRange(message: string, range: TextRange) {
        this.addWarning(message, convertOffsetsToRange(range.start, range.end, this._lines));
    }
}
