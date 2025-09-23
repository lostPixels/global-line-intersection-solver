import { angle, translatePolygon } from "ga-lib";
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
    let lines = deconstructAllMultilines(multiLines);
    lines = eliminateSegmentsWhichAreTooCloseToOtherLines(lines);
    const result = trimLines(lines, distanceThreshold);

    // lines.forEach((l) => {
    //     stroke(random(360), 80, random(20, 70));
    //     strokeWeight(2);
    //     drawLine([l.p1, l.p2]);
    // });

    result.forEach((l, i) => {
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
                    zIndex: ID, //Todo use this for picking intersection winners.
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

    const firstIntersectionPoint = intersections[0].point;
    const lastIntersectionPoint = intersections.at(-1).point;

    intersections.forEach((int, i) => {
        const startDist = dist(line.p1.x, line.p1.y, firstIntersectionPoint.x, firstIntersectionPoint.y);

        const otherLine = list[int.lineTouchedID];
        let res = calculateNewLineEnding(line, otherLine, int.point, distanceThreshold);
        if (res) {
            if (i === 0 && res.p1) newLine.push(line.p1);
            if (res.p2) newLine.push(res.p2);
            lines.push(newLine);
            newLine = [];
            if (res.p1) newLine.push(res.p1);
        }

        //newLine.push(line.p2);
    });

    if (dist(line.p2.x, line.p2.y, lastIntersectionPoint.x, lastIntersectionPoint.y) >= distanceThreshold) {
        newLine.push(line.p2);
    }

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

    //let res = [point1, point2];
    let res = { p1: false, p2: false };

    const p1LineDist = getShortestDistance(line1.p1, [line2.p1, line2.p2]);
    const p2LineDist = getShortestDistance(line1.p2, [line2.p1, line2.p2]);
    res.p1 = point1;
    res.p2 = point2;
    if (p1LineDist < distanceThreshold) {
        // fill("red");
        // circle(line1.p1.x, line1.p1.y, 20);
        // noFill();
        res.p2 = false;
        //res.p2 = false;
    }

    if (p2LineDist < distanceThreshold) {
        res.p1 = false;
        // fill("red");
        // circle(line1.p2.x, line1.p2.y, 20);
        // noFill();
    }

    // const p1Dist = dist(point1.x, point1.y, centerPoint.x, centerPoint.y);
    // const p2Dist = dist(point2.x, point2.y, centerPoint.x, centerPoint.y);

    // if (p2Dist < p1Dist) {
    //     fill("red");
    //     circle(point1.x, point1.y, 10);

    //     fill("blue");
    //     circle(centerPoint.x, centerPoint.y, 10);

    //     noFill();
    //     fill("purple");
    //     circle(point2.x, point2.y, 15);
    //     noFill();
    // }

    return res;
    //return res.sort((a, b) => dist(a.x, a.y, line1.p2.x, line1.p2.y) - dist(b.x, b.y, line1.p2.x, line1.p2.y));
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
    let res = [];

    list.forEach((line2) => {
        const isSelf = line1.ID === line2.ID;
        const isBelow = line1.zIndex > line2.zIndex;
        //There's probably a faster way to determine this.
        const isSibling = linesSharePoint(line1, line2);
        const int = isBelow && !isSelf && !isSibling && lineIntersectsLine(line1, line2);
        if (int) res.push({ point: int, lineTouchedID: line2.ID });
    });

    res = res.sort((a, b) => dist(a.point.x, a.point.y, line1.p1.x, line1.p1.y) - dist(b.point.x, b.point.y, line1.p1.x, line1.p1.y));

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

const linesSharePoint = (line1, line2) => (line1.p2.x === line2.p1.x && line1.p2.y === line2.p1.y) || (line1.p1.x === line2.p2.x && line1.p1.y === line2.p2.y);

/**
 * Calculates the shortest distance between a point and a line segment.
 *
 * @param {{x: number, y: number}} point - The point, e.g., { x: 10, y: 10 }.
 * @param {Array<{x: number, y: number}>} lineSegment - An array of two points defining the segment, e.g., [{x: 0, y: 0}, {x: 20, y: 0}].
 * @returns {number} The shortest distance between the point and the line segment.
 */
function getShortestDistance(point, lineSegment) {
    const p = point;
    const p1 = lineSegment[0];
    const p2 = lineSegment[1];

    // Calculate the squared length of the line segment.
    // Using the squared length is more efficient as it avoids a square root.
    const lengthSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;

    // Handle the case where the line segment is actually a point.
    if (lengthSq === 0) {
        return Math.sqrt((p.x - p1.x) ** 2 + (p.y - p1.y) ** 2);
    }

    // 't' is the parameter of the projection of the point onto the line.
    // It represents how far along the line segment the closest point is.
    let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / lengthSq;

    // Clamp 't' to the range [0, 1] to handle the three scenarios.
    // If t < 0, the closest point is p1.
    // If t > 1, the closest point is p2.
    // If 0 <= t <= 1, the closest point is on the segment.
    t = Math.max(0, Math.min(1, t));

    // Find the coordinates of the closest point on the line segment.
    const closestPoint = {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
    };

    // Return the distance between the original point and the closest point.
    return Math.sqrt((p.x - closestPoint.x) ** 2 + (p.y - closestPoint.y) ** 2);
}

function eliminateSegmentsWhichAreTooCloseToOtherLines(lines) {
    return lines;
}
