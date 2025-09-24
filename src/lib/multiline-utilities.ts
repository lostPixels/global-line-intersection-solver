import { drawLine } from "../sketch";
import { deconstructAllMultilines } from "./multiline-intersection-solver";

export function viewMultilinesDepth(multilines: any[]) {
    const segments = deconstructAllMultilines(multilines);

    let minDepth = Infinity;
    let maxDepth = -Infinity;

    for (const segment of segments) {
        //console.log(segment);
        const depth = segment.zIndex;
        minDepth = Math.min(minDepth, depth);
        maxDepth = Math.max(maxDepth, depth);
    }

    strokeWeight(5);
    segments.forEach((segment) => {
        const sC = map(segment.zIndex, minDepth, maxDepth, 240, 400) % 360;
        stroke(sC, 90, 60);
        line(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);
    });
    strokeWeight(1);
}
