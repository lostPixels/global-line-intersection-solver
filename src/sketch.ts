import * as p5Global from "p5/global";
import { saveCanvasToFile, manageSeedState } from "ga-lib";
import solveMultiLineIntersections from "./lib/multiline-intersection-solver";

const urlParams = new URLSearchParams(window.location.search);

window.setup = () => {
    manageSeedState();
    createCanvas(1000, 700); //You can add SVG here like this: createCanvas(1000, 600, SVG);
    colorMode(HSL);
};

window.draw = () => {
    background(240);
    strokeWeight(1);
    noFill();

    const lines = [
        [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 120, y: 150 },
            { x: 621, y: 550 },
            { x: 125, y: 500 },
            { x: 225, y: 500 },
            { x: 230, y: 450 },
            { x: 525, y: 50 },
            { x: 725, y: 250 },
            { x: 100, y: 600 },
        ],
    ];
    lines.push([
        { x: 20, y: 200 },
        { x: 800, y: 170 },
        { x: 300, y: 630 },
    ]);

    lines.forEach((l, i) => {
        stroke(i * 50, 100, 80);
        drawLine(l);
        l.forEach((v) => circle(v.x, v.y, 8));
    });

    strokeWeight(1);
    stroke(0);
    const result = solveMultiLineIntersections(lines, 20);

    strokeWeight(4);
    //console.log(result);
    // result.forEach((lineGroup, i) => {
    //     let baseHue = i * 50;
    //     lineGroup.forEach((l, j) => {
    //         stroke(baseHue + 3 * j, 100, 60);
    //         drawLine(l);
    //     });
    // });

    noLoop();
    if (urlParams.has("saveCanvas") && urlParams.get("saveCanvas") === "true") {
        saveCanvasToFile("gen-art-sketch", false, "png"); //Set to SVG as needed.
    }
};

export function drawLine(points) {
    beginShape();
    points.forEach((p) => vertex(p.x, p.y));
    endShape();
}
