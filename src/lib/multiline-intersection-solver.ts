import { angle, translatePolygon } from "ga-lib";
import { drawLine } from "../sketch";

interface Point {
    x: number;
    y: number;
}

interface Multiline {
    points: Point[];
}

interface SolverOptions {
    handleSelfProximity?: boolean; // Whether to trim non-adjacent segments within same multiline
    selfProximityMinDistance?: number; // Minimum index distance for self-proximity checks (default: 3)
}
/**
 * Accepts an array of Multi-lines and returns new fragments of those multilines that have intersections removed based on distance.
 * @param multiLines
 * @param distanceThreshold
 * @returns
 */
export default function solveMultiLineIntersections(multiLines: Multiline[], distanceThreshold: number, options: SolverOptions = {}) {
    const { handleSelfProximity = true, selfProximityMinDistance = 3 } = options;
    let lines = deconstructAllMultilines(multiLines);
    // First handle proximity-based trimming for non-intersecting segments
    lines = trimSegmentsByProximity(lines, distanceThreshold, handleSelfProximity, selfProximityMinDistance);
    const result = trimLines(lines, distanceThreshold, handleSelfProximity, selfProximityMinDistance);

    // Reconstruct multilines from segments where possible
    const reconstructed = reconstructMultilines(result);

    // lines.forEach((l) => {
    //     stroke(random(360), 80, random(20, 70));
    //     strokeWeight(2);
    //     drawLine([l.p1, l.p2]);
    // });

    reconstructed.forEach((l, i) => {
        stroke(random(360), 80, random(20, 70));
        strokeWeight(5);
        drawLine(l);
        //drawLine([l.p1, l.p2]);
    });

    return reconstructed;
}

export function deconstructAllMultilines(multilines: any[]) {
    const res: any[] = []; //Consider switching to Map here for resilence.
    let ID = 0;
    multilines.forEach((line, i) => {
        if (line[0].z === undefined) console.warn(`Line ${i} is missing z coordinate`);

        line.forEach((p1, j) => {
            if (j < line.length - 1) {
                const p2 = line[j + 1];
                const z = p1.z ? (p1.z + p2.z) / 2 : 0;
                res.push({
                    p1,
                    p2,
                    ID,
                    origin: i,
                    index: j,
                    zIndex: z, //Todo use this for picking intersection winners.
                });
                ID++;
            }
        });
    });
    return res;
}

function trimLines(lines: any[], distanceThreshold: number, handleSelfProximity: boolean = true, selfProximityMinDistance: number = 3) {
    // First pass: trim all lines
    let i = 0;
    const length = lines.length;
    let res: any[][] = [];

    while (i < length) {
        const list = lines;
        const trimResult = trimIndividualLine(lines[i], list, distanceThreshold, handleSelfProximity, selfProximityMinDistance);
        if (trimResult.length) res = res.concat(trimResult);
        i++;
    }

    // Second pass: filter out tiny segments that might have been created
    // res = res.filter((segment) => {
    //     //if (segment.length < 2) return false;
    //     const totalLength = segment.reduce((acc, p, idx) => {
    //         if (idx === 0) return 0;
    //         return acc + dist(segment[idx - 1].x, segment[idx - 1].y, p.x, p.y);
    //     }, 0);
    //     return totalLength > distanceThreshold * 0.5;
    // });

    return res;
}

