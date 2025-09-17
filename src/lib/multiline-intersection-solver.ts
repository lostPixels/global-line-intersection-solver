import { angle } from "ga-lib";
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
    const result = trimLines(lines, distanceThreshold);

    // lines.forEach((l) => {
    //     stroke(random(360), 80, random(20, 70));
    //     strokeWeight(2);
    //     drawLine([l.p1, l.p2]);
    // });

    result.forEach((l) => {
        stroke(random(360), 80, random(20, 70));
        strokeWeight(5);
        drawLine(l);
        //drawLine([l.p1, l.p2]);
    });
}

function deconstructAllMultilines(multilines) {
    const res = []; //Consider switching to Map here for resilence.
    let ID = 0;
    multilines.forEach((line, i) => {
        line.forEach((p1, j) => {
            if (j < line.length - 1) {
                const p2 = line[j + 1];
                res.push({
                    p1,
                    p2,
                    ID,
                    origin: i,
                    index: j,
                    zIndex: i + j, //Todo use this for picking intersection winners.
                });
                ID++;
            }
        });
    });
    return res;
}

function trimLines(lines, distanceThreshold) {
    let i = 0;
    const length = lines.length;
    let res = [];

    while (i < length) {
        const list = lines; //lines.filter((_, j) => j !== i);
        const trimResult = trimIndividualLine(lines[i], list, distanceThreshold);
        if (trimResult.length) res = res.concat(trimResult);
        i++;
    }

    return res;
}

function trimIndividualLine(line, list, distanceThreshold) {
    let lines = [];
    let newLine = [];

    let intersections = findAllIntersectionsOfLineToLineList(line, list);
    if (intersections.length === 0) return [[line.p1, line.p2]];

    intersections.forEach((int, i) => {
        if (i === 0) newLine.push(line.p1);

        const otherLine = list[int.lineTouchedID];
        let res = calculateNewLineEnding(line, otherLine, int.point, distanceThreshold);
        newLine.push(res[1]);
        lines.push(newLine);
        newLine = [res[0]];
        //newLine.push(line.p2);
    });
    newLine.push(line.p2);
    if (newLine.length > 0) lines.push(newLine);
    return lines;
}

export function calculateNewLineEnding(line1, line2, centerPoint, distanceThreshold) {
    circle(centerPoint.x, centerPoint.y, 30);

    // --- Step 1: Calculate slopes and the angle between the lines ---
    const slope1 = calculateSlope(line1);
    const slope2 = calculateSlope(line2);

    if (slope1 === slope2) {
        return "Lines are parallel. A unique point cannot be found.";
    }

    const tanTheta = Math.abs((slope2 - slope1) / (1 + slope1 * slope2));
    const theta = Math.atan(tanTheta);

    if (theta === 0) {
        console.log("Lines are parallel.");
        return false;
    }

    // --- Step 2: Calculate how far to travel from the center along line1 ---
    const distFromCenter = distanceThreshold / Math.sin(theta);

    // --- Step 3: Find the coordinates of the two possible ending points ---
    // 3a. Create a direction vector directly from the points of line1.
    const dirVec = {
        x: line1.p2.x - line1.p1.x,
        y: line1.p2.y - line1.p1.y,
    };

    // 3b. Create a unit vector (length of 1) to define the direction.
    const mag = Math.sqrt(dirVec.x ** 2 + dirVec.y ** 2);
    const unitVec = {
        x: dirVec.x / mag,
        y: dirVec.y / mag,
    };

    // 3c. Calculate the final points by moving from the center along the unit vector.
    const point1 = {
        x: centerPoint.x + distFromCenter * unitVec.x,
        y: centerPoint.y + distFromCenter * unitVec.y,
    };

    const point2 = {
        x: centerPoint.x - distFromCenter * unitVec.x,
        y: centerPoint.y - distFromCenter * unitVec.y,
    };

    let results = [point1, point2].sort((a, b) => dist(a.x, a.y, line1.p2.x, line1.p2.y) - dist(b.x, b.y, line1.p2.x, line1.p2.y));
    return results;
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
        const isSelf = line1.ID === line2.ID;
        const isSibling = line1.origin === line2.origin && line2.index - 1 === line1.index;
        const int = !isSelf && !isSibling && line1.zIndex < line2.zIndex && lineIntersectsLine(line1, line2);
        if (int) res.push({ point: int, lineTouchedID: line2.ID });
    });
    return res;
}

/**
 * Returns false if the lines do not intersect, the coordinates of the intersection otherwise.
 * @param line1
 * @param line2
 */
export function lineIntersectsLine(line1, line2) {
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

const calculateSlope = (line) => {
    if (line.p2.x - line.p1.x === 0) {
        return Infinity;
    }
    return (line.p2.y - line.p1.y) / (line.p2.x - line.p1.x);
};
