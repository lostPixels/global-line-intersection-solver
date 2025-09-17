import { drawLine } from "../sketch";

interface Point {
    x: number;
    y: number;
}

interface Multiline {
    points: Point[];
}
/**
 * Accepts an array of Multi-lines and returns new fragments of those multilines that have intersections removed based on distance.
 * @param multiLines
 * @param distanceThreshold
 * @returns
 */
export default function solveMultiLineIntersections(multiLines: Multiline[], distanceThreshold: number) {
    const lines = deconstructAllMultilines(multiLines);
    const result = trimLines(lines);

    lines.forEach((l) => {
        stroke(random(360), 80, random(20, 70));
        strokeWeight(2);
        drawLine([l.p1, l.p2]);
    });

    result.forEach((l) => {
        stroke(random(360), 80, random(20, 70));
        strokeWeight(5);
        drawLine([l.p1, l.p2]);
    });
}

function deconstructAllMultilines(multilines) {
    const res = [];

    multilines.forEach((line, i) => {
        line.forEach((p1, j) => {
            if (j < line.length - 1) {
                const p2 = line[j + 1];
                res.push({
                    p1,
                    p2,
                    origin: i,
                    index: j,
                    zIndex: i + j, //Todo use this for picking intersection winners.
                });
            }
        });
    });
    return res;
}

function trimLines(lines) {
    let i = 0;
    const length = lines.length;
    let res = [];

    while (i < length) {
        const list = lines.filter((_, j) => j !== i);
        const trimResult = trimIndividualLine(lines[i], list);
        if (trimResult.length) res = res.concat(trimResult);
        i++;
    }

    return res;
}

function trimIndividualLine(line, list) {
    let intersections = findAllIntersectionsOfLineToLineList(line, list);
    console.log(intersections);

    return [line];
}

//BBL
function findAllSelfIntersectionsOfMultiline(multiLine, distanceThreshold) {
    //console.log(multiLine);

    //Does it matter if the multiline has an odd number of points? idk...
    let result = [];
    let currentLine = [];
    for (let i = 0; i < multiLine.length - 1; i++) {
        let p1 = multiLine[i];
        let p2 = multiLine[i + 1];
        let line1 = [p1, p2];

        let intersections = [];

        for (let j = i + 2; j < multiLine.length - 1; j++) {
            //if (j === i) continue;
            let j1 = multiLine[j];
            let j2 = multiLine[j + 1];
            let line2 = [j1, j2];
            const intersection = lineIntersectsLine(line1, line2);

            if (intersection) {
                intersections.push(intersection);
            }
        }

        if (!intersections.length) {
            // currentLine.push(p1);
            // currentLine.push(p2);
            stroke("purple");
            strokeWeight(2);
            line(p1.x, p1.y, p2.x, p2.y);
        } else {
            // if (currentLine.length) result.push(currentLine);
            // currentLine = [];
        }

        intersections.forEach((i) => circle(i.x, i.y, 20));
    }
    //if (currentLine.length) result.push(currentLine);

    return result;
}

function findAllIntersectionsOfLineToLineList(line1, list) {
    const res = [];

    list.forEach((line2) => {
        const int = line1.zIndex < line2.zIndex && lineIntersectsLine(line1, line2);
        if (int) res.push(int);
    });
    return res;
}

/**
 * Returns false if the lines do not intersect, the coordinates of the intersection otherwise.
 * @param line1
 * @param line2
 */
function lineIntersectsLine(line1, line2) {
    // const { x: x1, y: y1 } = line1[0];
    // const { x: x2, y: y2 } = line1[1];
    // const { x: x3, y: y3 } = line2[0];
    // const { x: x4, y: y4 } = line2[1];
    const x1 = line1.p1.x;
    const y1 = line1.p1.y;
    const x2 = line1.p2.x;
    const y2 = line1.p2.y;

    const x3 = line2.p1.x;
    const y3 = line2.p1.y;
    const x4 = line2.p2.x;
    const y4 = line2.p2.y;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectionX = x1 + t * (x2 - x1);
        const intersectionY = y1 + t * (y2 - y1);
        return { x: intersectionX, y: intersectionY };
    }

    return false;
}
