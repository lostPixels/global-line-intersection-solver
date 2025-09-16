import * as p5Global from 'p5/global'
import {  saveCanvasToFile, manageSeedState } from 'ga-lib';


const urlParams = new URLSearchParams(window.location.search);

window.setup = () => {
    manageSeedState();
    createCanvas(1000, 600); //You can add SVG here like this: createCanvas(1000, 600, SVG);
}

window.draw = () => {
    background(0)
    for (let i = 0; i < 10; i++) {
        fill(random(255), random(255), random(255));
        circle(random(width), random(height), 30);
    }

    // Start doing cool stuff here 8^)


    noLoop();
    if (urlParams.has('saveCanvas') && urlParams.get('saveCanvas') === 'true') {
        saveCanvasToFile('gen-art-sketch', false, 'png'); //Set to SVG as needed. 
    }
}