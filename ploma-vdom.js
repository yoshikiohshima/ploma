class PlomaModel {
    init() {
        this.subscribe(this.id, "undo", "undo");
        this.subscribe(this.id, "redo", "redo");
        this.subscribe(this.id, "pointerDown", "pointerDown");
        this.subscribe(this.id, "pointerMove", "pointerMove");
        this.subscribe(this.id, "pointerUp", "pointerUp");

        if (!this._get("global")) {
            this._set("global", []);
            this._set("strokeLists", new Map());
            this._set("width", 800);
            this._set("height", 800);
        }

        this._set("lastPersistTime", this.now());
        console.log("PlomaModel.init");
    }

    pointerDown(data) {
        let {x, y, p, viewId, color, nib} = data;

        let global = this._get("global");
        let strokeLists = this._get("strokeLists");
        let strokes = strokeLists.get(viewId);
        if (!strokes) {
            strokes = [];
            strokeLists.set(viewId, strokes);
        }

        let stroke = {color, nib, viewId, points: [{x, y, p}]};
        strokes.push(stroke);
        global.push(stroke);
        this.publish(this.id, "beginStroke", {x, y, p, viewId, index: strokes.length - 1});
    }

    pointerMove(data) {
        let {x, y, p, viewId, _color, _nib} = data;

        let strokeLists = this._get("strokeLists");
        let strokes = strokeLists.get(viewId);
        let stroke = strokes[strokes.length - 1];

        stroke.points.push({x, y, p});
        this.publish(this.id, "extendStroke", {x, y, p, viewId, index: strokes.length - 1});
    }

    pointerUp(data) {
        let {x, y, p, viewId, _color, _nib} = data;

        let strokeLists = this._get("strokeLists");
        let strokes = strokeLists.get(viewId);
        let stroke = strokes[strokes.length - 1];

        stroke.points.push({x, y, p});
        this.publish(this.id, "endStroke", {x, y, p, viewId, index: strokes.length - 1});

        let now = this.now();
        if (now >= this._get("lastPersistTime") + 30000) {
            this._set("lastPersistTime", now);
            this.savePersistentData();
        }
    }

    loadPersistentData(data) {
        let top = this.wellKnownModel("modelRoot");
        data = top.parse(data.data);
        this._set("global", data.global);
        this._set("width", data.width);
        this._set("height", data.height);
    }

    savePersistentData() {
        let top = this.wellKnownModel("modelRoot");
        let func = () => {
            return {
                version: "1",
                data: top.stringify({
                    global: this._get("global"),
                    width: this._get("width"),
                    height: this._get("height")
                })
            };
        };
        top.persistSession(func);
    }
}

class PlomaView {
    init() {
        this.addEventListener("pointerdown", "pointerDown");
        this.addEventListener("pointermove", "pointerMove");
        this.addEventListener("pointerup", "pointerUp");

        this.subscribe(this.viewId, "synced", "synced");

        this.subscribe(this.model.id, "beginStroke", "beginStroke");
        this.subscribe(this.model.id, "extendStroke", "extendStroke");
        this.subscribe(this.model.id, "endStroke", "endStroke");
        this.zoom = 1;
        this.ploma = new (this.model.getLibrary("ploma.Ploma"))();

        this.setup();

        console.log("PlomaView.init");
    }

    synced(flag) {
        console.log("synced", flag);
        if (flag) {
            if (!this.canvas) {
                this.setup();
            }
        }
    }

    detach() {
        super.detach();
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
    }

