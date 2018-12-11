window.onload = () => {
  let input = document.getElementById('input');
  let log = document.getElementById('log');
  let enter = document.getElementById('enter');

  enter.onclick = () => {
    let value = input.value.replace(new RegExp(' \\\n', 'g'), '') + '\n';
    let script = value.split('');
    let commands = [];
    let command = [""];
    let commandIndex = 0;
    let quote = false;
    for (let i = 0; i < script.length; i++) {
      if (quote) {
        if (script[i] === '"' && script[i - 1] !== '\\') {
          quote = false;
        }
        command[commandIndex] = command[commandIndex] + script[i];
      } else if (script[i] === '\n' || script[i] === ';') {
        commands.push(command);
        command = [""];
        commandIndex = 0;
        if (quote) {
          throw "Newline Before Quote End!";
        }
      } else if (script[i] !== ' ') {
        if (script[i] === '"') {
          quote = true;
        }
        command[commandIndex] = command[commandIndex] + script[i];
      } else {
        commandIndex++;
        command[commandIndex] = "";
      }
    }
    console.log(commands);
  };
};
