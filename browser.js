window.onload = () => {
  let input = document.getElementById('input');
  let log = document.getElementById('log');
  let enter = document.getElementById('enter');

  let userInput = document.getElementById('userInput');
  let enterInput = document.getElementById('enterInput');

  let repl = document.getElementById('repl');

  window.webShell = null;

  enterInput.onclick = () => {
    if (window.webShell) {
      window.webShell.setUserInput(userInput.value);
      userInput.value = '';
    }
  };

  enter.onclick = () => {
    if (window.webShell) {
      window.webShell.stop();
    }

    log.value = '';
    window.webShell = new WebShellWorker(str => log.value = log.value + str);
    window.webShell.run(input.value);
  };

  repl.onclick = () => {
    if (window.webShell) {
      window.webShell.stop();
    }

    log.value = '';
    window.webShell = new WebShellWorker(str => log.value = log.value + str);
    window.webShell.repl();
  };
};