    setup() {
        console.log("setup");
        let w = this.w = this.model._get("width");
        let h = this.h = this.model._get("height");
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", w);
        this.canvas.setAttribute("height", h);
        this.canvas.id = "canvas";
        this.canvas.classList.add("noselect");

        this.ctx = this.canvas.getContext("2d");
        this.dom.appendChild(this.canvas);
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.fillStyle = this.ploma.paperColor;
        this.ctx.globalAlpha = 1;
        this.ctx.fillRect(0, 0, w, h);

        this.s = new Map();

        this.imageData = this.ctx.getImageData(0, 0, w, h);
        this.imageDataData = this.imageData.data;

        this.isDrawing = false;

        window.onresize = () => {
            let width = this.model._get("width");
            let height = this.model._get("height");
            this.resizeImage(width, height);
        };
        window.onresize();

        this.clearCanvas();
        this.drawAll();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.w, this.h);
        this.ctx.fillStyle = this.ploma.paperColor;
        this.ctx.globalAlpha = 1;
        this.ctx.fillRect(0, 0, this.w, this.h);
    }

    drawAll() {
        let global = this.model._get("global");
        global.forEach(stroke => {
            let points = stroke.points;
            let viewId = stroke.viewId;
            let state = this.ensureUser(viewId);
            let m;

            this.ploma.useStateDuring(this.imageDataData, state, () => {
                if (points.length > 2) {
                    let {x, y, p} = points[0];
                    state.color = stroke.color;
                    state.nib = stroke.nib;
                    this.ploma.beginStroke({x, y, p, viewId});
                    for (let i = 1; i < points.length - 1; i++) {
                        m = points[i];
                        this.ploma.extendStroke({x: m.x, y: m.y, p: m.p, viewId});
                    }

                    m = points[points.length - 1];
                    this.ploma.endStroke({x: m.x, y: m.y, p: m.p, viewId});
                }
            });
        });

        this.ctx.putImageData(
            this.imageData,
            0,
            0,
            0,
            0,
            this.w,
            this.h
        );
    }

    newUserEntry() {
        return {
            rawStrokes: [],
            curRawStroke: [],
            curRawSampledStroke: [],
            filteredStrokes: [],
            curFilteredStroke: [],
            textureSampleStep: 0,
            lastControlPoint: null,
            filterWeight: 0.5,
            filterWeightInverse: 1 - 0.5,
            stepOffset: 0,
            stepInterval: 0.3,
            pointCounter: 0,
            color: {r: 25, g: 8, b: 45},
            nib: 1
        };
    }

    ensureUser(viewId) {
        if (!this.s.get(viewId)) {
            let data = this.newUserEntry();
            this.s.set(viewId, data);
        }
        return this.s.get(viewId);
    }

    getPressure(evt) {
        if (evt.pressure > 0) {return evt.pressure;}

        if (evt.width === 1) {
            return 0.5;
        }

        return Math.min(evt.width / 100, 1);
    }

    getData(evt) {
        return {
            x: evt.offsetX,
            y: evt.offsetY,
            p: this.getPressure(evt),
            viewId: this.viewId
        };
    }

    pointerDown(evt) {
        this.isDrawing = true;
        let state = this.ensureUser(this.viewId);
        let data = this.getData(evt);
        data.color = state.color;
        data.nib = state.nib;
        this.publish(this.model.id, "pointerDown", data);
        this.ploma.useStateDuring(this.imageDataData, state, () => {
            return this.ploma.beginStroke(data);
        });
    }

    pointerMove(evt) {
        if (!this.isDrawing) {return;}
        if (!evt.buttons) {return;}
        let state = this.ensureUser(this.viewId);
        let data = this.getData(evt);
        this.publish(this.model.id, "pointerMove", data);
        let patch = this.ploma.useStateDuring(this.imageDataData, state, () => {
            return this.ploma.extendStroke(data);
        });

        if (patch) {
            this.redrawPatch(patch, true);
        }
    }

    pointerUp(evt) {
        let wasDrawing = this.isDrawing;
        this.isDrawing = false;
        if (!wasDrawing) {return;}
        let state = this.ensureUser(this.viewId);
        let data = this.getData(evt);
        this.publish(this.model.id, "pointerUp", data);
        let patch = this.ploma.useStateDuring(this.imageDataData, state, () => {
            return this.ploma.endStroke(data);
        });

        if (patch) {
            this.redrawPatch(patch, true);
        }
    }

    beginStroke(data) {
        let viewId = data.viewId;
        if (this.viewId === viewId) {return;}
        let state = this.ensureUser(viewId);
        this.ploma.useStateDuring(this.imageDataData, state, () => {
            return this.ploma.beginStroke(data);
        });
    }

    extendStroke(data) {
        let viewId = data.viewId;
        if (this.viewId === viewId) {return;}
        let state = this.ensureUser(viewId);
        let patch = this.ploma.useStateDuring(this.imageDataData, state, () => {
            return this.ploma.extendStroke(data);
        });

        if (patch) {
            this.redrawPatch(patch);
        }
    }

    endStroke(data) {
        let viewId = data.viewId;
        if (this.viewId === viewId) {return;}
        let state = this.ensureUser(viewId);
        let patch = this.ploma.useStateDuring(this.imageDataData, state, () => {
            return this.ploma.endStroke(data);
        });

        if (patch) {
            this.redrawPatch(patch);
        }
    }

    redrawPatch(data, force) {
        let {minx, miny, maxx, maxy, viewId} = data;

        if (this.viewId === viewId && !force) {return;}

        this.ctx.putImageData(
            this.imageData,
            0,
            0,
            minx - 5,
            miny - 5,
            (maxx - minx) + 10,
            (maxy - miny) + 10
        );
    }

    resizeImage(width, height) {
        let scale = Math.min(window.innerWidth / width, window.innerHeight / height);
        scale *= this.zoom;
        let marginW = (window.innerWidth - scale * width) / 2;
        let marginH = (window.innerHeight - scale * height) / 2;

        this.canvas.style.removeProperty("display");
        this.canvas.style.setProperty("width", `${width}px`);
        this.canvas.style.setProperty("height", `${height}px`);
        this.canvas.style.setProperty("transform", `translate(${marginW}px, ${marginH}px) scale(${scale})`);
    }
}

function start(parent, _json, persistentData) {
    let elem = parent.createElement();
    elem.setCode("ploma.PlomaModel");
    elem.setViewCode("ploma.PlomaView");
    elem.domId = "ploma";
    elem.classList.add("noselect");

    parent.appendChild(elem);

    if (persistentData) {
        elem.call("PlomaModel", "loadPersistentData", persistentData);
    }
}

import {Ploma} from "./ploma.js";

export const ploma = {
    functions: [start],
    expanders: [PlomaModel, PlomaView],
    classes: [Ploma]
};
