const WEBSHELL_VERSION = '1.0';

class WebShell {
  constructor(printInput, log, onEnd, extraCommands) {
    this.line = 0;
    this.log = log;
    this.customPrint = null;
    this.userInputCallback = null;
    this.onEnd = onEnd;
    this.printInput = printInput;
    this.extraCommands = extraCommands;
  }
  setUserInput(input) {
    if (this.userInputCallback) {
      if (this.printInput) {
        this.log(input + '\n');
      }
      this.userInputCallback(input);
    }
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
        if (arr[i] === 'n') {
          arr[i] = '\n';
        }
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
    let value = trimmed.replace(new RegExp('\\\\\n', 'g'), '') + '\n';
    let script = value.split('');
    let commands = [];
    let command = [""];
    let commandIndex = 0;
    let quote = false;
    this.line = 1;
    for (let i = 0; i < script.length; i++) {
      if (script[i] === '\n' || (script[i] === ';' && !quote)) {
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
        this.err('Missing End Quote');
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
    } else if (command[0] === 'input') {
      if (new RegExp('^[a-z0-9]+$', 'i').test(command[1])) {
        return [env, command[1]];
      } else {
        this.err("Varaible Names Can Only Contain Letters and Numbers");
      }
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
        let data = this.runCommand(env, command.slice(2));
        data[0] = Object.assign(data[0], env);
        this.customPrint = null;
        return data;
      } else {
        this.err("Varaible Names Can Only Contain Letters and Numbers");
      }
    } else if (command[0] === 'exit') {
      if (this.onEnd) {
        this.onEnd();
      } else {
        this.err('Exit Code Not Implemented');
      }
    } else if (command[0] === 'goto') {
      let line = parseInt(command[1]);
      if (!isNaN(line) && (line - 2) >= -1) {
        this.line = line - 2;
      } else {
        this.err('Not a Number');
      }
    } else if (this.extraCommands && this.extraCommands.hasOwnProperty(command[0])) {
      let out = this.extraCommands[command[0]](this, env, command.slice(1));
      if (out) {
        return out;
      }
    } else {
      this.err('Unknown Command: ' + command[0]);
    }
    return [env];
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
  runInternal(commands, prefix, env, index, repl) {
    let currentCommand = '';
    try {
      for (this.line = index; this.line < commands.length; this.line++) {
        currentCommand = '';
        if (commands[this.line][0] !== '') {
          if (commands[this.line][0] === 'if') {
            if (commands[this.line].length > 4) {
              this.err('Too Many Arguments');
            }
            prefix.push(commands[this.line]);
          } else if (commands[this.line][0] === 'endif') {
            prefix.pop();
          } else {
            let flatPrefix = [];
            for (let k = 0; k < prefix.length; k++) {
              flatPrefix = flatPrefix.concat(prefix[k]);
            }
            let command = this.inputEnv(env, this.getStrings(flatPrefix.concat(commands[this.line])));
            currentCommand = command[0] + ': ';
            let data = this.runCommand(env, command);
            env = data[0];
            if (data[1]) {
              this.userInputCallback = input => {
                this.userInputCallback = null;
                env[data[1]] = input;
                if (repl) {
                  this.repl(false, prefix, env);
                } else {
                  this.runInternal(commands, prefix, env, this.line + 1, false);
                }
              };
              return;
            }
          }
        }
      }
    } catch (e) {
      this.log('Command ' + (this.line + 1) + ': ' + currentCommand + e.toString().trim() + '\n');
    }
    if (repl) {
      this.repl(false, prefix, env);
    } else if (this.onEnd) {
      this.onEnd();
    }
  }
  run(input) {
    let commands = null;
    let prefix = [];
    let env = {};
    try {
      this.customPrint = null;
      commands = this.parse(input);
    } catch (e) {
      this.log('Line ' + this.line + ': ' + e.toString().trim() + '\n');
      return;
    }
    this.runInternal(commands, prefix, env, 0, false);
  }
  repl(showVersion, prefix, env) {
    if (showVersion) {
      this.log('WebShell v' + WEBSHELL_VERSION + ' REPL\n');
    }
    if (!env) {
      env = {};
    }
    if (!prefix) {
      prefix = [];
    }
    this.log('>>> ');
    this.userInputCallback = input => {
      this.userInputCallback = null;
      this.customPrint = null;
      let commands = null;
      try {
        commands = this.parse(input);
      } catch (e) {
        this.log(this.line + ': ' + e.toString().trim() + '\n');
        commands = [];
      }
      this.runInternal(commands, prefix, env, 0, true);
    };
  }
}

if (typeof module === 'object') {
  module.exports = WebShell;
}
