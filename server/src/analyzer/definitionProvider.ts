/*
* definitionProvider.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Logic that maps a position within a Python program file into
* a "definition" of the item that is referred to at that position.
* For example, if the location is within an import name, the
* definition is the top of the resolved import file.
*/

import { DiagnosticTextPosition, DiagnosticTextRange, DocumentTextRange } from '../common/diagnostic';
import { isFile } from '../common/pathUtils';
import { convertPositionToOffset } from '../common/positionUtils';
import { ModuleNameNode } from '../parser/parseNodes';
import { ParseResults } from '../parser/parser';
import { AnalyzerNodeInfo } from './analyzerNodeInfo';
import { ParseTreeUtils } from './parseTreeUtils';

const _startOfFilePosition: DiagnosticTextPosition = { line: 0, column: 0 };
const _startOfFileRange: DiagnosticTextRange = { start: _startOfFilePosition, end: _startOfFilePosition };

export class DefinitionProvider {
    static getDefinitionForPosition(parseResults: ParseResults,
            position: DiagnosticTextPosition): DocumentTextRange | undefined {

        let offset = convertPositionToOffset(position, parseResults.lines);
        if (offset === undefined) {
            return undefined;
        }

        let node = ParseTreeUtils.findNodeByOffset(parseResults.parseTree, offset);
        if (node === undefined) {
            return undefined;
        }

        if (node instanceof ModuleNameNode) {
            // If this is an imported module name, try to map the position
            // to the resolved import path.
            let importInfo = AnalyzerNodeInfo.getImportInfo(node);
            if (!importInfo) {
                return undefined;
            }

            let pathOffset = node.nameParts.findIndex(range => {
                return offset! >= range.start && offset! < range.end;
            });

            if (pathOffset < 0) {
                return undefined;
            }

            // Handle imports that were resolved partially.
            if (pathOffset >= importInfo.resolvedPaths.length) {
                return undefined;
            }

            // If it's a directory, don't return it. The caller expects
            // the path to point to files only.
            const path = importInfo.resolvedPaths[pathOffset];
            if (!isFile(path)) {
                return undefined;
            }

            return {
                path,
                range: _startOfFileRange
            };
        }

        let declaration = AnalyzerNodeInfo.getDeclaration(node);
        if (declaration) {
            return {
                path: declaration.path,
                range: declaration.range
            };
        }

        return undefined;
    }
}
