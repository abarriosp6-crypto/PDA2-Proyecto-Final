
let PDA = {
    Q: [],
    Sigma: [],
    Gamma: [],
    q0: '',
    Z: '',
    F: [],
    transitions: []
};

// 1. Definición formal (Basada en el diagrama final q0 a q6)
const builtInDescription = {
    Q: ["q0", "q1", "q2", "q3", "q4", "q5", "q6"], 
    Sigma: ["x", "y", "z"], // Alfabeto
    Gamma: ["Z", "#", "A", "B"], // Símbolos de pila: A=n, B=m
    q0: "q0",
    Z: "Z",
    F: ["q6"] // Estado de aceptación final
};

// 2. Transiciones (IMPLEMENTACIÓN FINAL CORREGIDA)
const builtInTransitions = [

    { current_state: 'q0', input_symbol: 'x', stack_top: 'Z', next_state: 'q0', stack_push: ['Z', 'A'], desc: 'x^(2n): Push A sobre Z' },
    { current_state: 'q0', input_symbol: 'x', stack_top: 'A', next_state: 'q0', stack_push: ['A', 'A'], desc: 'x^(2n): Push A sobre A' }, 
    
    { current_state: 'q0', input_symbol: 'y', stack_top: 'A', next_state: 'q1', stack_push: ['A', '#', 'B', 'B', 'B'], desc: 'Transición a y^m: Push 3B y marcador' },
    { current_state: 'q1', input_symbol: 'y', stack_top: 'B', next_state: 'q1', stack_push: ['B', 'B', 'B', 'B'], desc: 'y^m: Push 3B' },

    { current_state: 'q1', input_symbol: 'x', stack_top: 'B', next_state: 'q2', stack_push: [], desc: 'Transición a x^3m: Pop B (1/3m)' },
    { current_state: 'q2', input_symbol: 'x', stack_top: 'B', next_state: 'q2', stack_push: [], desc: 'x^3m: Pop B' },

    { current_state: 'q2', input_symbol: 'λ', stack_top: '#', next_state: 'q3', stack_push: [], desc: 'Transición a y^n: Pop marcador #' },
    { current_state: 'q3', input_symbol: 'y', stack_top: 'A', next_state: 'q4', stack_push: [], desc: 'y^n: Pop 1er A' },

    { current_state: 'q4', input_symbol: 'λ', stack_top: 'A', next_state: 'q4', stack_push: [], desc: 'λ: Pop 2do A (Para 2n:n)' },
    { current_state: 'q4', input_symbol: 'y', stack_top: 'A', next_state: 'q4', stack_push: [], desc: 'y^n: Bucle, Pop 1er A' },
    
    { current_state: 'q4', input_symbol: 'z', stack_top: 'Z', next_state: 'q5', stack_push: ['Z'], desc: 'Transición a z+: Mantener Z' },
    { current_state: 'q5', input_symbol: 'z', stack_top: 'Z', next_state: 'q5', stack_push: ['Z'], desc: 'z+: Bucle' },
    { current_state: 'q5', input_symbol: 'λ', stack_top: 'Z', next_state: 'q6', stack_push: [], desc: 'Aceptación: Pop Z' }
];



// FUNCIONES DE UTILIDAD Y SIMULACIÓN


// Inicialización del PDA con la definición embebida
PDA.Q = builtInDescription.Q;
PDA.Sigma = builtInDescription.Sigma;
PDA.Gamma = builtInDescription.Gamma;
PDA.q0 = builtInDescription.q0;
PDA.Z = builtInDescription.Z;
PDA.F = builtInDescription.F;
PDA.transitions = builtInTransitions;


// CORRECCIÓN 2: Formato de pila. Muestra BASE a CIMA (Z A A).
const formatStackForID = (stack) => {
    // Devuelve la pila de BASE a CIMA (Ej: ZAA).
    return stack.slice().reverse().join('') || 'ε';
};

