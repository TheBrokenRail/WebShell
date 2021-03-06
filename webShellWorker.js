importScripts('webShell.js');

let webShell = new WebShell(true, str => postMessage(str), () => close(), {});

onmessage = e => {
  let type = e.data[0];
  let data = e.data[1];

  if (type === 'run') {
    webShell.run(data);
  } else if (type === 'setUserInput') {
    webShell.setUserInput(data);
  } else if (type === 'repl') {
    webShell.repl(true);
  }
};
