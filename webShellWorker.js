importScripts('webShell.js');

let webShell = new WebShell(str => postMessage(str), () => close());

onmessage = e => {
  let type = e.data[0];
  let data = e.data[1];

  if (type === 'run') {
    webShell.run(data);
  } else if (type === 'setUserInput') {
    webShell.setUserInput(data);
  }
};
