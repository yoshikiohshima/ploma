/*
Ploma - High-fidelity ballpoint pen rendering for tablets with pressure-sensitive styluses
v0.4

Evelyn Eastmond
Dan Amelang
Viewpoints Research Institute

(c) 2014-2015

Croquet Adaptation by Yoshiki Ohshima and Croquet Corporation
(c) 2021

TODO: License
*/

import {createInkTextureImage} from "./util.js";
import {Point} from "./point.js";

let inkTextureSamples;
// let inkTextureImageDataGrays;
let textureSampleLocations;

class TextureReader {
    read() {
        this.textureSampleLocations = [];
        this.textureSamplesLength = 1e5;
        return createInkTextureImage(this).then(() => {
            inkTextureSamples = this.inkTextureSamples;
            // inkTextureImageDataGrays = this.inkTextureImageDataGrays;
            textureSampleLocations = this.textureSampleLocations;
        });
    }
}

export function initTexture() {
    return new TextureReader().read();
}

function map(value, valueMin, valueMax, from, to) {
    let ratio = (value - valueMin) / (valueMax - valueMin);
    return from + ratio * (to - from);
}

export class Ploma {
    constructor() {
        this.sample = 2;
        this.setupCanvas(800, 800);
    }

    setupCanvas(w, h) {
        console.log("setupCanvas");
        this.w = w;
        this.h = h;
        this.w_4 = this.w * 4;
        this.paperColor = 'rgb(240, 235, 219)'; // dark
        this.clear();
    }

    // ------------------------------------------
    // clear
    //
    // Clears the canvas.
    //
    clear() {
    }

    // ------------------------------------------
    // beginStroke
    //
    // Begins a new stroke containing the given
    // point x, y and p (pressure ranging from
    // 0-1) values.
    //
    beginStroke(data) {
        let {x, y, p, _viewId} = data;
        let s = this.state;

        let point = new Point(x, y, p);
        s.pointCounter++;

        s.curRawStroke = [point];
        s.rawStrokes.push(s.curRawStroke);
        s.curFilteredStroke = [point];
        s.filteredStrokes.push(s.curFilteredStroke);
        s.curRawSampledStroke = [point];

        // Get the latest canvas pixels in case
        // they've changed since the last stroke
        // this.$imageData = this.$ctx.getImageData(0, 0, this.w, this.h);
        // this.$imageDataData = this.$imageData.data;

        // Reset step offset for new stroke
        s.stepOffset = s.stepInterval;
    }

    // ------------------------------------------
    // extendStroke
    //
    // Extends the current stroke with the given
    // point and renders the new stroke segment
    // to the canvas.
    //
    extendStroke(data) {
        let {x, y, p, viewId} = data;
        let s = this.state;
        s.pointCounter++;

        let point = new Point(x, y, p);

        s.curRawStroke.push(point);

        //
        // Sampled and filtered
        //
        if (s.pointCounter % this.sample === 0) {

            // Push sampled point
            //if(curRawSampledStroke.last().equals(point)) {
            //return; // ignore dupes TODO: ??
            //}
            s.curRawSampledStroke.push(point);

            // Filter next-to-last input point
            let len = s.curRawSampledStroke.length;
            if (len >= 3) {
                let fpoint = this.calculateFilteredPoint(
                    s.curRawSampledStroke[len - 3],
                    s.curRawSampledStroke[len - 2],
                    s.curRawSampledStroke[len - 1]
                );
                //if(fpoint) {
                // Push sampled, filtered, point
                s.curFilteredStroke.push(fpoint);
                //}
            }

            // Redraw sampled and filtered
            return this.redraw(viewId);
        }
        return null;
    }

    // ------------------------------------------
    // endStroke
    //
    // Ends the current stroke with the given
    // point and renders the final stroke segment
    // to the canvas.
    //
    endStroke(data) {
        let {x, y, p, viewId} = data;
        let s = this.state;
        let point = new Point(x, y, p);

        // Keep the last point as is for now
        // TODO: Try to address the "tapering on mouseup" issue
        s.curRawStroke.push(point);
        s.curRawSampledStroke.push(point);
        s.curFilteredStroke.push(point);

        let result = this.redraw(viewId);
        s.lastControlPoint = null;
        return result;
    }

