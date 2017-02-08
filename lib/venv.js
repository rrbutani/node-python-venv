'use strict';

// Dependencies:
const path  = require('path');
const spawn = require('child_process').spawnSync;
const fs    = require('fs');

// Configuration:
let configPath = require.resolve(path.join(process.cwd(), ".python_venv_config.json"));
let config     = require(configPath);


