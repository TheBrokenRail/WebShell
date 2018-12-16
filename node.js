const WebShell = require('./webShell');
const webShell = new WebShell(false, str => process.stdout.write(str), () => process.exit());
const readline = require('readline');
const args = process.argv.slice(2);
const fs = require('fs');

const readLineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

readLineInterface.on('line', line => {
  webShell.setUserInput(line);
});

if (args.length > 0) {
  if (fs.existsSync(args[0])) {
    webShell.run(fs.readFileSync(args[0], 'utf8'));
  } else {
    console.log('No Such File: ' + args[0]);
    process.exit();
  }
} else {
  webShell.repl(true);
}
