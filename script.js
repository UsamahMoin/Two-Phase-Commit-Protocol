const scenarioSelect = document.getElementById('scenarioSelect');
const scenarioButton = document.getElementById('scenarioButton');
const scenarioButtonText = document.getElementById('scenarioButtonText');
const scenarioMenu = document.getElementById('scenarioMenu');
const scenarioOptions = Array.from(document.querySelectorAll('[data-scenario]'));
const speedInput = document.getElementById('speed');
const speedLabel = document.getElementById('speedLabel');
const playBtn = document.getElementById('playBtn');
const stepBtn = document.getElementById('stepBtn');
const resetBtn = document.getElementById('resetBtn');
const stateTitle = document.getElementById('stateTitle');
const stateDescription = document.getElementById('stateDescription');
const outcomePill = document.getElementById('outcomePill');
const timeline = document.getElementById('timeline');
const messageA = document.getElementById('messageA');
const messageB = document.getElementById('messageB');
const connectionA = document.getElementById('connectionA');
const connectionB = document.getElementById('connectionB');

const actorStates = {
  coordinator: document.getElementById('coordinatorState'),
  processA: document.getElementById('processAState'),
  processB: document.getElementById('processBState')
};

const actorNodes = {
  coordinator: document.querySelector('[data-actor="coordinator"]'),
  processA: document.querySelector('[data-actor="processA"]'),
  processB: document.querySelector('[data-actor="processB"]')
};

const phaseSteps = {
  prepare: document.querySelector('[data-phase="prepare"]'),
  vote: document.querySelector('[data-phase="vote"]'),
  decision: document.querySelector('[data-phase="decision"]')
};

const SCENARIOS = {
  commit: {
    label: 'Successful commit',
    outcome: 'Committed',
    finalClass: 'is-commit',
    steps: [
      {
        title: 'Prepare request',
        description: 'Coordinator sends PREPARE to Process A and Process B.',
        phase: 'prepare',
        activeActors: ['coordinator'],
        messages: [{ lane: 'A', text: 'PREPARE' }, { lane: 'B', text: 'PREPARE' }],
        states: {
          coordinator: 'Waiting for votes.',
          processA: 'Checking local state.',
          processB: 'Checking local state.'
        },
        log: 'Coordinator -> A/B: PREPARE'
      },
      {
        title: 'Participants vote ACK',
        description: 'Both participants say they can commit.',
        phase: 'vote',
        activeActors: ['processA', 'processB'],
        messages: [{ lane: 'A', text: 'ACK', returning: true }, { lane: 'B', text: 'ACK', returning: true }],
        states: {
          coordinator: 'Two ACKs received.',
          processA: 'Prepared (ACK).',
          processB: 'Prepared (ACK).'
        },
        log: 'A/B -> Coordinator: ACK'
      },
      {
        title: 'Commit decision',
        description: 'Since every participant voted ACK, the coordinator broadcasts COMMIT.',
        phase: 'decision',
        activeActors: ['coordinator'],
        messages: [{ lane: 'A', text: 'COMMIT', tone: 'commit' }, { lane: 'B', text: 'COMMIT', tone: 'commit' }],
        states: {
          coordinator: 'Decision: COMMIT.',
          processA: 'Committed.',
          processB: 'Committed.'
        },
        log: 'Coordinator -> A/B: COMMIT'
      }
    ]
  },
  'participant-fails': {
    label: 'Participant A fails',
    outcome: 'Aborted',
    finalClass: 'is-abort',
    steps: [
      {
        title: 'Prepare request',
        description: 'Coordinator sends PREPARE to both participants.',
        phase: 'prepare',
        activeActors: ['coordinator'],
        messages: [{ lane: 'A', text: 'PREPARE' }, { lane: 'B', text: 'PREPARE' }],
        states: {
          coordinator: 'Waiting for votes.',
          processA: 'Preparing.',
          processB: 'Preparing.'
        },
        log: 'Coordinator -> A/B: PREPARE'
      },
      {
        title: 'One participant votes NO',
        description: 'Process A fails and returns NO while Process B returns ACK.',
        phase: 'vote',
        activeActors: ['processA', 'processB'],
        messages: [{ lane: 'A', text: 'NO', returning: true, tone: 'abort' }, { lane: 'B', text: 'ACK', returning: true }],
        states: {
          coordinator: 'NO vote received.',
          processA: 'Failed (NO).',
          processB: 'Prepared (ACK).'
        },
        log: 'A -> Coordinator: NO; B -> Coordinator: ACK'
      },
      {
        title: 'Abort decision',
        description: 'Coordinator broadcasts ABORT because not all participants voted ACK.',
        phase: 'decision',
        activeActors: ['coordinator'],
        messages: [{ lane: 'A', text: 'ABORT', tone: 'abort' }, { lane: 'B', text: 'ABORT', tone: 'abort' }],
        states: {
          coordinator: 'Decision: ABORT.',
          processA: 'Aborted.',
          processB: 'Rolled back.'
        },
        log: 'Coordinator -> A/B: ABORT'
      }
    ]
  },
  timeout: {
    label: 'Participant A times out',
    outcome: 'Aborted',
    finalClass: 'is-abort',
    steps: [
      {
        title: 'Prepare request',
        description: 'Coordinator sends PREPARE and starts waiting for votes.',
        phase: 'prepare',
        activeActors: ['coordinator'],
        messages: [{ lane: 'A', text: 'PREPARE' }, { lane: 'B', text: 'PREPARE' }],
        states: {
          coordinator: 'Waiting for votes.',
          processA: 'Response delayed.',
          processB: 'Preparing.'
        },
        log: 'Coordinator -> A/B: PREPARE'
      },
      {
        title: 'Timeout while voting',
        description: 'Process A does not return ACK before the coordinator gives up.',
        phase: 'vote',
        activeActors: ['processA', 'processB'],
        messages: [{ lane: 'A', text: 'TIMEOUT', returning: true, tone: 'abort' }, { lane: 'B', text: 'ACK', returning: true }],
        states: {
          coordinator: 'A timed out.',
          processA: 'Timed out.',
          processB: 'Prepared (ACK).'
        },
        log: 'A: timeout; B -> Coordinator: ACK'
      },
      {
        title: 'Abort decision',
        description: 'Coordinator sends ABORT because it did not receive every ACK.',
        phase: 'decision',
        activeActors: ['coordinator'],
        messages: [{ lane: 'A', text: 'ABORT', tone: 'abort' }, { lane: 'B', text: 'ABORT', tone: 'abort' }],
        states: {
          coordinator: 'Decision: ABORT.',
          processA: 'Aborted on return.',
          processB: 'Rolled back.'
        },
        log: 'Coordinator -> A/B: ABORT'
      }
    ]
  }
};

