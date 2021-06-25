import {M} from "./framework.js";

// for debugging purposes to be able to run the app from unsecure domain with the isLocal flag.

export class PlomaData {
    constructor(width, height) {
        this.global = [];
        this.strokeLists = new Map();
        this.totalStrokes = 0;
        this.width = width;
        this.height = height;
        this.bitmap = new Uint8Array(width * height * 4);
    }

    beginStroke(data) {
        let {x, y, p, viewId, color, nib} = data;
        let global = this.global;
        let strokeLists = this.strokeLists;
        let strokes = strokeLists.get(viewId);
        if (!strokes) {
            strokes = [];
            strokeLists.set(viewId, strokes);
        }

        let stroke = {color, nib, viewId, done: true, points: [{x, y, p}]};
        strokes.push(stroke);
        global.push(stroke);
    }

    extendStroke(data) {
        let {x, y, p, viewId, _color, _nib} = data;
        let strokeLists = this.strokeLists;
        let strokes = strokeLists.get(viewId);
        let stroke = strokes[strokes.length - 1];
        stroke.points.push({x, y, p});
    }

    endStroke(data) {
        let {x, y, p, viewId, _color, _nib} = data;
        let strokeLists = this.strokeLists;
        let strokes = strokeLists.get(viewId);
        let stroke = strokes[strokes.length - 1];
        stroke.points.push({x, y, p});
        this.totalStrokes++;
        if (this.global.length > 1500) {
            console.log("global.length = ", this.global.length);
        }
    }

    static read(obj) {
        let d = new PlomaData(obj.width, obj.height);
        d.global = obj.global;
        d.strokeLists = obj.strokeLists;
        d.totalStrokes = obj.totalStrokes;
        return d;
    }

    static write(obj) {
        return {
            width: obj.width, height: obj.height,
            global: obj.global, strokeLists: obj.strokeLists,
            totalStrokes: obj.totalStrokes
        };
    }
}

export class PlomaDataModel extends M {
    setExtent(width, height) {
        this.data = new PlomaData(width, height);
    }

    setData(obj) {
        this.data = PlomaData.read(obj);
    }

    static types() {
        return {
            PlomaData: {
                cls: PlomaData,
                write: PlomaData.write,
                read: PlomaData.read
            }
        };
    }
}

PlomaDataModel.register("PlomaDataModel");
