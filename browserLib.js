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
  repl() {
    this.worker.postMessage(['repl']);
  }
  stop() {
    this.worker.terminate();
  }
}