    /*
    // ------------------------------------------
    // getStrokes
    //
    // Returns an array of all strokes that have
    // been recorded, each stroke itself is an
    // array of point JSON objects.
    //
    // [
    //   [{x, y, p}, {x, y, p}, ...],
    //   [{x, y, p}, {x, y, p}, ...],
    //   ...
    // ]
    //
    getStrokes() {
        let strokes = [];
        for (let i = 0; i < this.rawStrokes.length; i++) {
            let stroke = [];
            strokes.push(stroke);
            for (let j = 0; j < this.rawStrokes[i].length; j++) {
                stroke.push(this.rawStrokes[i][j].asObj());
            }
        }
        return strokes;
    }

    // ------------------------------------------
    // setStrokes
    //
    // Sets the strokes to the input array,
    // expected as:
    //
    // [
    //   [{x, y, p}, {x, y, p}, ...],
    //   [{x, y, p}, {x, y, p}, ...],
    //   ...
    // ]
    //
    setStrokes(strokes) {
        // Clear and set rendering to false
        this.clear();
        //applyRendering = !applyRendering;

        // Redraw all the strokes
        for (let i = 0; i < strokes.length; i++) {
            let stroke = strokes[i];
            this.beginStroke(
                stroke[0].x,
                stroke[0].y,
                stroke[0].p
            );
            for (let j = 1; j < stroke.length - 1; j++) {
                this.extendStroke(
                    stroke[j].x,
                    stroke[j].y,
                    stroke[j].p
                );
            }
            this.endStroke(
                stroke[stroke.length - 1].x,
                stroke[stroke.length - 1].y,
                stroke[stroke.length - 1].p
            );
        }
    }

    // ------------------------------------------
    // curStroke
    //
    // Returns the current stroke of points that
    // have been stored since the last mouse down
    // as an array of point JSON objects.
    //
    // [{x, y, p}, {x, y, p}, ...]
    //

    curStroke(_viewId) {
        let s = this.state;
        let curStroke = [];
        for (let i = 0; i < s.curRawStroke.length; i++) {
            curStroke.push(s.curRawStroke[i].asObj());
        }
        return curStroke;
    }
    */

    // ------------------------------------------
    // setSample
    //
    // Sets the input sampling rate.
    //
    setSample(n) {
        this.sample = n;
    }

    // ------------------------------------------
    // redraw
    //
    // Calls the curve drawing function if there
    // are enough points for a bezier.
    //
    redraw(viewId) {
        // TODO:
        // - Handle single point and double point strokes

        let s = this.state;

        // 3 points needed for a look-ahead bezier
        let len = s.curFilteredStroke.length;
        if (len >= 3) {
            return this.createAndDrawBezier(
                s.curFilteredStroke[len - 3],
                s.curFilteredStroke[len - 2],
                s.curFilteredStroke[len - 1],
                viewId
            );
        }
        return null;
    }

    // ------------------------------------------
    // createAndDrawBezier
    //
    // Draw a look-ahead cubic bezier based on 3
    // input points.
    //
    createAndDrawBezier(pt0, pt1, pt2, viewId) {
        let s = this.state;

        // Endpoints and control points
        let p0 = pt0;
        let p1 = 0.0;
        let p2 = 0.0;
        let p3 = pt1;

        // Value access
        let p0_x = p0.x;
        let p0_y = p0.y;
        let p0_p = p0.p;
        let p3_x = p3.x;
        let p3_y = p3.y;
        let p3_p = p3.p;

        // Calculate p1
        if (!s.lastControlPoint) {
            p1 = new Point(
                p0_x + (p3_x - p0_x) * 0.33,
                p0_y + (p3_y - p0_y) * 0.33,
                p0_p + (p3_p - p0_p) * 0.33
            );
        } else {
            p1 = s.lastControlPoint.getMirroredPt(p0);
        }

        // Calculate p2
        if (pt2) {
            p2 = new Point(
                //p3_x - (((p3_x - p0_x) + (pt2.x - p3_x)) / 6),
                //p3_y - (((p3_y - p0_y) + (pt2.y - p3_y)) / 6),
                //p3_p - (((p3_p - p0_p) + (pt2.p - p3_p)) / 6)
                p3_x - (((p3_x - p0_x) + (pt2.x - p3_x)) * 0.1666),
                p3_y - (((p3_y - p0_y) + (pt2.y - p3_y)) * 0.1666),
                p3_p - (((p3_p - p0_p) + (pt2.p - p3_p)) * 0.1666)
            );
        } else {
            p2 = new Point(
                p0_x + (p3_x - p0_x) * 0.66,
                p0_y + (p3_y - p0_y) * 0.66,
                p0_p + (p3_p - p0_p) * 0.66
            );
        }

        // Set last control point
        s.lastControlPoint = p2;

        // Step along curve and draw step
        let stepPoints = this.calculateStepPoints(p0, p1, p2, p3);
        for (let i = 0; i < stepPoints.length; i++) {
            this.drawStep(this.imageDataData, stepPoints[i]);
        }

        // Calculate redraw bounds
        // TODO:
        // - Math.min = x <= y ? x : y; INLINE
        let p1_x = p1.x;
        let p1_y = p1.y;
        let p2_x = p2.x;
        let p2_y = p2.y;
        let minx = Math.floor(Math.min(p0_x, p1_x, p2_x, p3_x));
        let miny = Math.floor(Math.min(p0_y, p1_y, p2_y, p3_y));
        let maxx = Math.ceil(Math.max(p0_x, p1_x, p2_x, p3_x));
        let maxy = Math.ceil(Math.max(p0_y, p1_y, p2_y, p3_y));

        // Put image using a crude dirty rect
        //elapsed = Date.now() - elapsed;
        //console.log(elapsed);
        /*this.ctx.putImageData(
            this.imageData,
            0,
            0,
            minx - 5,
            miny - 5,
            (maxx - minx) + 10,
            (maxy - miny) + 10
        );
        */

        return {minx, maxx, miny, maxy, viewId};
    }

