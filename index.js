window.onload = () => {
  let input = document.getElementById('input');
  let log = document.getElementById('log');
  let enter = document.getElementById('enter');

  const print = str => {
    if (!customPrint) {
      log.value = log.value + str;
    } else {
      customPrint(str);
    }
  };
  let customPrint = null;
  const err = str => {
    print(str.toString());
    throw str;
  };
  const parse = () => {
    let original = input.value.split('\n');
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
    for (let i = 0; i < script.length; i++) {
      if (quote) {
        if (script[i] === '"' && (i < 1 || script[i - 1] !== '\\')) {
          quote = false;
        }
        command[commandIndex] = command[commandIndex] + script[i];
      } else if (script[i] === '\n' || script[i] === ';') {
        commands.push(command);
        command = [""];
        commandIndex = 0;
        if (quote) {
          err('Newline Before Quote End!');
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
    return commands;
  };
  const getString = str => {
    if (str.startsWith('"')) {
      return JSON.parse(str);
    }
    return str;
  };
  const run = (env, command) => {
    if (command[0] === 'if') {
      let condition = command[2];
      let var1 = command[1];
      let var2 = command[3];
      let pass = false;
      if (condition === '<') {
        pass = env[var1] && env[var2] && Number(env[var1]) < Number(env[var2]);
      } else if (condition === '>') {
        pass = env[var1] && env[var2] && Number(env[var1]) > Number(env[var2]);
      } else if (condition === '=') {
        pass = env[var1] && env[var2] && getString(env[var1]) === getString(env[var2]);
      } else if (condition === '!=') {
        pass = env[var1] && env[var2] && getString(env[var1]) !== getString(env[var2]);
      }
      if (pass) {
        if (command.length < 5) {
          err('If Missing Condition or Command');
        } else {
          run(env, command.slice(4));
        }
      }
    } else if (command[0] === 'echo') {
      for (let i = 1; i < command.length; i++) {
        print(getString(command[i]));
      }
      print('\n');
    } else if (command[0] === 'set') {
      if (new RegExp('^[a-z0-9]+$', 'i').test(command[1])) {
        env[command[1]] = getString(command[2]);
      } else {
        err("Varaible Names Can Only Contain Letters and Numbers");
      }
    } else if (command[0] === 'setsh') {
      if (new RegExp('^[a-z0-9]+$', 'i').test(command[1])) {
        customPrint = str => {
          if (!env[command[1]]) {
            env[command[1]] = '';
          }
          env[command[1]] = env[command[1]] + str.replace(new RegExp('\n', 'g'), '');
        };
        run(env, command.slice(2));
        customPrint = null;
      } else {
        err("Varaible Names Can Only Contain Letters and Numbers");
      }
    } else {
      err('Unknown Command: ' + command[0]);
    }
    return env;
  }
  const inputEnv = (env, command) => {
    let newCommand = [];
    for (let i = 0; i < command.length; i++) {
      let arr = command[i].split('');
      let vars = [];
      let atVar = 0;
      let varIndex = 0;
      for (let k = 0; k < arr.length; k++) {
        if (atVar == 0 && arr[k] === '$' && (k < 1 || arr[k - 1] !== '\\')) {
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
  };
  enter.onclick = () => {
    customPrint = null;
    log.value = '';
    let commands = parse();
    let prefix = [];
    let env = {};
    for (let i = 0; i < commands.length; i++) {
      if (commands[i][0] === 'if') {
        prefix.push(commands[i]);
      } else if (commands[i][0] === 'endif') {
        prefix.pop();
      } else {
        try {
          let flatPrefix = [];
          for (let k = 0; k < prefix.length; k++) {
            flatPrefix = flatPrefix.concat(prefix[k]);
          }
          let command = inputEnv(env, flatPrefix.concat(commands[i]));
          console.log('Running: ' + command.join(' '));
          env = run(env, command);
        } catch(e) {
          err(e);
        }
      }
    }
  };
};
