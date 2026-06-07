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

const actorStates = {
  coordinator: document.getElementById('coordinatorState'),
  processA: document.getElementById('processAState'),
  processB: document.getElementById('processBState')
};

const actorCards = {
  coordinator: document.querySelector('[data-actor="coordinator"]'),
  processA: document.querySelector('[data-actor="processA"]'),
  processB: document.querySelector('[data-actor="processB"]')
};

const phaseCards = {
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
          coordinator: 'Waiting for participant votes.',
          processA: 'Received PREPARE; checking local transaction state.',
          processB: 'Received PREPARE; checking local transaction state.'
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
          coordinator: 'Received ACK from both participants.',
          processA: 'Voted ACK and entered prepared state.',
          processB: 'Voted ACK and entered prepared state.'
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
          coordinator: 'Final decision: COMMIT.',
          processA: 'Received COMMIT and made the transaction durable.',
          processB: 'Received COMMIT and made the transaction durable.'
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
          coordinator: 'Waiting for participant votes.',
          processA: 'Received PREPARE but may fail.',
          processB: 'Received PREPARE and can vote.'
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
          coordinator: 'Detected a failed vote. Commit is no longer safe.',
          processA: 'Failed before voting yes.',
          processB: 'Voted ACK and waits for the final decision.'
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
          coordinator: 'Final decision: ABORT.',
          processA: 'Rolls back or remains aborted.',
          processB: 'Receives ABORT and rolls back.'
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
          coordinator: 'Waiting for ACK responses.',
          processA: 'PREPARE response is delayed.',
          processB: 'Received PREPARE and can vote.'
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
          coordinator: 'Timeout means the coordinator cannot safely commit.',
          processA: 'Timed out before completing the vote.',
          processB: 'Voted ACK and is waiting.'
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
          coordinator: 'Final decision: ABORT.',
          processA: 'Receives ABORT if it comes back.',
          processB: 'Receives ABORT and rolls back.'
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
  Object.values(actorCards).forEach(card => {
    card.classList.remove('is-active', 'is-commit', 'is-abort');
  });
  Object.values(phaseCards).forEach(card => card.classList.remove('is-active'));
}

function triggerMessage(message, config) {
  message.className = 'message-bubble';
  message.textContent = config.text;
  if (config.tone === 'abort') message.classList.add('is-abort');
  if (config.tone === 'commit') message.classList.add('is-commit');

  requestAnimationFrame(() => {
    message.classList.add(config.returning ? 'is-returning' : 'is-moving');
  });
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
  outcomePill.textContent = index === scenario.steps.length - 1 ? scenario.outcome : 'In progress';

  if (step.phase) phaseCards[step.phase].classList.add('is-active');
  step.activeActors.forEach(actor => actorCards[actor].classList.add('is-active'));

  Object.entries(step.states).forEach(([actor, state]) => {
    actorStates[actor].textContent = state;
  });

  if (index === scenario.steps.length - 1) {
    Object.values(actorCards).forEach(card => card.classList.add(scenario.finalClass));
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
  actorStates.processA.textContent = 'Waiting on port 1233.';
  actorStates.processB.textContent = 'Waiting on port 1234.';
  messageA.className = 'message-bubble';
  messageB.className = 'message-bubble';
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