function generatePDAIDs(inputChain) {
    const ids = [];
    const input = inputChain.split('');

    let currentStates = [{
        state: PDA.q0,
        stack: [PDA.Z], // Base de la pila (indice 0)
        inputIndex: 0
    }];
    
    // Estado inicial para la salida
    ids.push({ type: 'ID', from: `(${PDA.q0}, ${inputChain || 'ε'}, ${formatStackForID([PDA.Z])})`, to: null, transition: 'Inicio' });


    let step = 0;
    const MAX_STEPS = 5000; 
    const visited = new Set();
    const getKey = (state, stack, inputIndex) => `${state}|${stack.join('')}|${inputIndex}`;

    let hasActiveTransitions = false;
    while (currentStates.length > 0 && step < MAX_STEPS) {
        let nextStates = [];
        let newIdsInStep = [];
        hasActiveTransitions = false;

        for (const { state, stack, inputIndex } of currentStates) {
            
            const remainingString = input.slice(inputIndex).join('') || 'ε';
            
            // CORRECCIÓN 3: Determinación robusta de la cima de la pila.
            const actualStackTop = stack.length > 0 ? stack[stack.length - 1] : PDA.Z; 
            
            const from = `(${state}, ${remainingString}, ${formatStackForID(stack)})`;

            // --- 1. Comprobar transiciones Lambda (no consumen entrada) ---
            const lambdaTransitions = PDA.transitions.filter(t => 
                t.current_state === state && 
                t.input_symbol === 'λ' && 
                t.stack_top === actualStackTop
            );

            for (const transition of lambdaTransitions) {
                const newStack = [...stack];
                
                // Pop (reemplazo o pop real)
                if(newStack.length > 0) newStack.pop(); 
                
                // Push 
                transition.stack_push.forEach(symbol => newStack.push(symbol));
                
                const newKey = getKey(transition.next_state, newStack, inputIndex);
                const to = `(${transition.next_state}, ${remainingString}, ${formatStackForID(newStack)})`;

                if (!visited.has(newKey)) {
                    newIdsInStep.push({ type: 'ID', from: from, to: to, transition: transition.desc, action: `Pop ${actualStackTop}, Push ${transition.stack_push.join('') || 'λ'}` });
                    nextStates.push({ state: transition.next_state, stack: newStack, inputIndex: inputIndex });
                    visited.add(newKey);
                    hasActiveTransitions = true;
                }
            }


            // --- 2. Comprobar transiciones de Entrada (consumen 1 símbolo) ---
            if (inputIndex < input.length) {
                const inputSymbol = input[inputIndex];
                const inputTransitions = PDA.transitions.filter(t => 
                    t.current_state === state && 
                    t.input_symbol === inputSymbol && 
                    t.stack_top === actualStackTop
                );

                for (const transition of inputTransitions) {
                    const newStack = [...stack];
                    
                    // Pop
                    if(newStack.length > 0) newStack.pop(); 

                    // Push
                    transition.stack_push.forEach(symbol => newStack.push(symbol));

                    const nextInputIndex = inputIndex + 1;
                    const nextRemaining = input.slice(nextInputIndex).join('') || 'ε';
                    
                    const to = `(${transition.next_state}, ${nextRemaining}, ${formatStackForID(newStack)})`;

                    const newKey = getKey(transition.next_state, newStack, nextInputIndex);
                    if (!visited.has(newKey)) {
                        newIdsInStep.push({ type: 'ID', from: from, to: to, transition: transition.desc, action: `Pop ${actualStackTop}, Push ${transition.stack_push.join('') || 'λ'}` });
                        nextStates.push({ state: transition.next_state, stack: newStack, inputIndex: nextInputIndex });
                        visited.add(newKey);
                        hasActiveTransitions = true;
                    }
                }
            }
        }
        
        // Manejo de rechazo por atasco o aceptación
        if (!hasActiveTransitions && currentStates.length > 0) {
            let hasAcceptanceInThisStep = false;
            
            for (const { state, stack, inputIndex } of currentStates) {
                const remainingStr = input.slice(inputIndex).join('') || 'ε';
                const actualStackTop = stack.length > 0 ? stack[stack.length - 1] : PDA.Z;
                
                // 1. Condición para ACEPTACIÓN TERMINAL: Estado final (q6) Y entrada vacía
                const remainingInputEmpty = inputIndex >= input.length;
                const isAcceptanceTerminal = PDA.F.includes(state) && remainingInputEmpty;

                if (isAcceptanceTerminal) {
                    // Estado final con entrada consumida = ACEPTACIÓN
                    const from = `(${state}, ${remainingStr}, ${formatStackForID(stack)})`;
                    const to = `(${state}, ε, ${formatStackForID(stack)}) [ACEPTACIÓN]`;
                    
                    const acceptanceKey = getKey(state, stack, inputIndex) + 'ACC';
                    if (!visited.has(acceptanceKey)) {
                        newIdsInStep.push({ type: 'ID', from: from, to: to, transition: 'Aceptación: Estado final alcanzado' });
                        visited.add(acceptanceKey);
                        hasAcceptanceInThisStep = true;
                    }
                    continue; 
                }
            }
            
            // Solo generar IDs de rechazo si NO hubo aceptación en este paso
            if (!hasAcceptanceInThisStep) {
                for (const { state, stack, inputIndex } of currentStates) {
                    // Verificar nuevamente si es aceptación (por si acaso)
                    const remainingInputEmpty = inputIndex >= input.length;
                    const isAcceptanceTerminal = PDA.F.includes(state) && remainingInputEmpty;
                    
                    if (isAcceptanceTerminal) {
                        continue; // Ya se procesó arriba
                    }
                    
                    const remainingStr = input.slice(inputIndex).join('') || 'ε';
                    const actualStackTop = stack.length > 0 ? stack[stack.length - 1] : PDA.Z;
                    
                    // Generar el ID de rechazo/atasco.
                    const from = `(${state}, ${remainingStr}, ${formatStackForID(stack)})`;
                    const to = `(${state}, ${remainingStr}, ${formatStackForID(stack)}) [RECHAZO: Atasco. Símbolo: ${remainingStr[0] || 'ε'}, Cima: ${actualStackTop}]`;
                    
                    const rejectionKey = getKey(state, stack, inputIndex) + 'REJ';
                    if (!visited.has(rejectionKey)) {
                        newIdsInStep.push({ type: 'ID', from: from, to: to, transition: 'Atasco / Sin transición' });
                        visited.add(rejectionKey);
                    }
                }
            }
        }
        
        newIdsInStep.forEach(id => {
            if (!ids.some(i => i.from === id.from && i.to === id.to)) {
                ids.push(id);
            }
        });
        currentStates = nextStates;
        step++;
    }
    
    // Determinación final de aceptación/rechazo
    let accepted = false;
    
    // Buscar aceptación: estado final q6 con entrada vacía O marcador [ACEPTACIÓN]
    const finalIDs = ids.filter(id => {
        if (!id.to) return false;
        
        // Si tiene marcador de aceptación explícito
        if (id.to.includes('[ACEPTACIÓN')) {
            return true;
        }
        
        const parts = id.to.match(/\((.*?),\s*(.*?),\s*(.*?)\)/); 
        if (!parts) return false;
        
        const finalState = parts[1];
        const finalRemaining = parts[2] === 'ε' ? '' : parts[2];
        
        return PDA.F.includes(finalState) && finalRemaining === '';
    });
    
    if (finalIDs.length > 0) {
        accepted = true;
    }
    
    return { ids: ids.filter(id => id.to !== null), accepted };
}



