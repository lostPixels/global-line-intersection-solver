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
    multiLines.forEach((ml) => findAllSelfIntersectionsOfMultiline(ml, distanceThreshold));

    return multiLines.map((m) => [m]);
}

function findAllSelfIntersectionsOfMultiline(multiLine, distanceThreshold) {
    //console.log(multiLine);

    //Does it matter if the multiline has an odd number of points? idk...
    for (let i = 0; i < multiLine.length - 1; i++) {
        let p1 = multiLine[i];
        let p2 = multiLine[i + 1];
        let line1 = [p1, p2];

        for (let j = i + 2; j < multiLine.length - 1; j++) {
            //if (j === i) continue;
            let j1 = multiLine[j];
            let j2 = multiLine[j + 1];
            let line2 = [j1, j2];
            const intersection = lineIntersectsLine(line1, line2);
            //console.log(line1, line2);
            console.log(intersection);
            if (intersection) {
                circle(intersection.x, intersection.y, 20);
            }
        }
    }
}

/**
 * Returns false if the lines do not intersect, the coordinates of the intersection otherwise.
 * @param line1
 * @param line2
 */
function lineIntersectsLine(line1, line2) {
    const { x: x1, y: y1 } = line1[0];
    const { x: x2, y: y2 } = line1[1];
    const { x: x3, y: y3 } = line2[0];
    const { x: x4, y: y4 } = line2[1];

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
