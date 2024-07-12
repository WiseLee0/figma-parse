#!/usr/bin/env node

import { program } from 'commander';
import { toJSON, toFig } from './extract';
import path from 'path'
program
  .description('parse figma local file')
  .argument('<file>', '.fig file to parse')
  .action((filePath, options) => {
    const jsonExpr = /\.json$/
    const figExpr = /\.fig$/
    if (jsonExpr.test(filePath)) {
      toFig(path.resolve(filePath));
    }
    if (figExpr.test(filePath)) {
      toJSON(path.resolve(filePath));
    }
  });

program.parse();
