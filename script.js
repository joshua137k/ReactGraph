const PRESET_SYSTEMS = {
        coffee: {
          name: 'Máquina de Café',
          code: `
# Exemplo: Máquina de Café
# -----------------------------
# Estados: Insert, Coffee, Chocolate
# Eventos: 50ct, 1eur, Get_coffee, Get_choc, last50ct

init Insert
bool last50ct disabled
Insert --> Coffee : 50ct
Insert --> Chocolate : 1eur
Coffee --> Insert : Get_coffee
Chocolate --> Insert : Get_choc

1eur --! 50ct
1eur --! 1eur
50ct --! 50ct : last50ct
50ct --! 1eur
50ct ->> last50ct
    `
        },
        simple: {
          name: 'Simple',
          code: `
init s0
bool offA
s0 --> s1 : a
s1 --> s0 : b
a --! a : offA
    `
        },
        counter: {
          name: 'Counter',
          code: `
init s0
bool offAct disabled
bool on1 disabled

s0 --> s0 : act

act --! act : offAct
act ->> offAct : on1
act ->> on1
    `
        },
        tweetie: {
          name: 'Son of Tweetie',
          code: `
init Son_of_Tweetie
bool noFly

Son_of_Tweetie --> Special_Penguin : -
Special_Penguin --> Penguin : Penguim
Penguin --> Bird : Bird
Bird --> Does_Fly: Fly

Bird --! Fly : noFly
Penguim --! noFly
    `
        },
      vendingMachine: {
          name: 'Vending Machine',
          code: `
init pay
bool noSoda disabled
bool noBeer

pay --> select : insert_coin
select --> soda : ask_soda
select --> beer : ask_beer
soda --> pay : get_soda
beer --> pay : get_beer

ask_soda --! ask_soda : noSoda
ask_beer --! ask_beer : noBeer
ask_soda ->> noSoda
          `
        },

        conflict: {
          name: 'Conflict Example',
          code: `
init s0
bool on
bool off
bool c disabled

s0 --> 1: a
1 --> 2: b
2 --> 3: c

a ->> b: on
on --! b: off
    `
        },

      intrusiveProduct: {
          name: 'Intrusive Product',
          code: `
aut s {
init 0
bool d disabled
0 --> 1 : a
1 --> 2 : b
2 --> 0 : d
a --! b
}
aut w {
init 0
bool noAs disabled
bool noBs
0 --> 1 : a
1 --> 0 : c
a --! a : noAs
a ->> noAs
}
// intrusion
w.c ->> s.b
          `
        },
    dynamicSPL: {
          name: 'Dynamic SPL',
          code: `


init setup
setup --> setup : Safe
setup --> setup : Unsafe
setup --> setup : Encrypt
setup --> setup : Dencrypt
setup --> ready : -
ready --> setup : -
ready --> received : Receive
received --> routed_safe : ERoute  disabled
received --> routed_unsafe : Route
routed_safe --> sent : ESend       disabled
routed_unsafe --> sent : Send
routed_unsafe --> sent_encrypt : ESend disabled
sent_encrypt --> ready : Ready
sent --> ready : Ready

Safe ->> ERoute
Safe --! Route
Unsafe --! ERoute
Unsafe ->> Route
Encrypt --! Send
Encrypt ->> ESend
Dencrypt ->> Send
Dencrypt --! ESend
`
        },
      dependencies: {
          name: 'Dependencies',
          code: `
aut A {
init 0
0 --> 1: look
1 --> 0: restart
}

aut B {
init 0
bool goLeft disabled
bool goRight disabled
0 --> 1: on
1 --> 2: goLeft
1 --> 2: goRight
goLeft --! goRight
goRight --! goLeft


2 --> 0: off
}

// dependencies
A.look ->> B.goLeft
A.look ->> B.goRight
          `
        },
      semafaro: {
          name: 'Semáforo',
          code: `

aut traffic_light {
  init Green
  bool tick disabled
  Green  --> Yellow : tick
  Yellow --> Red    : tick
  Red    --> Green  : tick

  tick --! tick
}

aut timer {
  init Idle
  Idle --> Ticking : start
  Ticking --> Idle : timer_expired
}


timer.timer_expired ->> traffic_light.tick
          `
        },
      playground: {
          name: 'Playground',
          code: `
aut mc {
init A
A --> C : -
}
aut T{
init K
bool D disabled

K --> C : D
}
mc.- ->> T.D
          `
        },
};
      
    
class StateMachine {
  constructor(config) {
    this.exampleSelector = document.getElementById(config.exampleSelectorId);
    this.descriptionArea = document.getElementById(config.descriptionId);
    this.startBtn = document.getElementById(config.startBtnId);
    this.stateDisplay = document.getElementById(config.stateDisplayId);
    this.actionsContainer = document.getElementById(config.actionsContainerId);
    this.graphDiv = document.getElementById(config.graphDivId);
    this.traceDiv = document.getElementById(config.traceDivId);
    this.traceInput = document.getElementById(config.traceInputId);
    this.runTraceBtn = document.getElementById(config.runTraceBtnId);
    this.traceDelayInput = document.getElementById(config.traceDelayInputId);

    this.logPanel = document.getElementById(config.logPanelId);
    this.undoBtn = document.getElementById(config.undoBtnId);
    this.redoBtn = document.getElementById(config.redoBtnId);
    this.shareBtn = document.getElementById(config.shareBtnId);

    this.panZoomInstance = null;
    this.systemDef = null;

    this.history = [];
    this.historyIndex = -1;

    this.loadFromURL(); 
    this.setupSelector();
    this.initialize();
    
    this.startBtn.addEventListener('click', () => {this.traceInput.value = ''; this.initialize()});
    this.runTraceBtn.addEventListener('click', () => this.runTraceSequence());
    this.undoBtn.addEventListener('click', () => this.undo());
    this.redoBtn.addEventListener('click', () => this.redo());
    this.shareBtn.addEventListener('click', () => this.generateShareLink());
  }

