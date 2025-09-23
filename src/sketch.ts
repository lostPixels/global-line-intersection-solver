import * as p5Global from "p5/global";
import { saveCanvasToFile, manageSeedState, rotatePolygonAroundPoint, pCircle } from "ga-lib";
import solveMultiLineIntersections, { calculateNewLineEnding, lineIntersectsLine } from "./lib/multiline-intersection-solver";

const urlParams = new URLSearchParams(window.location.search);

window.setup = () => {
    manageSeedState();
    createCanvas(1000, 700); //You can add SVG here like this: createCanvas(1000, 600, SVG);
    colorMode(HSL);
};

window.draw = () => {
    background(240);
    randomSeed(130);
    strokeWeight(1);
    noFill();

    const lines = [];

    // Create a circle with many segments
    lines.push(pCircle(mouseX, mouseY, 300));

    // Add a line that passes tangentially close to the circle
    lines.push([
        { x: 50, y: 500 },
        { x: 750, y: 500 },
        { x: 400, y: 200 },
        { x: 100, y: 600 },
    ]);

    // Add another line that intersects the circle
    lines.push([
        { x: 200, y: 200 },
        { x: 600, y: 500 },
    ]);

    // Draw original lines faintly
    lines.forEach((l, i) => {
        stroke(0, 0, 60, 0.3);
        strokeWeight(1);
        drawLine(l);
        // Draw vertices as small dots
        l.forEach((v) => {
            stroke(0, 0, 40, 0.5);
            circle(v.x, v.y, 2);
        });
    });

    // Process with intersection solver
    const distanceThreshold = 10;
    const result = solveMultiLineIntersections(lines, distanceThreshold);

    // Draw the processed result with vibrant colors
    strokeWeight(4);
    // Result is already drawn by the solver function

    // Draw distance threshold visualization
    stroke(0, 0, 90, 0.1);
    strokeWeight(distanceThreshold * 2);
    lines.forEach((l) => {
        drawLine(l);
    });

    if (urlParams.has("saveCanvas") && urlParams.get("saveCanvas") === "true") {
        noLoop();
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
