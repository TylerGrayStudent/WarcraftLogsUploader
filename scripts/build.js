const fs = require('fs-extra');
const path = require('path');
const replace = require('replace-in-file');
const cmd = require('node-cmd');

const publish = process.argv.includes('--publish');
let dir = process.cwd();
runBuild();

function runBuild() {
  console.log('Building app in ' + dir);
  buildApp();
}

// Run build electron-builder build
function buildApp() {
  console.log('Starting Build');
  const shouldPublish = publish ? '--publish always' : '';
  const buildScript = `electron-builder ${shouldPublish} -mwl`;
  console.log('Executing Electron Builder Command');
  cmd.get(buildScript, (err, data) => {
    if (!publish) return;

    console.log('PWD: ', data);
    if (err) {
      console.log('Error: ', err);
    }
  });
}
