#!/usr/bin/env node
import { registerHttpCommands } from './commands/register-http-commands.ts';
import { cac } from 'cac';
import { getVersion } from './get-version.ts';

const cli = cac('bxn').version(getVersion()).help();

registerHttpCommands(cli);

cli.parse();
