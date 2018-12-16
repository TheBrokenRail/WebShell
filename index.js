class WebShellWorker {
  constructor(log) {
    this.worker = new Worker('webShellWorker.js');
    this.worker.onmessage = e => {
      log(e.data);
    };
  }
  run(data) {
    this.worker.postMessage(['run', data]);
  }
  setUserInput(data) {
    this.worker.postMessage(['setUserInput', data]);
  }
}

window.onload = () => {
  let input = document.getElementById('input');
  let log = document.getElementById('log');
  let enter = document.getElementById('enter');

  let userInput = document.getElementById('userInput');
  let enterInput = document.getElementById('enterInput');
  window.webShell = null;

  enterInput.onclick = () => {
    if (window.webShell) {
      window.webShell.setUserInput(userInput.value);
      userInput.value = '';
    }
  };

  enter.onclick = () => {
    log.value = '';
    window.webShell = new WebShellWorker(str => log.value = log.value + str);
    window.webShell.run(input.value);
  };
};
