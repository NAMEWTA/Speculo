#!/usr/bin/env node
import { main } from "./cli-app.js";
process.exitCode = await main(process.argv.slice(2));