    // ------------------------------------------
    // calculateStepPoints
    //
    // Calculates even steps along a bezier with
    // control points (p0, p1, p2, p3).
    //
    calculateStepPoints(p0, p1, p2, p3) {
        let s = this.state;
        let stepPoints = [];
        let i = s.stepInterval;

        // Value access
        let p0_x = p0.x;
        let p0_y = p0.y;
        let p0_p = p0.p;

        // Algebraic conveniences, not geometric
        let A_x = p3.x - 3 * p2.x + 3 * p1.x - p0_x;
        let A_y = p3.y - 3 * p2.y + 3 * p1.y - p0_y;
        let A_p = p3.p - 3 * p2.p + 3 * p1.p - p0_p;
        let B_x = 3 * p2.x - 6 * p1.x + 3 * p0_x;
        let B_y = 3 * p2.y - 6 * p1.y + 3 * p0_y;
        let B_p = 3 * p2.p - 6 * p1.p + 3 * p0_p;
        let C_x = 3 * p1.x - 3 * p0_x;
        let C_y = 3 * p1.y - 3 * p0_y;
        let C_p = 3 * p1.p - 3 * p0_p;

        let t = (i - s.stepOffset) / Math.sqrt(C_x * C_x + C_y * C_y);

        while (t <= 1.0) {
            // Point
            let step_x = t * (t * (t * A_x + B_x) + C_x) + p0_x;
            let step_y = t * (t * (t * A_y + B_y) + C_y) + p0_y;
            let step_p = t * (t * (t * A_p + B_p) + C_p) + p0_p;
            stepPoints.push(new Point(
                step_x,
                step_y,
                step_p
            ));

            // Step distance until next one
            let s_x = t * (t * 3 * A_x + 2 * B_x) + C_x; // dx/dt
            let s_y = t * (t * 3 * A_y + 2 * B_y) + C_y; // dy/dt
            let deriv = Math.sqrt(s_x * s_x + s_y * s_y); // s = derivative in 2D space
            let dt = i / deriv; // i = interval / derivative in 2D
            t += dt;
        }

        // TODO: Maybe use a better approximation for distance along the bezier?
        if (stepPoints.length === 0) {// We didn't step at all along this Bezier
            s.stepOffset += p0.getDistance(p3);
        } else {
            s.stepOffset = stepPoints[stepPoints.length - 1].getDistance(p3);
        }

        return stepPoints;
    }

    // ------------------------------------------
    // calculateFilteredPoint
    //
    // Returns a filtered, sanitized version of
    // point p2 between points p1 and p3.
    //
    calculateFilteredPoint(p1, p2, p3) {
        let s = this.state;
        //if (p1 == null || p2 == null || p3 == null)
        //  return null; // Not enough points yet to filter

        let m = p1.getMidPt(p3);

        return new Point(
            s.filterWeight * p2.x + s.filterWeightInverse * m.x,
            s.filterWeight * p2.y + s.filterWeightInverse * m.y,
            s.filterWeight * p2.p + s.filterWeightInverse * m.p
        );
    }

    // ------------------------------------------
    // calculateWidth
    //
    // Calculates a non-linear width offset in
    // the range [-2, 1] based on pressure.
    // and nib selection
    //
    calculateWidth(p, nib) {
        let width = 0.0;

        if (p < 0) { // Possible output from bezier
            width = -3.50;
        }
        if (p < 0.2) {
            width = map(p, 0, 0.2, -3.50, -3.20);
        }
        if ((p >= 0.2) && (p < 0.45)) {
            width = map(p, 0.2, 0.45, -3.20, -2.50);
        }
        if ((p >= 0.45) && (p < 0.8)) {
            width = map(p, 0.45, 0.8, -2.50, -1.70);
        }
        if ((p >= 0.8) && (p < 0.95)) {
            width = map(p, 0.8, 0.95, -1.70, -1.55);
        }
        if ((p >= 0.95) && (p <= 1)) {
            width = map(p, 0.95, 1, -1.55, -1.30);
        }
        if (p > 1) { // Possible output from bezier
            width = -1.30;
        }

        return width * nib;
    }