function trimIndividualLine(line: any, list: any[], distanceThreshold: number, handleSelfProximity: boolean = true, selfProximityMinDistance: number = 3) {
    let lines: any[][] = [];
    let newLine: any[] = [];

    let intersections: any[] = findAllIntersectionsOfLineToLineList(line, list, handleSelfProximity, selfProximityMinDistance);
    if (intersections.length === 0) return [[line.p1, line.p2]];

    // Group intersections that are too close together and keep only the most relevant one
    let filteredIntersections: any[] = [];
    let groupedIntersections: any[][] = [];
    let currentGroup = [intersections[0]];

    for (let i = 1; i < intersections.length; i++) {
        const prevInt = currentGroup[currentGroup.length - 1];
        const currInt = intersections[i];
        const distance = dist(currInt.point.x, currInt.point.y, prevInt.point.x, prevInt.point.y);

        if (distance < distanceThreshold * 0.75) {
            // Add to current group
            currentGroup.push(currInt);
        } else {
            // Process current group and start a new one
            groupedIntersections.push(currentGroup);
            currentGroup = [currInt];
        }
    }
    groupedIntersections.push(currentGroup);

    // For each group, select the intersection with the lowest zIndex (highest priority)
    groupedIntersections.forEach((group) => {
        if (group.length === 1) {
            filteredIntersections.push(group[0]);
        } else {
            // When multiple intersections are close, pick based on z-index
            // but also consider the average position to avoid jumping
            let selectedInt = group.reduce((best, curr) => {
                if (!best) return curr;
                // Prefer lower zIndex (higher priority)
                if (curr.lineZIndex < best.lineZIndex - 5) return curr;
                if (best.lineZIndex < curr.lineZIndex - 5) return best;
                // If similar zIndex, prefer the one closer to line start
                const currDist = dist(curr.point.x, curr.point.y, line.p1.x, line.p1.y);
                const bestDist = dist(best.point.x, best.point.y, line.p1.x, line.p1.y);
                return currDist < bestDist ? curr : best;
            }, null);

            // Use average position for very close intersections
            if (group.length > 2) {
                const avgX = group.reduce((sum, int) => sum + int.point.x, 0) / group.length;
                const avgY = group.reduce((sum, int) => sum + int.point.y, 0) / group.length;
                selectedInt.point = { x: avgX, y: avgY };
            }

            filteredIntersections.push(selectedInt);
        }
    });

    intersections = filteredIntersections;
    if (intersections.length === 0) return [[line.p1, line.p2]];

    const firstIntersectionPoint = intersections[0].point;
    const lastIntersectionPoint = intersections.at(-1).point;

    // Track current position along the line
    let currentPos = 0; // 0 = start, will track progress along line
    const lineLength = dist(line.p1.x, line.p1.y, line.p2.x, line.p2.y);

    // Check if start point is far enough from first intersection
    const startDist = dist(line.p1.x, line.p1.y, firstIntersectionPoint.x, firstIntersectionPoint.y);
    if (startDist >= distanceThreshold) {
        newLine.push(line.p1);
    }

    intersections.forEach((int, i) => {
        const otherLine = list[int.lineTouchedID];
        let res = calculateNewLineEnding(line, otherLine, int.point, distanceThreshold);

        if (res) {
            // Determine if we should add the segment before the intersection
            const shouldAddBefore = res.p2 && (newLine.length > 0 || (i === 0 && dist(line.p1.x, line.p1.y, res.p2.x, res.p2.y) >= distanceThreshold));

            if (shouldAddBefore) {
                newLine.push(res.p2);
                if (newLine.length > 1) {
                    lines.push([...newLine]);
                }
                newLine = [];
            }

            // Start new segment after intersection if appropriate
            if (res.p1) {
                let canAddP1 = true;

                // Check distance to next intersection
                if (i < intersections.length - 1) {
                    const nextInt = intersections[i + 1];
                    const distToNext = dist(res.p1.x, res.p1.y, nextInt.point.x, nextInt.point.y);
                    canAddP1 = distToNext >= distanceThreshold;
                }

                // Also check if we're too close to the end
                const distToEnd = dist(res.p1.x, res.p1.y, line.p2.x, line.p2.y);
                if (distToEnd < distanceThreshold && i === intersections.length - 1) {
                    canAddP1 = false;
                }

                if (canAddP1) {
                    newLine = [res.p1];
                } else {
                    newLine = [];
                }
            } else {
                // If no p1, clear the new line
                newLine = [];
            }
        }
    });

    // Handle the segment after the last intersection
    if (newLine.length > 0 && dist(line.p2.x, line.p2.y, lastIntersectionPoint.x, lastIntersectionPoint.y) >= distanceThreshold) {
        newLine.push(line.p2);
    }

    if (newLine.length > 1) {
        lines.push(newLine);
    }

    return lines;
}