let selectedScenario = 'commit';
let currentStep = -1;
let playTimer = null;

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function activeScenario() {
  return SCENARIOS[selectedScenario];
}

function setScenarioMenuOpen(open, focusSelected = false) {
  scenarioMenu.hidden = !open;
  scenarioButton.setAttribute('aria-expanded', String(open));
  scenarioSelect.classList.toggle('is-open', open);

  if (open && focusSelected) {
    scenarioOptions.find(option => option.dataset.scenario === selectedScenario)?.focus();
  }
}

function chooseScenario(option) {
  selectedScenario = option.dataset.scenario;
  scenarioButtonText.textContent = option.querySelector('strong').textContent;
  scenarioOptions.forEach(candidate => {
    const selected = candidate === option;
    candidate.classList.toggle('is-selected', selected);
    candidate.setAttribute('aria-checked', String(selected));
  });
  setScenarioMenuOpen(false);
  scenarioButton.focus();
  reset();
}

function setPlaybackState(isPlaying) {
  playBtn.textContent = isPlaying ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-pressed', String(isPlaying));
}

function clearActiveClasses() {
  Object.values(actorNodes).forEach(node => {
    node.classList.remove('is-active', 'is-commit', 'is-abort');
  });
  Object.values(phaseSteps).forEach(step => step.classList.remove('is-active', 'is-complete'));
  [connectionA, connectionB].forEach(connection => {
    connection.classList.remove('is-active', 'is-commit', 'is-abort');
  });
}

function triggerMessage(message, config) {
  const route = config.lane.toLowerCase();
  const direction = config.returning ? 'direction-in' : 'direction-out';
  message.className = `network-message route-${route} ${direction}`;
  message.textContent = config.text;
  if (config.tone === 'abort') message.classList.add('is-abort');
  if (config.tone === 'commit') message.classList.add('is-commit');
  message.style.setProperty(
    '--message-duration',
    `${Math.max(420, 950 / Number(speedInput.value))}ms`
  );

  void message.offsetWidth;
  requestAnimationFrame(() => {
    message.classList.add('is-moving');
  });

  const connection = config.lane === 'A' ? connectionA : connectionB;
  connection.classList.add('is-active');
  if (config.tone === 'abort') connection.classList.add('is-abort');
  if (config.tone === 'commit') connection.classList.add('is-commit');
}