// RENDERIZADO DE INTERFAZ (UI)

// 1. Renderiza la Tabla de Transiciones (HTML)
function renderTransitionsTable() {
    const tbody = document.getElementById('pda-transitions');
    if (!tbody) return;
    
    const rows = builtInTransitions.map(t => {
        const stackPush = t.stack_push.join('') || 'λ';
        return `
            <tr>
                <td>${t.current_state}</td>
                <td>${t.input_symbol}</td>
                <td>${t.stack_top}</td>
                <td>${t.next_state}</td>
                <td>${stackPush}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

// 2. Manejador del Botón de Simulación
const inputStringElem = document.getElementById('inputString');
const generateIdsButton = document.getElementById('generateIdsButton');
const pdaIdsResultElem = document.getElementById('pdaIdsResult');

if (generateIdsButton && pdaIdsResultElem) {
    // Renderiza la tabla al cargar la página
    renderTransitionsTable(); 
    
    generateIdsButton.addEventListener('click', () => {
        const inputChain = inputStringElem.value.trim();
        if (!inputChain) {
            pdaIdsResultElem.innerHTML = '<div class="message warning">Por favor, ingresa una cadena.</div>';
        return;
    }

        const { ids, accepted } = generatePDAIDs(inputChain);
        
        let formattedIDs = '';

        if (ids.length === 0 && inputChain.length > 0) {
             formattedIDs = '<div class="message error">Rechazo inmediato: No hay transición inicial válida.</div>';
        } else {

            // Variable para verificar si el ID actual fue el último paso antes de la ACEPTACIÓN.
            let foundFinalAcceptance = false;

            // Filtra el ID de atasco si el anterior fue la aceptación final
            const filteredIds = ids.filter(id => {
                // Marcamos si encontramos la transición de aceptación final (q5 -> q6) o un ID con [ACEPTACIÓN]
                if ((id.transition === 'Aceptación: Pop Z' && id.to && id.to.includes('(q6')) || 
                    (id.to && id.to.includes('[ACEPTACIÓN'))) {
                    foundFinalAcceptance = true;
                    return true; // Incluir la línea de aceptación
                }
                
                // Si ya hemos pasado la aceptación final, omitir la línea de atasco posterior.
                if (foundFinalAcceptance && id.transition === 'Atasco / Sin transición' && id.to && id.to.includes('RECHAZO')) {
                    return false; // Omitir la línea de atasco
                }

                // Si el ID tiene [ACEPTACIÓN], siempre incluirlo (por si acaso no se marcó antes)
                if (id.to && id.to.includes('[ACEPTACIÓN')) {
                    foundFinalAcceptance = true;
                    return true;
                }

                return id.type === 'ID';
            });

            // Mapear los IDs filtrados para su visualización
    formattedIDs = filteredIds.map(id => {
        const parts = id.to.match(/\((.*?),\s*(.*?),\s*(.*?)\)/);
        
        // Chequear si es un ID de rechazo explícito (si id.to contiene el mensaje de rechazo)
        const isRejection = id.to && id.to.includes('[RECHAZO');
        const rejectionMessage = isRejection ? id.to.split('[RECHAZO:')[1].slice(0, -1) : '';

        // Usar los grupos capturados, o un valor por defecto si es rechazo (para evitar error de null)
        const toState = isRejection ? 'RECHAZO' : (parts ? parts[1] : 'ERROR');
        const toRemaining = isRejection ? (id.from.match(/\((.*?),\s*(.*?),\s*(.*?)\)/) ? id.from.match(/\((.*?),\s*(.*?),\s*(.*?)\)/)[2] : 'Error') : (parts ? parts[2] : 'Error');
        const toStack = isRejection ? (id.from.match(/\((.*?),\s*(.*?),\s*(.*?)\)/) ? id.from.match(/\((.*?),\s*(.*?),\s*(.*?)\)/)[3] : 'Error') : (parts ? parts[3] : 'Error');
        
        // Formato de colores
        const stateColor = isRejection ? '#e74c3c' : (PDA.F.includes(toState) ? '#28a745' : '#007bff');

        return `<div class="id-line"><span class="from">(${id.from.split('(')[1].split(')')[0]})</span><span class="to" style="color: ${stateColor};">(${toState}, ${toRemaining}, <span style="font-weight: bold;">${toStack}</span>)</span>${isRejection ? `<span style="color: #e74c3c;">[RECHAZO: ${rejectionMessage}]</span>` : ''}</div>`;
    }).join('');

    // Mensaje final (el mismo que tenías)
    const finalMessage = accepted 
        ? `<div class="message success"> Cadena ${inputChain} ¡ACEPTADA! (Finalizó en q6 con pila vacía)</div>`
        : `<div class="message error"> Cadena **${inputChain}** RECHAZADA. (El autómata se atascó o no terminó en $q6$)</div>`;
    
    formattedIDs = finalMessage + '<h3>Traza de la Función Extendida y Pila (IDs):</h3>' + formattedIDs;
}
        
        pdaIdsResultElem.innerHTML = formattedIDs;
        
        // Preparar simulación paso a paso
        if (inputChain) {
            prepareStepSimulation(inputChain);
        }
    });
}


// 3. GRAFO DEL AUTÓMATA Y SIMULACIÓN PASO A PASO


let network = null;
let stepSimulationData = [];
let currentStepIndex = 0;
let graphEdges = null;

// Inicializar el grafo del autómata

// Inicializar el grafo del autómata
function initializeGraph() {
    const container = document.getElementById('graph-container');
    if (!container) return;

    const nodes = [];
    const edges = [];
    const loopCountByNode = {};

    // Crear nodos (estados) - SIN BORDES
    builtInDescription.Q.forEach(q => {
        let color;

        if (q === 'q_accept') {
            // Estado de aceptación - estilo diferente
            color = { background: '#c8e6c9', border: '#c8e6c9' }; // Borde mismo color que fondo
        } else if (q === 'q_reject') {
            // Estado de rechazo - estilo diferente
            color = { background: '#ffcdd2', border: '#ffcdd2' }; // Borde mismo color que fondo
        } else if (q === 'q0') {
            // Estado inicial - estilo diferente
            color = { background: '#bbdefb', border: '#bbdefb' }; // Borde mismo color que fondo
        } else {
            // Estados regulares - nuevo estilo
            color = { background: '#fff9c4', border: '#fff9c4' }; // Borde mismo color que fondo
        }

        nodes.push({
            id: q,
            label: q,
            shape: builtInDescription.F.includes(q) ? 'doublecircle' : 'circle',
            color: color,
            font: { 
                size: 15, 
                face: 'Arial', 
                color: '#000',
                bold: true 
            },
            size: 28, // Ligeramente más grande
            borderWidth: 0, // SIN BORDE
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.1)',
                size: 5,
                x: 2,
                y: 2
            }
        });
    });

    // Crear aristas (transiciones del autómata) - CON NUEVO ESTILO DE FLECHAS
    builtInTransitions.forEach((t, index) => {
        const inputSymbol = t.input_symbol === 'λ' ? 'λ' : t.input_symbol;
        const stackPush = t.stack_push.length > 0 ? t.stack_push.join('') : 'λ';
        const label = `${inputSymbol}, ${t.stack_top};${stackPush}`;

        const isSelfLoop = t.current_state === t.next_state;

        let vadjust = -10;
        let roundness = 0;
        let smoothType = 'continuous';
        let smoothEnabled = false;

        if (isSelfLoop) {
            if (!loopCountByNode[t.current_state]) loopCountByNode[t.current_state] = 0;
            const loopIndex = loopCountByNode[t.current_state];

            const baseHeight = -25;
            const step = 18;
            vadjust = baseHeight - loopIndex * step;
            roundness = 0.5 + loopIndex * 0.15;
            smoothType = loopIndex % 2 === 0 ? 'curvedCW' : 'curvedCCW';
            smoothEnabled = true;

            loopCountByNode[t.current_state]++;
        }

        edges.push({
            id: `edge-${index}`,
            from: t.current_state,
            to: t.next_state,
            label: label,
            arrows: {
                to: {
                    enabled: true,
                    type: 'triangle', // Estilo triangular
                    scaleFactor: 1.3, // Tamaño mediano
                    length: 15, // Longitud de la flecha
                    width: 10,  // Ancho de la flecha
                    color: { 
                        color: '#34495e',
                        highlight: '#e74c3c',
                        hover: '#3498db'
                    }
                }
            },
            font: {
                align: 'top',
                size: 13,
                vadjust: vadjust,
                face: 'Arial',
                color: '#2c3e50',
                background: 'rgba(255,255,255,0.9)',
                strokeWidth: 2,
                strokeColor: 'white'
            },
            color: { 
                color: '#34495e', 
                highlight: '#e74c3c',
                hover: '#3498db'
            },
            width: 2.5, // Línea más gruesa
            smooth: {
                enabled: smoothEnabled,
                type: smoothType,
                roundness: roundness
            },
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.15)',
                size: 4,
                x: 2,
                y: 2
            }
        });
    });

    const data = { nodes, edges };

    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'LR', // Misma dirección
                sortMethod: 'directed',
                levelSeparation: 150, // Mismos espaciados
                nodeSpacing: 180
            }
        },
        physics: { enabled: false }, // Mismo comportamiento
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false
        },
        edges: {
            smooth: {
                type: 'continuous',
                forceDirection: 'horizontal',
                roundness: 0
            },
            color: '#555',
            width: 2.5,
            arrows: {
                to: { 
                    enabled: true,
                    type: 'triangle',
                    scaleFactor: 1.3,
                    length: 15,
                    width: 10
                }
            }
        },
        nodes: {
            borderWidth: 0, // SIN BORDE
            borderWidthSelected: 0, // Sin borde incluso cuando está seleccionado
            font: { 
                color: '#000', 
                size: 15,
                face: 'Arial',
                bold: true
            },
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.1)',
                size: 5,
                x: 2,
                y: 2
            }
        }
    };

    network = new vis.Network(container, data, options);
    graphEdges = edges; // Guardar aristas para actualizaciones
}
// ====================================================================
// 4. GRAMÁTICA LIBRE DE CONTEXTO Y DERIVACIONES
// ====================================================================

// Gramática Libre de Contexto para L = {x^2n y^m x^3m y^n z^+ | n >= 1, m >= 1}
const GLC = {
    start_symbol: 'S',
    rules: {
        'S': ['x x S y', 'A'],
        'A': ['y A x x x', 'B'],
        'B': ['y B', 'C'],
        'C': ['z C', 'z']
    }
};

// Analiza estructura básica de la cadena
function analyzeString(input) {
    const regex = /^(x+)(y+)(x+)(y+)(z+)$/;
    const match = input.match(regex);
    if (!match) return { valid: false, reason: "La cadena no sigue el patrón x^+ y^+ x^+ y^+ z^+" };

    const [_, x1, y1, x2, y2, z] = match;
    const n = x1.length / 2;
    const m = y1.length;
    if (x1.length % 2 !== 0) return { valid: false, reason: "La primera parte de x debe ser par (2n)." };
    if (x2.length !== 3 * m) return { valid: false, reason: "La tercera parte de x debe ser 3 veces la cantidad de y del segundo bloque." };
    if (y2.length !== n) return { valid: false, reason: "La última parte de y debe coincidir con n del primer bloque." };

    return { valid: true, n, m, z_len: z.length };
}

// Genera derivación izquierda más completa
function generateLeftDerivation(n, m, z_len) {
    const steps = [];
    let current = 'S';
    let step = 1;

    // S -> x x S y repetido n veces, luego S -> A
    for (let i = 0; i < n; i++) {
        const prev = current;
        current = current.replace('S', 'x x S y');
        steps.push({ step: step++, from: prev, to: current, rule: 'S → x x S y' });
    }
    const prevS = current;
    current = current.replace('S', 'A');
    steps.push({ step: step++, from: prevS, to: current, rule: 'S → A' });

    // A -> y A x x x repetido m veces, luego A -> B
    for (let i = 0; i < m; i++) {
        const prev = current;
        current = current.replace('A', 'y A x x x');
        steps.push({ step: step++, from: prev, to: current, rule: 'A → y A x x x' });
    }
    const prevA = current;
    current = current.replace('A', 'B');
    steps.push({ step: step++, from: prevA, to: current, rule: 'A → B' });

    // B -> y B repetido n veces, luego B -> C
    for (let i = 0; i < n; i++) {
        const prev = current;
        current = current.replace('B', 'y B');
        steps.push({ step: step++, from: prev, to: current, rule: 'B → y B' });
    }
    const prevB = current;
    current = current.replace('B', 'C');
    steps.push({ step: step++, from: prevB, to: current, rule: 'B → C' });

    // C -> z C repetido z_len - 1 veces, luego C -> z
    for (let i = 0; i < z_len - 1; i++) {
        const prev = current;
        current = current.replace('C', 'z C');
        steps.push({ step: step++, from: prev, to: current, rule: 'C → z C' });
    }
    const prevC = current;
    current = current.replace('C', 'z');
    steps.push({ step: step++, from: prevC, to: current, rule: 'C → z' });

    return steps;
}

// Muestra derivación
// Muestra derivación en formato compacto CORREGIDO
function displayDerivation(input, derivationType) {
    const resultElem = document.getElementById('derivationResult');
    const analysis = analyzeString(input);

    if (!analysis.valid) {
        resultElem.innerHTML = `<p style="color:red;">✗ ${analysis.reason}</p>`;
        return;
    }

    const { n, m, z_len } = analysis;
    
    let html = `<p style="color:green;">✓ Cadena válida: n=${n}, m=${m}, z⁺ tiene ${z_len} z's</p>`;
    html += `<h3>Gramática</h3>`;
    html += `<div style="font-family: monospace; background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
    html += `<div>S → A Zs</div>`;
    html += `<div>A → xxAy | B</div>`;
    html += `<div>B → yBxxx | yxxx</div>`;
    html += `<div>Zs → zZs | z</div>`;
    html += `</div>`;
    
    html += `<h3>Derivación Izquierda</h3>`;
    html += `<div class="derivation-steps">`;

    let steps = [];
    let current = 'S';
    let step = 1;

    // Paso 1: S → A Zs
    steps.push({step: step++, from: current, to: 'A Zs', rule: 'S → A Zs'});
    current = 'A Zs';

    // Expandir A: A → xxAy repetido n veces
    for (let i = 0; i < n; i++) {
        let newCurrent = current.replace('A', 'xxAy');
        steps.push({step: step++, from: current, to: newCurrent, rule: 'A → xxAy'});
        current = newCurrent;
    }

    // A → B
    let newCurrent = current.replace('A', 'B');
    steps.push({step: step++, from: current, to: newCurrent, rule: 'A → B'});
    current = newCurrent;

    // Expandir B: B → yBxxx repetido m-1 veces
    for (let i = 0; i < m - 1; i++) {
        newCurrent = current.replace('B', 'yBxxx');
        steps.push({step: step++, from: current, to: newCurrent, rule: 'B → yBxxx'});
        current = newCurrent;
    }

    // B → yxxx
    newCurrent = current.replace('B', 'yxxx');
    steps.push({step: step++, from: current, to: newCurrent, rule: 'B → yxxx'});
    current = newCurrent;

    // Expandir Zs: Zs → zZs repetido z_len-1 veces
    for (let i = 0; i < z_len - 1; i++) {
        newCurrent = current.replace('Zs', 'zZs');
        steps.push({step: step++, from: current, to: newCurrent, rule: 'Zs → zZs'});
        current = newCurrent;
    }

    // Zs → z
    newCurrent = current.replace('Zs', 'z');
    steps.push({step: step++, from: current, to: newCurrent, rule: 'Zs → z'});
    current = newCurrent;

    // Mostrar los pasos
    steps.forEach(s => {
        html += `
        <div class="derivation-step">
            <div class="step-number">Paso ${s.step}</div>
            <div class="step-content">
                <span class="from-expr">${s.from}</span>
                <span class="arrow">⇒</span>
                <span class="to-expr">${s.to}</span>
            </div>
            <div class="step-rule">[${s.rule}]</div>
        </div>`;
    });

    html += `</div>`;
    
    // Resultado final
    const finalString = current.replace(/ /g, '');
    html += `
    <div class="derivation-final">
        <strong>Cadena derivada:</strong> 
        <code>${finalString}</code>
        <div style="margin-top: 10px; color: #28a745; font-weight: bold;">
            ✓ Aceptada
        </div>
    </div>`;

    resultElem.innerHTML = html;
}

// Función para preparar la simulación paso a paso
function prepareStepSimulation(inputChain) {
    if (!inputChain) return false;
    
    const { ids } = generatePDAIDs(inputChain);
    
    // Filtrar IDs: si hay un ID de aceptación para un estado, omitir el ID de atasco del mismo estado
    let foundAcceptance = false;
    const filteredStepIds = ids.filter(id => {
        if (!id.type || !id.to) return false;
        
        // Si encontramos un ID de aceptación, marcarlo
        if (id.to.includes('[ACEPTACIÓN')) {
            foundAcceptance = true;
            return true;
        }
        
        // Si hay aceptación, omitir IDs de atasco
        if (foundAcceptance && id.transition === 'Atasco / Sin transición' && id.to.includes('RECHAZO')) {
        return false;
    }
        
        return id.type === 'ID' && id.to;
    });
    
    stepSimulationData = filteredStepIds;
    currentStepIndex = 0;
    
    // Habilitar botones
    const resetButton = document.getElementById('resetStepButton');
    const nextStepButton = document.getElementById('nextStepButton');
    if (resetButton) resetButton.disabled = false;
    if (nextStepButton) nextStepButton.disabled = false;
    
    // Mostrar estado inicial
    showStep(0);

    return true;
}

// Función para mostrar un paso específico
function showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= stepSimulationData.length) return;
    
    const step = stepSimulationData[stepIndex];
    const stepResultElem = document.getElementById('stepResult');
    if (!stepResultElem) return;
    
    // Extraer información del paso
    const fromMatch = step.from.match(/\((.*?),\s*(.*?),\s*(.*?)\)/);
    const toMatch = step.to.match(/\((.*?),\s*(.*?),\s*(.*?)\)/);
    
    if (!fromMatch || !toMatch) return;
    
    const fromState = fromMatch[1];
    const fromRemaining = fromMatch[2];
    const fromStack = fromMatch[3];
    
    const toState = toMatch[1];
    const toRemaining = toMatch[2] === 'ε' ? '' : toMatch[2];
    const toStack = toMatch[3];
    
    // Resaltar estado actual en el grafo
    if (network && graphEdges) {
        const nodes = builtInDescription.Q.map(q => {
            let color;
    
            if (q === toState) {
                // Estado activo
                color = { background: '#ffcc80', border: '#ef6c00' };
            } else if (q === 'q6') {
                //  Estado q6 (morado)
                color = { background: '#b388ff', border: '#6200ea' };
            } else {
                //  Estados q0–q5 (amarillos)
                color = { background: '#fff176', border: '#fbc02d' };
            }
    
            return {
                id: q,
                label: q,
                shape: builtInDescription.F.includes(q) ? 'doublecircle' : 'circle',
                color: color,
                font: { size: 16, face: 'Arial', color: '#000' }
            };
        });
    
        network.setData({ nodes: nodes, edges: graphEdges });
    }
    
    
    // Mostrar información del paso
    const isRejection = step.to.includes('[RECHAZO');
    const isAcceptance = step.to.includes('[ACEPTACIÓN') || (PDA.F.includes(toState) && toRemaining === '');
    
    // Determinar color y mensaje según el tipo
    let stateColor = '#007bff';
    let messageHtml = '';
    
    if (isAcceptance) {
        stateColor = '#28a745';
        messageHtml = `<p style="color: #28a745; font-weight: bold; font-size: 1.1em;"> ACEPTACIÓN: La cadena fue aceptada en el estado final ${toState}</p>`;
    } else if (isRejection) {
        stateColor = '#e74c3c';
        messageHtml = `<p style="color: #e74c3c; font-weight: bold;"> ${step.to.split('[RECHAZO:')[1]?.replace(']', '') || 'RECHAZO'}</p>`;
    }
    
    const html = `
        <div style="font-family: monospace;">
            <p><strong>Paso ${stepIndex + 1} de ${stepSimulationData.length}</strong></p>
            <p><strong>Estado:</strong> <span style="color: #007bff; font-weight: bold;">${fromState}</span> → <span style="color: ${stateColor}; font-weight: bold;">${toState}</span></p>
            <p><strong>Entrada restante:</strong> <span style="color: #666;">${fromRemaining || 'ε'}</span></p>
            <p><strong>Pila:</strong> <span style="font-weight: bold; color: #007bff;">${fromStack}</span> → <span style="font-weight: bold; color: ${stateColor};">${toStack}</span></p>
            ${messageHtml}
        </div>
    `;
    
    stepResultElem.innerHTML = html;
    
    // Deshabilitar botón siguiente si es el último paso
    const nextStepButton = document.getElementById('nextStepButton');
    if (nextStepButton) {
        nextStepButton.disabled = (stepIndex >= stepSimulationData.length - 1);
    }
}

// Event listeners para simulación paso a paso
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar PDA
    PDA.Q = builtInDescription.Q;
    PDA.Sigma = builtInDescription.Sigma;
    PDA.Gamma = builtInDescription.Gamma;
    PDA.q0 = builtInDescription.q0;
    PDA.Z = builtInDescription.Z;
    PDA.F = builtInDescription.F;
    PDA.transitions = builtInTransitions;
    
    // Inicializar grafo
    initializeGraph();
    
    // Botón siguiente paso
    const nextStepButton = document.getElementById('nextStepButton');
    if (nextStepButton) {
        nextStepButton.addEventListener('click', () => {
            if (currentStepIndex < stepSimulationData.length - 1) {
                currentStepIndex++;
                showStep(currentStepIndex);
            }
        });
    }
    
    // Botón reiniciar
    const resetStepButton = document.getElementById('resetStepButton');
    if (resetStepButton) {
        resetStepButton.addEventListener('click', () => {
            currentStepIndex = 0;
            showStep(0);
            const nextStepButton = document.getElementById('nextStepButton');
            if (nextStepButton) nextStepButton.disabled = false;
        });
    }
    
    // Cuando se simula una cadena, preparar simulación paso a paso
    // Esto se maneja dentro del listener existente del botón
    
    // Botón de derivación
    const generateDerivationButton = document.getElementById('generateDerivationButton');
    const derivationInput = document.getElementById('derivationInput');
    
    if (generateDerivationButton && derivationInput) {
        generateDerivationButton.addEventListener('click', () => {
            const input = derivationInput.value.trim();
            if (!input) {
                const resultElem = document.getElementById('derivationResult');
                if (resultElem) {
                    resultElem.innerHTML = '<div class="message warning">Por favor, ingresa una cadena.</div>';
            }
            return;
        }

            const derivationType = document.querySelector('input[name="derivationType"]:checked')?.value || 'left';
            displayDerivation(input, derivationType);
        });
    }
});