export function calculateNewLineEnding(line1: any, line2: any, centerPoint: any, distanceThreshold: number) {
    //circle(centerPoint.x, centerPoint.y, distanceThreshold * 2);

    // --- Step 1: Calculate slopes and the angle between the lines ---
    const slope1 = calculateSlope(line1);
    const slope2 = calculateSlope(line2);

    if (slope1 === slope2) {
        return false;
    }

    const tanTheta = Math.abs((slope2 - slope1) / (1 + slope1 * slope2));
    const theta = Math.atan(tanTheta);

    if (theta < 0.15) {
        // Lines are nearly parallel - use a minimum angle threshold
        // For nearly parallel lines, we need different logic
        return false;
    }

    // --- Step 2: Calculate how far to travel from the center along line1 ---
    const distFromCenter = Math.min(distanceThreshold / Math.sin(theta), distanceThreshold * 3);

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
    let res: { p1: any; p2: any } = { p1: false, p2: false };

    const p1LineDist = getShortestDistance(line1.p1, [line2.p1, line2.p2]);
    const p2LineDist = getShortestDistance(line1.p2, [line2.p1, line2.p2]);

    // Determine which points to keep based on their positions relative to the line segment
    const p1ToCenter = dist(line1.p1.x, line1.p1.y, centerPoint.x, centerPoint.y);
    const p2ToCenter = dist(line1.p2.x, line1.p2.y, centerPoint.x, centerPoint.y);
    const point1ToCenter = dist(point1.x, point1.y, centerPoint.x, centerPoint.y);
    const point2ToCenter = dist(point2.x, point2.y, centerPoint.x, centerPoint.y);

    // Check if points are on the line segment (between p1 and p2)
    const lineLength = dist(line1.p1.x, line1.p1.y, line1.p2.x, line1.p2.y);
    const point1ToP1 = dist(point1.x, point1.y, line1.p1.x, line1.p1.y);
    const point1ToP2 = dist(point1.x, point1.y, line1.p2.x, line1.p2.y);
    const point2ToP1 = dist(point2.x, point2.y, line1.p1.x, line1.p1.y);
    const point2ToP2 = dist(point2.x, point2.y, line1.p2.x, line1.p2.y);

    const point1OnSegment = Math.abs(point1ToP1 + point1ToP2 - lineLength) < 0.1;
    const point2OnSegment = Math.abs(point2ToP1 + point2ToP2 - lineLength) < 0.1;

    res.p1 = point1OnSegment ? point1 : false;
    res.p2 = point2OnSegment ? point2 : false;

    // Additional checks for endpoint proximity
    if (p1LineDist < distanceThreshold * 0.8) {
        if (p1ToCenter < point2ToCenter) {
            res.p2 = false;
        }
    }

    if (p2LineDist < distanceThreshold * 0.8) {
        if (p2ToCenter < point1ToCenter) {
            res.p1 = false;
        }
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
function findAllSelfIntersectionsOfMultiline(multiLine: any[], distanceThreshold: number) {
    //console.log(multiLine);

    //Does it matter if the multiline has an odd number of points? idk...
    let result: any[] = [];
    let currentLine: any[] = [];
    for (let i = 0; i < multiLine.length - 1; i++) {
        let p1 = multiLine[i];
        let p2 = multiLine[i + 1];
        let line1 = [p1, p2];

        let intersections: any[] = [];

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

function findAllIntersectionsOfLineToLineList(line1: any, list: any[], handleSelfProximity: boolean = true, selfProximityMinDistance: number = 3) {
    let res: any[] = [];

    list.forEach((line2, index) => {
        const isSelf = line1.ID === line2.ID;
        const isSameOrigin = line1.origin === line2.origin;
        const isBelow = line1.zIndex > line2.zIndex;
        //There's probably a faster way to determine this.
        const isSibling = linesSharePoint(line1, line2);

        // Handle same-origin segments intelligently
        if (isSameOrigin) {
            if (!handleSelfProximity) {
                // If self-proximity handling is disabled, skip all same-origin segments
                return;
            }

            // Calculate segment distance in the multiline
            const indexDistance = Math.abs(line1.index - line2.index);

            // Skip adjacent segments to preserve shape continuity
            // This preserves circles and smooth curves
            if (indexDistance <= selfProximityMinDistance) {
                return;
            }

            // For far-apart segments in the same multiline, check if they actually intersect
            // This handles self-intersecting shapes like figure-8s
            if (!lineIntersectsLine(line1, line2)) {
                return;
            }

            // At this point we have a legitimate self-intersection between non-adjacent segments
        }

        const int = isBelow && !isSelf && !isSibling && lineIntersectsLine(line1, line2);
        if (int) {
            res.push({
                point: int,
                lineTouchedID: index,
                lineZIndex: line2.zIndex,
                lineOrigin: line2.origin,
            });
        }
    });

    res = res.sort((a, b) => dist(a.point.x, a.point.y, line1.p1.x, line1.p1.y) - dist(b.point.x, b.point.y, line1.p1.x, line1.p1.y));

    return res;
}

/**
 * Returns false if the lines do not intersect, the coordinates of the intersection otherwise.
 * @param line1
 * @param line2
 */
export function lineIntersectsLine(line1: any, line2: any) {
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

const calculateSlope = (line: any) => {
    if (line.p2.x - line.p1.x === 0) {
        return Infinity;
    }
    return (line.p2.y - line.p1.y) / (line.p2.x - line.p1.x);
};

const linesSharePoint = (line1: any, line2: any) => {
    const tolerance = 0.001; // Small tolerance for floating point comparison
    return (
        (Math.abs(line1.p2.x - line2.p1.x) < tolerance && Math.abs(line1.p2.y - line2.p1.y) < tolerance) ||
        (Math.abs(line1.p1.x - line2.p2.x) < tolerance && Math.abs(line1.p1.y - line2.p2.y) < tolerance) ||
        (Math.abs(line1.p1.x - line2.p1.x) < tolerance && Math.abs(line1.p1.y - line2.p1.y) < tolerance) ||
        (Math.abs(line1.p2.x - line2.p2.x) < tolerance && Math.abs(line1.p2.y - line2.p2.y) < tolerance)
    );
};

/**
 * Calculates the shortest distance between a point and a line segment.
 *
 * @param {{x: number, y: number}} point - The point, e.g., { x: 10, y: 10 }.
 * @param {Array<{x: number, y: number}>} lineSegment - An array of two points defining the segment, e.g., [{x: 0, y: 0}, {x: 20, y: 0}].
 * @returns {number} The shortest distance between the point and the line segment.
 */
function getShortestDistance(point: any, lineSegment: any[]) {
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

/**
 * Trims segments based on proximity to other lines, even without intersections.
 * This handles cases where small segments are entirely within the distance threshold
 * of another line, or where segments run parallel and close to each other.
 */
function trimSegmentsByProximity(lines: any[], distanceThreshold: number, handleSelfProximity: boolean = true, selfProximityMinDistance: number = 3): any[] {
    const processedLines: any[] = [];

    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];

        // Track if this line should be kept
        let shouldKeep = true;
        let segmentsToAdd: any[] = [currentLine];

        // Check against all other lines
        for (let j = 0; j < lines.length; j++) {
            if (i === j) continue;
            const otherLine = lines[j];

            // Handle segments from the same original multiline intelligently
            if (currentLine.origin === otherLine.origin) {
                if (!handleSelfProximity) {
                    // If self-proximity handling is disabled, skip all same-origin segments
                    continue;
                }

                // Calculate index distance in the multiline sequence
                const indexDistance = Math.abs(currentLine.index - otherLine.index);
                const totalSegments = lines.filter((l) => l.origin === currentLine.origin).length;

                // For closed shapes (like circles), also check wrap-around distance
                // But only if it's actually a closed shape (last segment connects to first)
                let effectiveDistance = indexDistance;
                const isClosedShape = totalSegments > 2 && indexDistance > totalSegments / 2;
                if (isClosedShape) {
                    const wrapDistance = totalSegments - indexDistance;
                    effectiveDistance = Math.min(indexDistance, wrapDistance);
                }

                // Skip if segments are adjacent or very close in sequence
                // This preserves the continuity of shapes while still handling self-overlaps
                if (effectiveDistance <= selfProximityMinDistance) {
                    continue;
                }

                // For non-adjacent segments from the same multiline, only process if they're
                // actually close in space (do a quick distance check)
                const quickDist = Math.min(
                    dist(currentLine.p1.x, currentLine.p1.y, otherLine.p1.x, otherLine.p1.y),
                    dist(currentLine.p1.x, currentLine.p1.y, otherLine.p2.x, otherLine.p2.y),
                    dist(currentLine.p2.x, currentLine.p2.y, otherLine.p1.x, otherLine.p1.y),
                    dist(currentLine.p2.x, currentLine.p2.y, otherLine.p2.x, otherLine.p2.y),
                );

                // If segments are far apart in space, skip the proximity check
                if (quickDist > distanceThreshold * 2) {
                    continue;
                }

                // At this point, we have non-adjacent segments from the same multiline
                // that are close in space - these should be subject to proximity trimming
            }

            // Only check against higher priority lines (lower zIndex)
            if (otherLine.zIndex >= currentLine.zIndex) {
                continue;
            }

            // Skip if lines share a point (they're connected)
            if (linesSharePoint(currentLine, otherLine)) continue;

            // Process each remaining segment
            let newSegments: any[] = [];
            for (const segment of segmentsToAdd) {
                const currentSegmentLength = dist(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);

                // If the segment is small, check if it's entirely within threshold
                if (currentSegmentLength < distanceThreshold * 1.5) {
                    const p1Dist = getShortestDistance(segment.p1, [otherLine.p1, otherLine.p2]);
                    const p2Dist = getShortestDistance(segment.p2, [otherLine.p1, otherLine.p2]);
                    const midPoint = {
                        x: (segment.p1.x + segment.p2.x) / 2,
                        y: (segment.p1.y + segment.p2.y) / 2,
                    };
                    const midDist = getShortestDistance(midPoint, [otherLine.p1, otherLine.p2]);

                    // Only remove if ALL points are within threshold
                    // For same-origin segments, be stricter to avoid removing parts of the shape
                    const threshold = currentLine.origin === otherLine.origin ? distanceThreshold * 0.8 : distanceThreshold;
                    const shouldRemove = p1Dist < threshold && p2Dist < threshold && midDist < threshold;
                    if (!shouldRemove) {
                        newSegments.push({
                            ...segment,
                            origin: currentLine.origin,
                            index: currentLine.index,
                            zIndex: currentLine.zIndex,
                            ID: currentLine.ID,
                        });
                    }
                } else {
                    // For longer segments, check if they need to be split or trimmed
                    const trimmedSegments = trimSegmentByProximityToLine(segment, otherLine, distanceThreshold);
                    if (trimmedSegments && trimmedSegments.length > 0) {
                        for (const trimmed of trimmedSegments) {
                            newSegments.push({
                                ...trimmed,
                                origin: currentLine.origin,
                                index: currentLine.index,
                                zIndex: currentLine.zIndex,
                                ID: currentLine.ID,
                            });
                        }
                    }
                }
            }
            segmentsToAdd = newSegments;

            // If no segments left, mark as not to keep
            if (segmentsToAdd.length === 0) {
                shouldKeep = false;
                break;
            }
        }

        // Add all resulting segments
        if (shouldKeep) {
            for (const segment of segmentsToAdd) {
                // Only add segments that have sufficient length - use a very small threshold to preserve most segments
                const len = dist(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);
                if (len > 1) {
                    // Changed from distanceThreshold * 0.3 to just 1 pixel
                    processedLines.push({
                        ...currentLine,
                        p1: segment.p1,
                        p2: segment.p2,
                    });
                }
            }
        }
    }

    return processedLines;
}

/**
 * Trims a single segment based on its proximity to another line.
 * Returns null if the entire segment should be removed, the original segment if no trimming needed,
 * or a new trimmed segment.
 */
function trimSegmentByProximityToLine(segment: any, otherLine: any, distanceThreshold: number): any[] {
    // Sample multiple points along the segment to check proximity
    const segmentLength = dist(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);
    const numSamples = Math.max(10, Math.ceil(segmentLength / (distanceThreshold * 0.5)));
    const samples: any[] = [];

    for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const samplePoint = {
            x: segment.p1.x + t * (segment.p2.x - segment.p1.x),
            y: segment.p1.y + t * (segment.p2.y - segment.p1.y),
        };
        const distance = getShortestDistance(samplePoint, [otherLine.p1, otherLine.p2]);
        samples.push({ point: samplePoint, distance, t });
    }

    // Find regions that are outside the threshold
    const validRegions: any[] = [];
    let currentRegionStart = -1;
    let previousWasValid = false;

    for (let i = 0; i < samples.length; i++) {
        const isValid = samples[i].distance >= distanceThreshold;

        if (isValid && !previousWasValid) {
            // Start of a valid region
            currentRegionStart = i;
        } else if (!isValid && previousWasValid && currentRegionStart >= 0) {
            // End of a valid region
            validRegions.push({
                startIdx: currentRegionStart,
                endIdx: i - 1,
                startT: samples[currentRegionStart].t,
                endT: samples[i - 1].t,
            });
            currentRegionStart = -1;
        }

        previousWasValid = isValid;
    }

    // Handle case where segment ends in a valid region
    if (currentRegionStart >= 0) {
        validRegions.push({
            startIdx: currentRegionStart,
            endIdx: samples.length - 1,
            startT: samples[currentRegionStart].t,
            endT: samples[samples.length - 1].t,
        });
    }

    // If no valid regions, return empty array
    if (validRegions.length === 0) {
        return [];
    }

    // Convert valid regions to segments
    const resultSegments: any[] = [];
    for (const region of validRegions) {
        // Add some buffer to smooth transitions
        const bufferT = (distanceThreshold * 0.2) / segmentLength;
        const startT = Math.max(0, region.startT - bufferT);
        const endT = Math.min(1, region.endT + bufferT);

        // Only add if the resulting segment is long enough - use smaller threshold
        const regionLength = (endT - startT) * segmentLength;
        if (regionLength > 1) {
            // Changed from distanceThreshold * 0.3 to just 1 pixel
            resultSegments.push({
                ...segment,
                p1: {
                    x: segment.p1.x + startT * (segment.p2.x - segment.p1.x),
                    y: segment.p1.y + startT * (segment.p2.y - segment.p1.y),
                },
                p2: {
                    x: segment.p1.x + endT * (segment.p2.x - segment.p1.x),
                    y: segment.p1.y + endT * (segment.p2.y - segment.p1.y),
                },
            });
        }
    }

    return resultSegments;
}

/**
 * Reconstructs multilines from processed segments by connecting segments that share endpoints
 */
function reconstructMultilines(segments: any[][]): any[][] {
    if (!segments || segments.length === 0) return [];

    const result: any[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;

        const currentLine = [...segments[i]];
        used.add(i);

        // Try to connect with other segments
        let foundConnection = true;
        while (foundConnection) {
            foundConnection = false;

            for (let j = 0; j < segments.length; j++) {
                if (used.has(j)) continue;

                const lastPoint = currentLine[currentLine.length - 1];
                const firstPoint = segments[j][0];

                // Check if segments connect (with small tolerance for floating point)
                const dist = Math.sqrt((lastPoint.x - firstPoint.x) ** 2 + (lastPoint.y - firstPoint.y) ** 2);
                if (dist < 1) {
                    // Segments connect, add to current line
                    currentLine.push(...segments[j].slice(1)); // Skip the first point to avoid duplication
                    used.add(j);
                    foundConnection = true;
                    break;
                }
            }
        }

        result.push(currentLine);
    }

    return result;
}

function eliminateSegmentsWhichAreTooCloseToOtherLines(lines: any[]) {
    // Filter out segments that are too small or completely within the threshold distance of other lines
    const minSegmentLength = 5; // Minimum length for a segment to be kept

    return lines.filter((line) => {
        // Check if segment is too short
        const segmentLength = dist(line.p1.x, line.p1.y, line.p2.x, line.p2.y);
        if (segmentLength < minSegmentLength) {
            return false;
        }

        // Check if this segment is too close to lines with higher priority (lower zIndex)
        for (let otherLine of lines) {
            if (otherLine.ID === line.ID) continue;
            if (otherLine.zIndex >= line.zIndex) continue; // Only check higher priority lines

            // Check if both endpoints are very close to the other line
            const p1Dist = getShortestDistance(line.p1, [otherLine.p1, otherLine.p2]);
            const p2Dist = getShortestDistance(line.p2, [otherLine.p1, otherLine.p2]);

            // If both endpoints are within a small threshold of another line, filter this segment out
            if (p1Dist < 10 && p2Dist < 10) {
                return false;
            }
        }

        return true;
    });
}
