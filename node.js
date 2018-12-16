const WebShell = require('./webShell');
const fs = require('fs');
const webShell = new WebShell(false, str => process.stdout.write(str), () => process.exit(), {
  cat: (wsh, env, args) => {
    if (args.length < 1) {
      wsh.err('Not Enough Arguments');
    }
    if (fs.existsSync(args[0])) {
      wsh.print(fs.readFileSync(args[0], 'utf8').trim() + '\n');
    } else {
      wsh.err('No Such File: ' + args[0]);
    }
  }
});
const readline = require('readline');
const fileName = process.argv.slice(2)[0];

const readLineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

readLineInterface.on('line', line => {
  webShell.setUserInput(line);
});

if (fileName) {
  if (fs.existsSync(fileName)) {
    webShell.run(fs.readFileSync(fileName, 'utf8'));
  } else {
    console.log('No Such File: ' + fileName);
    process.exit();
  }
} else {
  webShell.repl(true);
}
