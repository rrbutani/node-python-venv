'use strict';

// Constants:
const PYTHON_CUSTOM = 2;
const PYTHON3       = 1;
const PYTHON_DEF    = 0;

var pythonExecutable = {};
pythonExecutable[PYTHON3]    = "python3";
pythonExecutable[PYTHON_DEF] = "python";

var pipExecutable = {};
pipExecutable[PYTHON3]    = "pip3";
pipExecutable[PYTHON_DEF] = "pip";

// Dependencies:
const path  = require('path');
const spawn = require('child_process').spawnSync;
const fs    = require('fs');

// Global Variables & Settings:
var PYTHON_VER = PYTHON_CUSTOM; //Try to find custom version first
var venvVers, venvFlags, pyFallback;

// Other Objects:
var packagePath = require.resolve(path.join(process.cwd(), "package.json"));
var packageObj  = require(packagePath);


function loadPackageLevelSettings(pyVenvConfig)
{
	pythonExecutable[PYTHON_CUSTOM] = pyVenvConfig.pythonExecName;
	pipExecutable[PYTHON_CUSTOM]    = pyVenvConfig.pipExecName;

	venvVers   = pyVenvConfig.venvVersion;
	venvFlags  = pyVenvConfig.venvFlags;
	pyFallback = pyVenvConfig.pythonExecFallback;

	// Skip custom python executable option if empty or not specified
	if(pythonExecutable[PYTHON_VER] === undefined)
		PYTHON_VER--;
	else if(pipExecutable[PYTHON_VER] === undefined)
	{
		// If custom python executable is specified, but custom pip isn't,
		// use default pip executable w/custom python executable
		pipExecutable[PYTHON_VER] = pipExecutable[PYTHON_DEF];
	}
}

function findPythonVersion()
{
	// Cycle through Python+Pip versions
	for (; PYTHON_VER >= PYTHON_DEF; PYTHON_VER--)
	{
		// If current python/pip executables exist, return.
		if(assertExecutableExistence(pythonExecutable[PYTHON_VER]) === 0
		   && assertExecutableExistence(pipExecutable[PYTHON_VER]) === 0)
		{
			console.info('Success! Using ' + pythonExecutable[PYTHON_VER] +
				' for python and ' + pipExecutable[PYTHON_VER] + ' for pip.');
			return;
		}

		// If options are set to not allow falling back to other python
		// versions, quit now.
		if(!pyFallback)
		{
			console.error('Preferred version of python/pip not found;' +
				' fallback disabled!');
			break;
		}

		console.warn('Falling back..');
	}

	throw new Error('No suitable Python/Pip version found.');
}

function assertExecutableExistence(execName)
{
	console.log('Testing for presence of ' + execName);
	var task = spawn(execName, ['--version']);
	return task.status;
}

function installVenv()
{
	// Set virtualenv to install
	var venvPackage = 'virtualenv';
	// If venv version is specified, add to venvPackage
	if(venvVers !== undefined)
		venvPackage += '==' + venvVers;

	// Try to install
	var task = spawn(pipExecutable[PYTHON_VER], ['install', venvPackage]);
	// Check for errors
	if(task.status === 0)
		console.info('VirtualEnv successfully installed!');
	else
	{
		console.error('VirtualEnv failed to install.');

		if(task.status === 2)
			console.error('Are you root?');
		if(task.status === 1 && venvVers !== undefined)
			console.error("Specified VirtualEnv doesn't exist!!");

		throw new Error('VirtualEnv failed to install.');
	}
}

function saveConfiguration(packageObject)
{
	// File path for config file
	let configFile = path.join(process.cwd(), '.python_venv_config.json');

	// Update values that (may have) changed
	packageObject.pythonExecName = pythonExecutable[PYTHON_VER];
	packageObject.pipExecName    = pipExecutable[PYTHON_VER];

	// File permissions magic: (in case we're root)
	// https://github.com/nodejs/node-v0.x-archive/issues/25756
	process.umask(0);

	// Write out to python_venv_settings.json
	let dump = JSON.stringify(packageObject, null, 4);
	fs.writeFileSync(configFile, dump, { mode: parseInt('0777', 8) });

	console.info('Config file written to disk, accessible at ' + configFile);
}

loadPackageLevelSettings(packageObj['python-venv']);

findPythonVersion();

installVenv();

saveConfiguration(packageObj['python-venv']);

console.info('Python VirtualEnv setup completed successfully! :D')