  log(message, level = 'info') {
      const entry = document.createElement('div');
      entry.className = `log-entry log-${level}`;
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      this.logPanel.appendChild(entry);
      this.logPanel.scrollTop = this.logPanel.scrollHeight; 
  }

  loadFromURL() {
    if (window.location.hash.startsWith('#code=')) {
      try {
        const base64Code = window.location.hash.substring(6);
        const decodedCode = atob(base64Code);
        this.descriptionArea.value = decodedCode;
      } catch (e) {
        console.error("Falha ao decodificar o código da URL.", e);

      }
    }
  }

  generateShareLink() {
    const code = this.descriptionArea.value;
    if (!code) {
      this.log("A área de descrição está vazia. Nada para compartilhar.", "warning");
      return;
    }
    const base64Code = btoa(code);
    const url = new URL(window.location);
    url.hash = `code=${base64Code}`;
    
    navigator.clipboard.writeText(url.href).then(() => {
        this.log("Link de compartilhamento copiado para a área de transferência!", "success");
    }).catch(err => {
        this.log("Falha ao copiar o link.", "error");
        console.error(err);
    });
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.loadStateFromHistory();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.loadStateFromHistory();
    }
  }

  loadStateFromHistory() {
    const state = this.history[this.historyIndex];
    if (!state) return;
    
    this.currentStates = JSON.parse(JSON.stringify(state.currentStates));
    this.variables = JSON.parse(JSON.stringify(state.variables));
    
    this.enabledEvents = {};
    for (const autName in state.enabledEvents) {
        this.enabledEvents[autName] = new Set(state.enabledEvents[autName]);
    }
    
    this.log(`Retornou para o estado #${this.historyIndex}.`);
    this.updateUI();
  }
  
  saveStateToHistory(eventName = null) {
      if (this.historyIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.historyIndex + 1);
      }
      
      const currentState = {
          eventName,
          currentStates: JSON.parse(JSON.stringify(this.currentStates)),
          variables: JSON.parse(JSON.stringify(this.variables)),
          enabledEvents: {}
      };

      for (const autName in this.enabledEvents) {
          currentState.enabledEvents[autName] = [...this.enabledEvents[autName]];
      }

      this.history.push(currentState);
      this.historyIndex = this.history.length - 1;
  }


  async runTraceSequence() {
      this.initialize(); 
      await new Promise(resolve => setTimeout(resolve, 100));

      const traceString = this.traceInput.value;
      if (!traceString) return;

      const delay = parseInt(this.traceDelayInput.value, 10) || 1000;

      const eventsToRun = traceString.split(',').map(e => e.trim()).filter(Boolean);
      this.runTraceBtn.disabled = true;
      this.startBtn.disabled = true;

      for (const eventString of eventsToRun) {
          const parts = eventString.split('.');
          let autName, eventName;

          if (parts.length === 2) {
              [autName, eventName] = parts;
          } else if (Object.keys(this.systemDef.automata).length === 1) {
              autName = Object.keys(this.systemDef.automata)[0];
              eventName = eventString;
          } else {
              this.log(`Erro: O evento '${eventString}' precisa estar no formato 'automato.evento'.`, 'error');
              break;
          }
          
          const autDef = this.systemDef.automata[autName];
          const currentState = this.currentStates[autName];
          const possibleTransitions = autDef?.transitions[currentState] || {};

          if (!autDef) {
              this.log(`Erro: Autômato '${autName}' não encontrado.`, 'error');
              break;
          }
          if (!possibleTransitions[eventName]) {
              this.log(`Erro: O evento '${eventName}' não é válido do estado '${currentState}' no autômato '${autName}'.`, 'error');
              break;
          }
          const isVariable = autDef.variables.hasOwnProperty(eventName);
          const isEnabled = isVariable ? this.variables[autName][eventName] : this.enabledEvents[autName].has(eventName);

          if (!isEnabled) {
              this.log(`Erro: O evento '${eventName}' está desabilitado no autômato '${autName}'.`, 'error');
              break;
          }

          this.processEvent(autName, eventName);
          await new Promise(resolve => setTimeout(resolve, delay)); 
      }

      this.runTraceBtn.disabled = false;
      this.startBtn.disabled = false;
    }

  setupSelector() {
    for (const key in PRESET_SYSTEMS) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = PRESET_SYSTEMS[key].name;
      this.exampleSelector.appendChild(option);
    }
    
    if (!this.descriptionArea.value) {
        const initialKey = Object.keys(PRESET_SYSTEMS)[0];
        this.descriptionArea.value = PRESET_SYSTEMS[initialKey].code.trim();
    }
    
    this.exampleSelector.addEventListener('change', (e) => {
      const selectedKey = e.target.value;
      window.location.hash = ''; 
      this.descriptionArea.value = PRESET_SYSTEMS[selectedKey].code.trim();
      this.initialize();
    });
  }

  initialize() {
    this.logPanel.innerHTML = ''; 
    this.log('--- Inicializando Sistema ---');
    
    try {
      this.systemDef = this.parseDescription(this.descriptionArea.value);
      this.currentStates = {};
      this.variables = {};
      this.enabledEvents = {};

      for (const autName in this.systemDef.automata) {
        const autDef = this.systemDef.automata[autName];
        if (!autDef.initialState) {
          throw new Error(`Autômato '${autName}' não possui estado 'init'.`);
        }
        this.currentStates[autName] = autDef.initialState;
        this.variables[autName] = {};
        for (const varName in autDef.variables) {
          this.variables[autName][varName] = autDef.variables[varName].initial;
        }
        
        this.enabledEvents[autName] = new Set(autDef.events);
        
        for (const varName in autDef.variables) {
          if (autDef.variables[varName].initial === false) {
            this.enabledEvents[autName].delete(varName);
          }
        }

        autDef.initiallyDisabledEvents.forEach(eventToDisable => {
            this.enabledEvents[autName].delete(eventToDisable);
        });
      }
      
      this.log('Sistema inicializado com sucesso.', 'success');
      
      this.history = [];
      this.historyIndex = -1;
      this.saveStateToHistory('INÍCIO');
      
      this.updateUI();
    } catch (err) {
      this.log(err.message, 'error');
      console.error(err);
    }
  }


  parseDescription(text) {
    const system = { automata: {}, intrusions: [] };


    if (!text.trim()) {
        throw new Error("A descrição da máquina está vazia.");
    }

    if (!/^\s*aut\s+[\w-]+\s*\{/m.test(text)) {
        text = `aut mc {\n${text}\n}`;
    }


    const lines = text.split(/\r?\n/);

    

    let currentAut = null;
    const autBlockRegex = /^\s*aut\s+([\w-]+)\s*\{/;
    const endBlockRegex = /^\s*}/;
    const intrusionRegex = /^\s*([\w-]+)\.([\w-]+)\s*(--!|->>)\s*([\w-]+)\.([\w-]+)\s*$/;
    const internalRuleRegex = {
      init: /^\s*init\s+([\w-]+)/,
      bool: /^\s*bool\s+([\w-]+)\s*(disabled|enabled)?/,
      transition: /^\s*([\w-]+)\s*-->\s*([\w-]+)\s*:\s*([\w-]+)\s*(disabled)?/, 
      rule: /^\s*([\w-]+)\s*(--!|->>)\s*([\w-]+)\s*(?::\s*([\w-]+))?/,
    };

    lines.forEach(raw => {
      const line = raw.split('#')[0].trim();
      if (!line) return;

      let m;
      if ((m = line.match(autBlockRegex))) {
        currentAut = m[1];
        system.automata[currentAut] = { name: currentAut, initialState: null, states: new Set(), events: new Set(), variables: {}, transitions: {}, rules: {},initiallyDisabledEvents: new Set() };
      } else if (endBlockRegex.test(line)) {
        currentAut = null;
      } else if (currentAut) {
        const def = system.automata[currentAut];
        if ((m = line.match(internalRuleRegex.init))) {
          def.initialState = m[1]; def.states.add(m[1]);
        } else if ((m = line.match(internalRuleRegex.bool))) {
          def.variables[m[1]] = { initial: m[2] !== 'disabled' }; def.events.add(m[1]);
        } 
        else if ((m = line.match(internalRuleRegex.transition))) {
          const [_, from, to, event, isDisabled] = m; 
          def.states.add(from); def.states.add(to); def.events.add(event);
          if (!def.transitions[from]) def.transitions[from] = {};
          def.transitions[from][event] = to;

          if (isDisabled) { 
            def.initiallyDisabledEvents.add(event); 
          }
        }
         else if ((m = line.match(internalRuleRegex.rule))) {
          const [_, event, type, target, condition] = m;
          def.events.add(event); def.events.add(target);
          if (condition) def.events.add(condition);
          if (!def.rules[event]) def.rules[event] = [];
          def.rules[event].push({ type: type === '->>' ? 'enable' : 'disable', target, condition: condition || null });
        }
      } else if ((m = line.match(intrusionRegex))) {
        const [_, sourceAut, sourceEvent, type, targetAut, targetEvent] = m;
        system.intrusions.push({ sourceAut, sourceEvent, type: type === '->>' ? 'enable' : 'disable', targetAut, targetEvent });
      }
    });
    
    // Post-process to link variable types in rules
    for(const autName in system.automata) {
        const def = system.automata[autName];
        Object.values(def.rules).flat().forEach(rule => {
            if (def.variables[rule.target]) rule.type = rule.type === 'enable' ? 'set_true' : 'set_false';
        });
    }
    return system;
  }


  processEvent(autName, eventName) {
    const autDef = this.systemDef.automata[autName];
    const isVariable = autDef.variables.hasOwnProperty(eventName);
    const canProcess = isVariable ? this.variables[autName][eventName] : this.enabledEvents[autName].has(eventName);

    if (!canProcess) {
        this.log(`Evento ${autName}.${eventName} não pode ser processado (desabilitado).`, 'warning');
        return;
    }

    this.log(`--- Processando Evento: ${autName}.${eventName} ---`);
    let fromState = this.currentStates[autName];
    
    const toEnable = new Set();
    const toDisable = new Set();
    const firedRules = [];

    if (eventName in this.variables[autName]) {
      this.variables[autName][eventName] = true;
    }
    

    const internalRules = autDef.rules[eventName] || [];

    const variablesBool = Object.entries(this.variables[autName])
    const internalRulesBool = variablesBool
    .filter(([i, _]) => autDef.rules[i] != null)
    .map(([i, _])    => autDef.rules[i])
    .flat();

    const combinedRules = internalRules.concat(internalRulesBool);


    combinedRules.forEach(rule => {
        const conditionMet = !rule.condition || this.variables[autName][rule.condition];
        if (conditionMet) {
            this.log(`  Queueing internal rule: ${eventName} ${rule.type} ${rule.target}`);
            if (rule.type === 'set_true' || rule.type === 'enable') {
                toEnable.add(rule.target);
            } else if (rule.type === 'set_false' || rule.type === 'disable') {
                toDisable.add(rule.target);
            }
            firedRules.push({ source: eventName, ...rule });
        }
    });

    this.systemDef.intrusions.forEach(intrusion => {
    if (intrusion.sourceAut === autName && intrusion.sourceEvent === eventName) {
        console.log(`  Applying intrusion: -> ${intrusion.targetAut}.${intrusion.targetEvent}`);
        
        const targetAutDef = this.systemDef.automata[intrusion.targetAut];

        if (targetAutDef && targetAutDef.variables.hasOwnProperty(intrusion.targetEvent)) {
            if (intrusion.type === 'enable') {
                console.log(`    Setting variable ${intrusion.targetAut}.${intrusion.targetEvent} to true`);
                this.variables[intrusion.targetAut][intrusion.targetEvent] = true;
            } else { // tipo 'disable'
                console.log(`    Setting variable ${intrusion.targetAut}.${intrusion.targetEvent} to false`);
                this.variables[intrusion.targetAut][intrusion.targetEvent] = false;
            }
        } else {
            const targetSet = this.enabledEvents[intrusion.targetAut];
            if (targetSet) {
                if (intrusion.type === 'enable') {
                    targetSet.add(intrusion.targetEvent);
                } else {
                    targetSet.delete(intrusion.targetEvent);
                }
            }
        }
    }
    });

    const conflicts = new Set([...toEnable].filter(item => toDisable.has(item)));
    if (conflicts.size > 0) {
        this.log(`CONFLITO! Evento '${eventName}' tenta habilitar e desabilitar: ${[...conflicts].join(', ')}`, 'error');
        conflicts.forEach(item => toEnable.delete(item));
    }

    toEnable.forEach(target => {
        if (this.systemDef.automata[autName].variables[target]) {
            this.variables[autName][target] = true; 
        } else {
            this.enabledEvents[autName].add(target); 
        }
    });

    toDisable.forEach(target => {
        if (this.systemDef.automata[autName].variables[target]) {
            this.variables[autName][target] = false;
        } else {
            this.enabledEvents[autName].delete(target); 
        }
    });
    
    const transitions = autDef.transitions[this.currentStates[autName]] || {};
    let toState = this.currentStates[autName]; 
    if (transitions[eventName]) {
      toState = transitions[eventName];
      this.currentStates[autName] = toState;

      const transitions2 = autDef.transitions[this.currentStates[autName]] || {};

      Object.keys(transitions2).forEach(Tk => {
        const A = variablesBool.some(([key, value]) =>  key === Tk);
        if (A && !this.enabledEvents[autName].has(Tk)) {
          this.enabledEvents[autName].add(Tk);
        }
      });
      

    }

    this.saveStateToHistory(`${autName}.${eventName}`);
    const animationInfo = { autName, fromState, toState, eventName, firedRules };
    this.updateUI(animationInfo);
  }
  
  splitQualifiedName(name, defaultAut) {
      if (name.includes('.')) {
          const parts = name.split('.');
          return { aut: parts[0], target: parts[1] };
      }
      return { aut: defaultAut, target: name };
  }


  updateUI(animationInfo = null) {
    this._renderStateDisplay();
    this._renderActions();
    this._renderGraph(animationInfo);
    this._renderTrace();

    this.undoBtn.disabled = this.historyIndex <= 0;
    this.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  _renderStateDisplay() {
      const states = Object.entries(this.currentStates)
        .map(([aut, state]) => `<strong>${aut}</strong>: ${state}`)
        .join(' | ');
      this.stateDisplay.innerHTML = `Estado Atual: ${states || '(Aguardando Início)'}`;
  }

  _renderTrace() {
    const traceEvents = this.history.slice(1).map(s => s.eventName).filter(Boolean);
    this.traceDiv.innerHTML = traceEvents.length > 0 ? traceEvents.join(' → ') : '(Nenhum evento processado)';
  }

  _renderActions() {
    this.actionsContainer.innerHTML = '';
    if (!this.systemDef) return;

    for (const autName in this.systemDef.automata) {
      const block = document.createElement('div');
      block.className = 'actions-block';
      const title = document.createElement('h3');
      title.textContent = `Autômato: ${autName}`;
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'buttons';
      
      const transitions = this.systemDef.automata[autName].transitions[this.currentStates[autName]] || {};
      const availableActions = Object.keys(transitions);
      
      if (availableActions.length === 0) {
          buttonsDiv.textContent = "Nenhum evento a partir deste estado.";
      } else {
          availableActions.sort().forEach(evt => {
            const btn = document.createElement('button');
            btn.textContent = evt;
            const isEnabled = this.systemDef.automata[autName].variables[evt] ? this.variables[autName][evt] : this.enabledEvents[autName].has(evt);
            btn.disabled = !isEnabled;
            btn.addEventListener('click', () => this.processEvent(autName, evt));
            buttonsDiv.appendChild(btn);
          });
      }
      
      block.appendChild(title);
      block.appendChild(buttonsDiv);
      this.actionsContainer.appendChild(block);
    }
  }


  _animateTransition(svg, { autName, fromState, toState, eventName, firedRules  }) {
    const edge = svg.querySelector(`#edge_${autName}_${fromState}_${eventName}_${toState}`);
    if (edge) {
      edge.classList.add('traversed');
    }
    
    firedRules.forEach(rule => {
        const qualifiedSource = rule.source.includes('.') ? rule.source : `${rule.autName}.${rule.source}`;
        const sourceAut = this.splitQualifiedName(qualifiedSource, autName).aut;
        const sourceEvent = this.splitQualifiedName(qualifiedSource, autName).target;

        const ruleId = `rule_${sourceAut}_${sourceEvent}_${rule.target}`;
        const ruleArrow = svg.querySelector(`#${ruleId}`);
   
        if (ruleArrow) {
            ruleArrow.classList.add('triggered');
        }
    });

    setTimeout(() => {
        svg.querySelectorAll('.activated, .deactivated, .traversed, .triggered').forEach(el => {
            el.classList.remove('activated', 'deactivated', 'traversed', 'triggered');
        });
    }, 800);
}


  _makeDot() {
    if (!this.systemDef) return 'digraph {}';
    
    const theme = {
        surface: '#24283b',
        border: '#414868',
        text: '#c0caf5',
        textDark: '#1a1b26',
        success: '#9ece6a',
        disabled: '#565f89',
        textDisabled: '#9299b8',
        red: '#f7768e',
        blue: '#7aa2f7'
    };

    let dot = `digraph System {\n`
            + `  compound=true; rankdir=LR; fontname="Helvetica";\n`
            + `  bgcolor="transparent";\n` 
            + `  node [fontname="Helvetica", style=filled];\n`
            + `  edge [fontname="Helvetica"];\n`;

    for (const autName in this.systemDef.automata) {
      const def = this.systemDef.automata[autName];
      dot += `\n  subgraph cluster_${autName} { \n`
            + `    label="${autName}";\n`
            + `    fontcolor="${theme.text}";\n`
            + `    color="${theme.border}";\n`
            + `    bgcolor="#${theme.surface.substring(1)}20";\n`; 
      
      def.states.forEach(s => {
        const isCurrent = s === this.currentStates[autName];
        const fillColor = isCurrent ? theme.success : theme.surface;
        const fontColor = isCurrent ? theme.textDark : theme.text;
        const shape = isCurrent ? 'doublecircle' : 'circle';
        dot += `    "s_${autName}_${s}" [id="s_${autName}_${s}", class="node", label="${s}", shape=${shape}, fillcolor="${fillColor}", fontcolor="${fontColor}", color="${theme.border}"];\n`;
      });

      const allItems = new Set([...def.events, ...Object.keys(def.variables)]);
      allItems.forEach(item => {
        let label = item, fontColor = theme.text, fillColor = theme.surface;

        if (def.variables[item]) {
            label = `${item} = ${this.variables[autName][item]}`;
            fillColor = this.variables[autName][item] ? theme.success : theme.red;
            fontColor = theme.textDark;
        } else if (!this.enabledEvents[autName].has(item)) {
            fillColor = theme.disabled;
            fontColor = theme.textDisabled;
        }
        dot += `    "v_${autName}_${item}" [id="v_${autName}_${item}", label="${label}", shape=box, fillcolor="${fillColor}", fontcolor="${fontColor}", color="${theme.border}"];\n`;
      });
      
      Object.entries(def.transitions).forEach(([from, map]) => {
          Object.entries(map).forEach(([evt, to]) => {
              const isEnabled = def.variables[evt] ? this.variables[autName][evt] : this.enabledEvents[autName].has(evt);

              const style = isEnabled ? 'solid' : 'dashed';
              const color = isEnabled ? theme.text : theme.disabled; 

              dot += `    "s_${autName}_${from}" -> "s_${autName}_${to}" `
                  + `[label="${evt}", id="edge_${autName}_${from}_${evt}_${to}", `
                  + `fontcolor="${color}", color="${color}", style=${style}];\n`;
          });
      });

      Object.entries(def.rules).forEach(([evt, rules]) => {
        rules.forEach(rule => {
          const isEnable = rule.type === 'enable' || rule.type === 'set_true';
          const arrowhead = isEnable ? 'normal' : 'tee';
          const style = isEnable ? 'solid' : 'dashed';
          const color = isEnable ? theme.blue : theme.red;
          const ruleId = `rule_${autName}_${evt}_${rule.target}`;
          
          dot += `    "v_${autName}_${evt}" -> "v_${autName}_${rule.target}" `
              + `[arrowhead=${arrowhead}, style=${style}, color="${color}", id="${ruleId}", class="rule-arrow"`
              + `${rule.condition ? `, label=":${rule.condition}", fontcolor="${color}"` : ''}`
              + `];\n`;
        });
      });
      dot += `  }\n`;
    }
    
    this.systemDef.intrusions.forEach(rule => {
      const isEnable = rule.type === 'enable';
      const arrowhead = isEnable ? 'normal' : 'tee';
      const style = 'dashed'; 
      const color = isEnable ? theme.blue : theme.red;
      const ruleId = `rule_${rule.sourceAut}_${rule.sourceEvent}_${rule.targetEvent}`;
      dot += `  "v_${rule.sourceAut}_${rule.sourceEvent}" -> "v_${rule.targetAut}_${rule.targetEvent}" `
          + `[style=${style}, color="${color}", constraint=false, arrowhead=${arrowhead}, penwidth=2, id="${ruleId}", class="rule-arrow"];\n`;
    });

    dot += '\n}';
    return dot;
  }

  

  _renderGraph(animationInfo = null) {
    if (!this.systemDef) { this.graphDiv.innerHTML = ''; return; }
    
    if (this.panZoomInstance) {
        this.panZoomInstance.destroy();
        this.panZoomInstance = null;
    }

    this.graphDiv.style.opacity = 0;
    setTimeout(() => {
      try {
        new Viz().renderSVGElement(this._makeDot())
          .then(svg => {
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            this.graphDiv.innerHTML = ''; 
            this.graphDiv.appendChild(svg); 
            this.graphDiv.style.opacity = 1;

            if (animationInfo) {
              this._animateTransition(svg, animationInfo);
            }

            this.panZoomInstance = svgPanZoom(svg, {
              panEnabled: true,
              zoomEnabled: true,
              fit: true,    
              center: true, 
              minZoom: 0.1, 
              maxZoom: 10   
            });

          }).catch(err => {
            this.log('Erro ao renderizar o grafo.', 'error');
            this.graphDiv.textContent = 'Erro ao renderizar o grafo.';
            this.graphDiv.style.opacity = 1;
            console.error(err);
          });
      } catch (e) {
        this.log('Falha ao carregar motor de grafos (Viz.js).', 'error');
        this.graphDiv.textContent = 'Falha ao carregar motor de grafos.';
        this.graphDiv.style.opacity = 1;
        console.error(e);
      }
    }, 200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StateMachine({
    exampleSelectorId: 'Selector',
    descriptionId: 'machineDescription',
    startBtnId: 'startBtn',
    stateDisplayId: 'stateDisplay',
    actionsContainerId: 'actions',
    graphDivId: 'graph',
    traceDivId: 'trace',
    traceInputId: 'traceInput',
    runTraceBtnId: 'runTraceBtn',
    traceDelayInputId: 'traceDelayInput',
    logPanelId: 'logPanel',
    undoBtnId: 'undoBtn',
    redoBtnId: 'redoBtn',
    shareBtnId: 'shareBtn'
  });
});