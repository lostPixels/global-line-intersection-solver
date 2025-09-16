
let stopsign = false;
let canProceed = true;
let overrideNoLoop = false;

const urlParams = new URLSearchParams(window.location.search);
let step = urlParams.get('step');
let segment = decodeURIComponent(urlParams.get('segment')); //Expressed as segment=100,200
if (!step || isNaN(step)) step = 0;


if (urlParams.has('noHYPER')) {
    canProceed = false;
}

let longestSequence = 0;
let renderSegment = null;

if (segment) {

    renderSegment = {
        start: parseInt(segment.split(',')[0]),
        end: parseInt(segment.split(',')[1])
    }
    //console.log('segment', segment, renderSegment)

    if (step < renderSegment.start) {
        //console.log('Skipping to segment start');
        canProceed = false;
        urlParams.set('step', renderSegment.start);
        let newUrl = window.location.origin + window.location.pathname + '?' + urlParams.toString();
        window.history.pushState({}, '', newUrl);
        setTimeout(() => {
            window.location.reload();
        }, 10);

    }
    else if (step >= renderSegment.end) {
        canProceed = false;
    }
}


window.CLEARHYPE = () => {
    sessionStorage.setItem('hyper_config', '');
}

function easeInOutQuart(x) {
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

export function HYPER(name, start, end, steps, delay = 0, ease = true) {

    console.log(`HYPER: name:${name} start:${start} end:${end} in steps: ${steps} delay:${delay} use ease? ${ease}`);

    if (!stopsign) {
        createStopSign();
    }
    if (!overrideNoLoop) {
        setNoLoopOverride();
    }

    if (longestSequence < steps + delay) {
        longestSequence = steps + delay;
    }

    console.log('longestSequence', longestSequence, step);

    if (step <= delay) {
        console.log(`HYPER Start: ${name} ${start}`);
        return start;
    }
    else if (step > steps + delay) {
        console.log(`HYPER Complete: ${name} ${end}`);
        return end;
    }
    else {
        let now = (step - delay) / steps;
        console.log(`IN TRANSIT: ${name} ${start} -> ${end} at ${now}`);

        if (ease) {
            now = easeInOutQuart(now);
        }

        return start + (end - start) * now;
    }
}


function setNoLoopOverride() {
    overrideNoLoop = true;
    let cnoLoop = window.noLoop;
    window.noLoop = () => {
        cnoLoop();
        saveHYPE();
    }
}


export function saveHYPE() {
    if (step >= longestSequence) {
        console.log('HYPER Complete.');
        return;
    }

    window.requestAnimationFrame(() => {

        if (canProceed) {
            saveCanvasAndReload();
        }
    });
}

const createStopSign = () => {
    let stop = document.createElement('div');
    stop.style.position = 'fixed';
    stop.style.top = '0';
    stop.style.left = '0';

    stop.style.backgroundColor = 'rgba(0,0,0,0.5)';
    stop.style.zIndex = '1000';

    stop.style.justifyContent = 'center';
    stop.style.alignItems = 'center';
    stop.style.fontSize = '3em';
    stop.style.color = 'white';
    stop.style.fontFamily = 'monospace';
    stop.innerHTML = 'Stop Hype';
    stop.onclick = () => {
        canProceed = false;
        stop.style.display = 'none';
    }
    document.body.appendChild(stop);
}

const saveCanvasAndReload = () => {
    let downloadLink = document.createElement('a');
    let hashSegment = tokenData.hash.slice(0, 5);
    downloadLink.setAttribute('download', `sync-${hashSegment}-${step}.png`);
    let canvas = document.getElementById('defaultCanvas0');
    canvas.toBlob(blob => {
        let url = URL.createObjectURL(blob);
        downloadLink.setAttribute('href', url);
        //downloadLink.click();

        step++;
        urlParams.set('step', step);
        let newUrl = window.location.origin + window.location.pathname + '?' + urlParams.toString();
        window.history.pushState({}, '', newUrl);
        setTimeout(() => {
            window.location.reload();
        }, 10);
    });
}
