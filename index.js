class WebShell {
  constructor(log) {
    this.line = 0;
    this.log = log;
    this.customPrint = null;
  }
  print(str) {
    if (this.customPrint) {
      this.customPrint(str);
    } else {
      this.log(str);
    }
  }
  err(str) {
    throw new Error(str.toString());
  }
  isEscaped(arr, k) {
    let escaped = false;
    for (let i = 0; i < arr.length; i++) {
      if (i === k) {
        return escaped;
      } else if (escaped) {
        escaped = false;
      } else if (arr[i] === '\\') {
        escaped = true;
      }
    }
  }
  unEscape(arr) {
    let escaped = false;
    let newArr = [];
    for (let i = 0; i < arr.length; i++) {
      if (escaped) {
        escaped = false;
      } else if (arr[i] === '\\') {
        escaped = true;
      }
      if (!escaped) {
        newArr.push(arr[i]);
      }
    }
    return newArr;
  }
  parse(input) {
    let original = input.split('\n');
    for (let i = 0; i < original.length; i++) {
      original[i] = original[i].trim();
    }
    let trimmed = original.join('\n');
    let value = trimmed.replace(new RegExp(' \\\n', 'g'), '') + '\n';
    let script = value.split('');
    let commands = [];
    let command = [""];
    let commandIndex = 0;
    let quote = false;
    this.line = 1;
    for (let i = 0; i < script.length; i++) {
      if (script[i] === '\n' || script[i] === ';') {
        if (quote) {
          this.err('Missing End Quote');
        }
        this.line++;
        commands.push(command);
        command = [""];
        commandIndex = 0;
      } else if (quote) {
        if (script[i] === '"' && !this.isEscaped(script, i)) {
          quote = false;
        }
        command[commandIndex] = command[commandIndex] + script[i];
      } else if (script[i] !== ' ') {
        if (script[i] === '"' && !this.isEscaped(script, i)) {
          quote = true;
        }
        command[commandIndex] = command[commandIndex] + script[i];
      } else {
        commandIndex++;
        command[commandIndex] = "";
      }
    }
    return commands;
  }
  getString(str) {
    if (str.startsWith('"')) {
      if (!str.endsWith('"')) {
        err('Missing End Quote');
      }
      str = str.slice(1, -1);
    }
    return this.unEscape(str.split('')).join('');
  }
  getStrings(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = this.getString(arr[i]);
    }
    return arr;
  }
  runCommand(env, command) {
    if (command[0] === 'if') {
      let condition = command[2];
      let var1 = command[1];
      let var2 = command[3];
      let pass = false;
      if (command.length < 5) {
        this.err('If Missing Condition or Command');
      }
      if (condition === '<') {
        pass = env[var1] && env[var2] && Number(env[var1]) < Number(env[var2]);
      } else if (condition === '>') {
        pass = env[var1] && env[var2] && Number(env[var1]) > Number(env[var2]);
      } else if (condition === '=') {
        pass = env[var1] && env[var2] && env[var1] === env[var2];
      } else if (condition === '!=') {
        pass = env[var1] && env[var2] && env[var1] !== env[var2];
      }
      if (pass) {
        this.runCommand(env, command.slice(4));
      }
    } else if (command[0] === 'echo') {
      this.print(command.slice(1).join(' ') + '\n');
    } else if (command[0] === 'set') {
      if (new RegExp('^[a-z0-9]+$', 'i').test(command[1])) {
        env[command[1]] = command[2];
      } else {
        this.err("Varaible Names Can Only Contain Letters and Numbers");
      }
    } else if (command[0] === 'setsh') {
      if (new RegExp('^[a-z0-9]+$', 'i').test(command[1])) {
        this.customPrint = str => {
          if (!env[command[1]]) {
            env[command[1]] = '';
          }
          env[command[1]] = env[command[1]] + str.replace(new RegExp('\n', 'g'), '');
        };
        this.runCommand(env, command.slice(2));
        this.customPrint = null;
      } else {
        this.err("Varaible Names Can Only Contain Letters and Numbers");
      }
    } else {
      this.err('Unknown Command: ' + command[0]);
    }
    return env;
  }
  inputEnv(env, command) {
    let newCommand = [];
    for (let i = 0; i < command.length; i++) {
      let arr = command[i].split('');
      let vars = [];
      let atVar = 0;
      let varIndex = 0;
      for (let k = 0; k < arr.length; k++) {
        if (atVar == 0 && arr[k] === '$' && !this.isEscaped(arr, k)) {
          if (!vars[varIndex]) {
            vars[varIndex] = '';
          }
          if (k > 0) {
            vars[varIndex] = vars[varIndex] + arr[k - 1];
          }
          vars[varIndex] = vars[varIndex] + arr[k];
          atVar = 1;
        } else if (atVar !== 0 && arr[k] === '}') {
          vars[varIndex] = vars[varIndex] + arr[k];
          if (k < (arr.length - 1)) {
            vars[varIndex] = vars[varIndex] + arr[k + 1];
          }
          atVar = 0;
          varIndex++;
        } else if (atVar === 1 && arr[k] === '{') {
          atVar = 2;
          vars[varIndex] = vars[varIndex] + arr[k];
        } else if (atVar === 2) {
          vars[varIndex] = vars[varIndex] + arr[k];
        }
      }
      let section = command[i];
      for (let k = 0; k < vars.length; k++) {
        let varName = vars[k].split('{')[1].split('}')[0];
        if (!env[varName]) {
          env[varName] = '';
        }
        section = section.replace(vars[k], vars[k].split('{')[0].slice(0, -1) + env[varName] + (vars[k].split('}')[1] ? vars[k].split('}')[1] : ''));
      }
      newCommand.push(section);
    }
    return newCommand;
  }
  run(input) {
    try {
      this.customPrint = null;
      let commands = this.parse(input);
      let prefix = [];
      let env = {};
      for (let i = 0; i < commands.length; i++) {
        if (commands[i][0] === 'if') {
          prefix.push(commands[i]);
        } else if (commands[i][0] === 'endif') {
          prefix.pop();
        } else {
          let flatPrefix = [];
          for (let k = 0; k < prefix.length; k++) {
            flatPrefix = flatPrefix.concat(prefix[k]);
          }
          this.line = i + 1;
          let command = this.getStrings(this.inputEnv(env, flatPrefix.concat(commands[i])));
          console.log('Running: ' + command.join(' '));
          env = this.runCommand(env, command);
        }
      }
    } catch (e) {
      this.log(this.line + ': ' + e.toString().trim() + '\n');
    }
  }
}

window.onload = () => {
  let input = document.getElementById('input');
  let log = document.getElementById('log');
  let enter = document.getElementById('enter');

  enter.onclick = () => {
    log.value = '';
    let webShell = new WebShell(str => log.value = log.value + str);
    webShell.run(input.value);
  };
};
