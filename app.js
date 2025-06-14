const workspace = document.getElementById('workspace');
const wiresSvg = document.getElementById('wires');
const gateOptions = document.querySelectorAll('.gate-option');
const saveBtn = document.getElementById('save');
const loadInput = document.getElementById('load');
const loadBtn = document.getElementById('loadBtn');

let gates = [];
let wires = [];
let dragData = null;
let connectData = null;
let gateId = 0;

function createGate(type, x, y) {
  const gate = { id: gateId++, type, x, y, inputs: [], outputs: [], element: null, state: false };
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.setAttribute('data-id', gate.id);
  el.innerText = type;
  if (type === 'SWITCH') el.classList.add('switch');
  if (type === 'LIGHT') el.classList.add('light');
  el.addEventListener('mousedown', startDrag);
  workspace.appendChild(el);
  gate.element = el;

  if (type === 'NOT') {
    addPin(gate, 'input');
    addPin(gate, 'output');
  } else if (type === 'AND' || type === 'OR') {
    addPin(gate, 'input');
    addPin(gate, 'input');
    addPin(gate, 'output');
  } else if (type === 'SWITCH') {
    addPin(gate, 'output');
    el.addEventListener('dblclick', () => {
      gate.state = !gate.state;
      el.style.background = gate.state ? '#ff8080' : '#ffe0e0';
    });
  } else if (type === 'LIGHT') {
    addPin(gate, 'input');
  }
  gates.push(gate);
  return gate;
}

function addPin(gate, kind) {
  const pin = document.createElement('div');
  pin.classList.add('pin');
  pin.classList.add(kind === 'input' ? 'input-pin' : 'output-pin');
  pin.setAttribute('data-gate', gate.id);
  pin.setAttribute('data-kind', kind);
  pin.setAttribute('data-index', kind === 'input' ? gate.inputs.length : gate.outputs.length);
  pin.addEventListener('mousedown', startConnect);
  gate.element.appendChild(pin);
  if (kind === 'input') gate.inputs.push({ state: false, el: pin });
  else gate.outputs.push({ state: false, el: pin });
  layoutPins(gate);
}

function layoutPins(gate) {
  gate.inputs.forEach((p, i) => { p.el.style.top = (20 * i + 10) + 'px'; });
  gate.outputs.forEach((p, i) => { p.el.style.top = (20 * i + 10) + 'px'; });
}

function startDrag(e) {
  const el = e.currentTarget;
  dragData = { el, offsetX: e.offsetX, offsetY: e.offsetY };
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', endDrag);
}

function dragMove(e) {
  if (!dragData) return;
  const x = e.pageX - dragData.offsetX - sidebar.offsetWidth;
  const y = e.pageY - dragData.offsetY;
  dragData.el.style.left = x + 'px';
  dragData.el.style.top = y + 'px';
  const gate = gates.find(g => g.id == dragData.el.getAttribute('data-id'));
  gate.x = x;
  gate.y = y;
  updateWires();
}

function endDrag() {
  dragData = null;
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', endDrag);
}

function startConnect(e) {
  e.stopPropagation();
  const gid = parseInt(e.target.getAttribute('data-gate'));
  const kind = e.target.getAttribute('data-kind');
  const idx = parseInt(e.target.getAttribute('data-index'));
  if (!connectData && kind === 'output') {
    connectData = { fromGate: gid, fromIndex: idx };
  } else if (connectData && kind === 'input') {
    wires.push({ fromGate: connectData.fromGate, fromIndex: connectData.fromIndex, toGate: gid, toIndex: idx, el: null });
    connectData = null;
    updateWires();
  }
}

function updateWires() {
  wiresSvg.innerHTML = '';
  wires.forEach(w => {
    const fromGate = gates.find(g => g.id === w.fromGate);
    const toGate = gates.find(g => g.id === w.toGate);
    if (!fromGate || !toGate) return;
    const fromPin = fromGate.outputs[w.fromIndex].el;
    const toPin = toGate.inputs[w.toIndex].el;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const fx = fromGate.x + fromPin.offsetLeft + 5;
    const fy = fromGate.y + fromPin.offsetTop + 5;
    const tx = toGate.x + toPin.offsetLeft + 5;
    const ty = toGate.y + toPin.offsetTop + 5;
    line.setAttribute('x1', fx);
    line.setAttribute('y1', fy);
    line.setAttribute('x2', tx);
    line.setAttribute('y2', ty);
    line.setAttribute('stroke', '#000');
    line.setAttribute('stroke-width', '2');
    wiresSvg.appendChild(line);
    w.el = line;
  });
}

function evaluate() {
  gates.forEach(g => g.inputs.forEach(i => i.state = false));
  wires.forEach(w => {
    const fromGate = gates.find(g => g.id === w.fromGate);
    const toGate = gates.find(g => g.id === w.toGate);
    const value = fromGate.outputs[w.fromIndex].state;
    toGate.inputs[w.toIndex].state = value;
  });
  gates.forEach(g => {
    if (g.type === 'SWITCH') {
      g.outputs[0].state = g.state;
    } else if (g.type === 'AND') {
      g.outputs[0].state = g.inputs.every(i => i.state);
    } else if (g.type === 'OR') {
      g.outputs[0].state = g.inputs.some(i => i.state);
    } else if (g.type === 'NOT') {
      g.outputs[0].state = !g.inputs[0].state;
    } else if (g.type === 'LIGHT') {
      g.element.style.background = g.inputs[0].state ? '#80ff80' : '#e0ffe0';
    }
  });
}

setInterval(evaluate, 100);

// Drag from sidebar
gateOptions.forEach(opt => {
  opt.setAttribute('draggable', 'true');
  opt.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', opt.getAttribute('data-type'));
  });
});

workspace.addEventListener('dragover', e => e.preventDefault());
workspace.addEventListener('drop', e => {
  const type = e.dataTransfer.getData('text/plain');
  const x = e.offsetX;
  const y = e.offsetY;
  createGate(type, x, y);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Delete' && dragData) {
    const gid = parseInt(dragData.el.getAttribute('data-id'));
    removeGate(gid);
    dragData = null;
  }
});

function removeGate(id) {
  const gate = gates.find(g => g.id === id);
  if (!gate) return;
  gate.element.remove();
  wires = wires.filter(w => w.fromGate !== id && w.toGate !== id);
  gates = gates.filter(g => g.id !== id);
  updateWires();
}

saveBtn.addEventListener('click', () => {
  const data = {
    gates: gates.map(g => ({ id: g.id, type: g.type, x: g.x, y: g.y, state: g.state })),
    wires: wires.map(w => ({ fromGate: w.fromGate, fromIndex: w.fromIndex, toGate: w.toGate, toIndex: w.toIndex }))
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'circuit.json';
  a.click();
  URL.revokeObjectURL(url);
});

loadBtn.addEventListener('click', () => loadInput.click());
loadInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = JSON.parse(evt.target.result);
    loadCircuit(data);
  };
  reader.readAsText(file);
});

function loadCircuit(data) {
  gates.forEach(g => g.element.remove());
  gates = [];
  wires = [];
  data.gates.forEach(g => {
    const gate = createGate(g.type, g.x, g.y);
    if (g.type === 'SWITCH') gate.state = g.state;
  });
  wires = data.wires.map(w => ({ ...w, el: null }));
  updateWires();
}