function renderTimeline() {
  const scenario = activeScenario();
  timeline.innerHTML = scenario.steps.map((step, index) => {
    const state = index === currentStep
      ? 'is-current'
      : index < currentStep
        ? 'is-complete'
        : 'is-upcoming';
    return `<li class="${state}"><span class="timeline-index">${index + 1}</span><span>${step.log}</span></li>`;
  }).join('');
}

function renderStep(index) {
  const scenario = activeScenario();
  const step = scenario.steps[index];
  currentStep = index;

  clearActiveClasses();
  stateTitle.textContent = step.title;
  stateDescription.textContent = step.description;
  outcomePill.className = 'pill';
  outcomePill.textContent = index === scenario.steps.length - 1 ? scenario.outcome : 'In progress';

  const orderedPhases = ['prepare', 'vote', 'decision'];
  const currentPhaseIndex = orderedPhases.indexOf(step.phase);
  orderedPhases.forEach((phase, phaseIndex) => {
    if (phaseIndex < currentPhaseIndex) phaseSteps[phase].classList.add('is-complete');
  });
  if (step.phase) phaseSteps[step.phase].classList.add('is-active');
  step.activeActors.forEach(actor => actorNodes[actor].classList.add('is-active'));

  Object.entries(step.states).forEach(([actor, state]) => {
    actorStates[actor].textContent = state;
  });

  if (index === scenario.steps.length - 1) {
    Object.values(actorNodes).forEach(node => node.classList.add(scenario.finalClass));
    outcomePill.classList.add(scenario.finalClass);
  }

  step.messages.forEach(config => {
    triggerMessage(config.lane === 'A' ? messageA : messageB, config);
  });

  renderTimeline();
}

function nextStep() {
  const scenario = activeScenario();
  const next = currentStep + 1;
  if (next >= scenario.steps.length) {
    stopPlayback();
    return;
  }
  renderStep(next);
}

function stopPlayback() {
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
  setPlaybackState(false);
}

function play() {
  if (playTimer) {
    stopPlayback();
    return;
  }

  if (currentStep >= activeScenario().steps.length - 1) {
    reset();
  }

  setPlaybackState(true);
  nextStep();
  const interval = Math.max(600, 1800 / Number(speedInput.value));
  playTimer = setInterval(nextStep, interval);
}

function reset() {
  stopPlayback();
  currentStep = -1;
  clearActiveClasses();
  stateTitle.textContent = 'Ready to start';
  stateDescription.textContent = 'The coordinator has not sent PREPARE yet. Participants are idle.';
  outcomePill.textContent = 'Idle';
  actorStates.coordinator.textContent = 'Waiting for a transaction.';
  actorStates.processA.textContent = 'Port 1233';
  actorStates.processB.textContent = 'Port 1234';
  outcomePill.className = 'pill';
  messageA.className = 'network-message route-a';
  messageB.className = 'network-message route-b';
  renderTimeline();
}

scenarioButton.addEventListener('click', () => {
  setScenarioMenuOpen(scenarioMenu.hidden);
});

scenarioButton.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    setScenarioMenuOpen(true, true);
  }
});

scenarioOptions.forEach((option, index) => {
  option.addEventListener('click', () => chooseScenario(option));
  option.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseScenario(option);
      return;
    }

    if (event.key === 'Escape') {
      setScenarioMenuOpen(false);
      scenarioButton.focus();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      scenarioOptions[modulo(index + direction, scenarioOptions.length)].focus();
    }
  });
});

document.addEventListener('click', event => {
  if (!scenarioSelect.contains(event.target)) {
    setScenarioMenuOpen(false);
  }
});

speedInput.addEventListener('input', () => {
  speedLabel.textContent = `${Number(speedInput.value).toFixed(1)}x`;
  if (playTimer) {
    stopPlayback();
    play();
  }
});

playBtn.addEventListener('click', play);
stepBtn.addEventListener('click', nextStep);
resetBtn.addEventListener('click', reset);

reset();