    // ------------------------------------------
    // drawStep
    //
    // Draws a 5x5 pixel grid at a step point
    // with proper antialiasing and texture.
    //
    drawStep(id, point) {
        let s = this.state;

        /////////////////////
        // PRE-LOOP
        /////////////////////

        let width = 0.0;
        width = this.calculateWidth(point.p, s.nib);

        /////////////////////
        // LOOP
        /////////////////////

        let p_x = 0.0;
        let p_y = 0.0;
        let p_p = 0.0;
        let centerX = 0.0;
        let centerY = 0.0;
        let i = 0;
        let j = 0;
        let left = 0;
        let right = 0;
        let top = 0;
        let bottom = 0;
        let dx = 0.0;
        let dy = 0.0;
        let dist = 0.0;
        // let t = 0.0;
        let a = 0.0;
        let invA = 0.0;
        let idx_0 = 0;
        let idx_1 = 0;
        let idx_2 = 0;
        //let idx_3 = 0;
        let idx_0_i = 0;
        let oldR = 0.0;
        let oldG = 0.0;
        let oldB = 0.0;
        //let oldA = 0.0;
        let newR = 0.0;
        let newG = 0.0;
        let newB = 0.0;
        // let newA = 0.0;

        let penR = s.color.r;
        let penG = s.color.g;
        let penB = s.color.b;

        p_x = point.x;
        p_y = point.y;
        p_p = point.p;
        centerX = Math.round(p_x);
        centerY = Math.round(p_y);
        left = centerX - 2;
        right = centerX + 3;
        top = centerY - 2;
        bottom = centerY + 3;

        // Step around inside the texture before the loop
        //textureSampleStep = (textureSampleStep === textureSampleLocations.length - 1) ? 0 : (textureSampleStep + 1);

        //////////////
        // Horizontal
        //////////////
        for (i = left; i < right; i++) {
            // Distance
            dx = p_x - i;

            // Byte-index
            idx_0_i = i * 4;

            ////////////
            // Vertical
            ////////////
            for (j = top; j < bottom; j++) {

                // Distance
                dy = p_y - j;
                dist = Math.sqrt(dx * dx + dy * dy);

                // Byte-index
                idx_0 = idx_0_i + j * this.w_4;

                // Antialiasing
                //a = 5 * ((0.3 / (dist - width)) - 0.085);
                a = (1.5 / (dist - width)) - 0.425;

                // Spike
                if (dist < width) {
                    a = 1;
                }

                // Clamp alpha
                if (a < 0) a = 0;
                if (a >= 1) a = 1;

                // Get new texture sample offset at center
                s.textureSampleStep++;
                s.textureSampleStep %= textureSampleLocations.length - 1;
                let ts = inkTextureSamples[s.textureSampleStep];

                // Apply texture
                a *= ts;

                // Grain
                let g = map(p_p, 0, 1, 0.8, 0.95);
                let prob = 1 - (p_p * p_p * p_p * p_p * p_p); // 1 - x^4
                g = Math.floor(Math.random() * prob * 2) === 1 ? 0 : g;
                a *= g;

                // Blending vars
                invA = 1 - a;
                idx_1 = idx_0 + 1;
                idx_2 = idx_0 + 2;
                //idx_3 = idx_0 + 3;
                oldR = id[idx_0];
                oldG = id[idx_1];
                oldB = id[idx_2];
                // oldA = id[idx_3] / 255;

                // Transparent vs. opaque background
                // if (oldA === 1) {
                newR = penR * a + oldR * invA;
                newG = penG * a + oldG * invA;
                newB = penB * a + oldB * invA;
                // } else {
                //newA = a + oldA * invA;
                //  newR = (this.penR * a + oldR * oldA * invA) / newA;
                //newG = (this.penG * a + oldG * oldA * invA) / newA;
                // newB = (this.penB * a + oldB * oldA * invA) / newA;
                //newA *= 255;
                // Set new A
                //id[idx_3] = newA;
                // }

                // Set new RGB
                id[idx_0] = newR;
                id[idx_1] = newG;
                id[idx_2] = newB;
                // id[idx_3] = newA;
            }
        }
    }

    useStateDuring(imageDataData, s, fn) {
        this.imageDataData = imageDataData;
        this.state = s;
        return fn();
    }
}
