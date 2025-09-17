import * as p5Global from "p5/global";
import { saveCanvasToFile, manageSeedState, rotatePolygonAroundPoint } from "ga-lib";
import solveMultiLineIntersections, { calculateNewLineEnding, lineIntersectsLine } from "./lib/multiline-intersection-solver";

const urlParams = new URLSearchParams(window.location.search);

window.setup = () => {
    manageSeedState();
    createCanvas(1000, 700); //You can add SVG here like this: createCanvas(1000, 600, SVG);
    colorMode(HSL);
};

window.draw = () => {
    background(240);
    randomSeed(100);
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
            { x: mouseX, y: mouseY },
            { x: 725, y: 250 },
            { x: 100, y: 600 },
        ],
    ];
    lines.push([
        { x: 20, y: 200 },
        { x: 900, y: 170 },
        { x: 300, y: 630 },
        { x: 350, y: 630 },
    ]);

    lines.forEach((l, i) => {
        stroke(i * 50, 10, 80);
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

    // noLoop();
    if (urlParams.has("saveCanvas") && urlParams.get("saveCanvas") === "true") {
        saveCanvasToFile("gen-art-sketch", false, "png"); //Set to SVG as needed.
    }
};

window.draw1 = () => {
    clear();
    let line1 = {
        p1: { x: 100, y: 100 },
        p2: { x: 500, y: 600 },
    };

    let line2 = [
        { x: 600, y: 110 },
        { x: 120, y: 700 },
    ];

    line2 = rotatePolygonAroundPoint(line2, (mouseX / width) * TWO_PI, width / 3, height / 2);

    line2 = {
        p1: line2[0],
        p2: line2[1],
    };

    noFill();

    strokeWeight(3);
    stroke(50);
    drawLine([line2.p1, line2.p2]);

    stroke("red");
    drawLine([line1.p1, line1.p2]);

    const int = lineIntersectsLine(line1, line2);
    let pts = calculateNewLineEnding(line1, line2, int);

    pts.forEach((p) => {
        circle(p.x, p.y, 20);
    });

    //noLoop();
};

export function drawLine(points) {
    beginShape();
    points.forEach((p) => vertex(p.x, p.y));
    endShape();
}
