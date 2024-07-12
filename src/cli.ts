#!/usr/bin/env node

import { program } from 'commander';
import { toJSON, toFig } from './extract';

program
  .description('parse figma local file')
  .argument('<file>', '.fig file to parse')
  .action((filePath, options) => {
    const jsonExpr = /\.json$/
    const figExpr = /\.fig$/
    if (jsonExpr.test(filePath)) {
      toFig(filePath);
    }
    if (figExpr.test(filePath)) {
      toJSON(filePath);
    }
  });

program.parse();
