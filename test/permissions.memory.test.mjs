import { test } from 'node:test';
import { registerPermissionCases } from './permission-cases.mjs';
import { createMemoryContext } from './permission-fixtures.mjs';

registerPermissionCases(test, createMemoryContext);
