class PlomaModel {
    init() {
        if (!this.querySelector("#canvas")) {
            let canvas = this.createElement("canvas");
            canvas.domId = "canvas";
            canvas.classList.add("no-select");

            canvas.setCode("ploma.PlomaCanvasModel");
            canvas.setViewCode("ploma.PlomaCanvasView");
            this.appendChild(canvas);

            let picker = this.createElement();
            picker.domId = "colorPicker";
            picker.classList.add("colorPicker");
            picker.setCode("ploma.ColorPickerModel");
            picker.setViewCode("ploma.ColorPickerView");
            this.appendChild(picker);

            picker.call("ColorPickerModel", "setDrawerId", canvas.id);
        }
        console.log("PlomaModel.init");
    }
}

class ButtonView {
    init() {
        this.addEventListener("pointerdown", "filterOut");
        this.addEventListener("pointermove", "filterOut");
        this.addEventListener("pointerup", "filterOut");
    }

    filterOut(evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
}

class PlomaView {
    init() {
        console.log("PlomaView.init");
    }

    undo() {
        let canvas = this.querySelector("#canvas");
        this.publish(canvas.model.id, "undo", this.viewId);
    }
}

class PlomaCanvasModel {
    init() {
        this.subscribe(this.id, "undo", "undo");
        this.subscribe(this.id, "redo", "redo");

        this.subscribe(this.id, "pointerDown", "pointerDown");
        this.subscribe(this.id, "pointerMove", "pointerMove");
        this.subscribe(this.id, "pointerUp", "pointerUp");

        let PlomaDataClass = this.getLibrary("ploma.PlomaDataModel");

        if (!this._get("data")) {
            let dataModel = PlomaDataClass.create();
            dataModel.setExtent(800, 800);
            this._set("data", dataModel);
        }

        this._set("lastPersistTime", this.now());
        console.log("PlomaCanvasModel.init");
    }

    getData() {
        return this._get("data").data;
    }

    pointerDown(message) {
        let data = this.getData();
        data.beginStroke(message);
        let {x, y, p, viewId} = message;
        this.publish(this.id, "beginStroke", {x, y, p, viewId});
    }

    pointerMove(message) {
        let data = this.getData();
        data.extendStroke(message);
        let {x, y, p, viewId} = message;
        this.publish(this.id, "extendStroke", {x, y, p, viewId});
    }

    pointerUp(message) {
        let data = this.getData();
        data.endStroke(message);
        let {x, y, p, viewId} = message;
        this.publish(this.id, "endStroke", {x, y, p, viewId});
        let now = this.now();
        if (now >= this._get("lastPersistTime") + 30000) {
            this._set("lastPersistTime", now);
            this.savePersistentData();
        }
    }

    undo(viewId) {
        let strokeLists = this.getData().strokeLists;
        let strokes = strokeLists.get(viewId);

        let findLast = () => {
            if (!strokes) {return -1;}
            for (let i = strokes.length - 1; i >= 0; i--) {
                if (strokes[i].done) {return i;}
            }
            return -1;
        };

        let index = findLast();
        if (index >= 0) {
            strokes[index].done = false;
            this.publish(this.id, "drawAll");
        }
    }

    redo(viewId) {
        let strokeLists = this.getData().strokeLists;
        let strokes = strokeLists.get(viewId);

        let find = () => {
            if (!strokes) {return -1;}
            if (strokes.length === 0) {return -1;}
            if (strokes.length === 1) {return strokes[0].done ? -1 : 0;}
            for (let i = strokes.length - 1; i >= 1; i--) {
                if (strokes[i].done) {return -1;}
                if (!strokes[i].done && strokes[i - 1].done) {return i;}
            }
            return 0;
        };

        let index = find();
        if (index >= 0) {
            strokes[index].done = true;
            this.publish(this.id, "drawAll");
        }
    }

    loadPersistentData(data) {
        let top = this.wellKnownModel("modelRoot");
        if (data.version === "1") {
            data = top.parse(data.data);
            this._get("data").setData({
                width: data.width, height: data.height,
                global: data.global,
                totalStrokes: data.global.length});
        } else if (data.version === "2") {
            data = top.parse(data.data);
        }
    }

    savePersistentData() {
        let top = this.wellKnownModel("modelRoot");
        let func = () => {
            let {global, strokeLists, totalStrokes, width, height} = this.getData();
            return {
                version: "2",
                data: top.stringify({
                    global, strokeLists, totalStrokes, width, height
                })
            };
            /*return {
                version: "1",
                data: top.stringify({
                    global: this._get("global"),
                    width: this._get("width"),
                    height: this._get("height")
                })
            };*/
        };
        top.persistSession(func);
    }
}

class PlomaCanvasView {
    init() {
        let ua = window.navigator.userAgent;
        let probablySafari = ua.indexOf("Safari") >= 0 && ua.indexOf("Chrome") === -1;
        if (window.ontouchstart && probablySafari) {
            this.addEventListener("touchstart", "pointerDown");
            this.addEventListener("touchmove", "pointerMove");
            this.addEventListener("touchend", "pointerUp");
        } else {
            this.addEventListener("pointerdown", "pointerDown");
            this.addEventListener("pointermove", "pointerMove");
            this.addEventListener("pointerup", "pointerUp");
        }

        this.subscribe(this.viewId, "synced", "synced");

        this.subscribe(this.model.id, "beginStroke", "beginStroke");
        this.subscribe(this.model.id, "extendStroke", "extendStroke");
        this.subscribe(this.model.id, "endStroke", "endStroke");
        this.subscribe(this.model.id, "drawAll", "drawAll");

        this.subscribe(this.model.id, "colorSelected", "colorSelected");
        this.subscribe(this.model.id, "nibSelected", "nibSelected");

        this.zoom = 1;
        this.ploma = new (this.model.getLibrary("ploma.Ploma"))();

        this.setup();

        console.log("PlomaCanvasView.init");
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

    getData() {
        return this.model.call("PlomaCanvasModel", "getData");
    }

    setup() {
        console.log("setup");
        let w = this.w = this.getData().width;
        let h = this.h = this.getData().height;
        this.canvas = this.dom;
        this.canvas.setAttribute("width", w);
        this.canvas.setAttribute("height", h);
        this.canvas.classList.add("noselect");

        this.ctx = this.canvas.getContext("2d");

        window.onresize = () => {
            let width = this.getData().width;
            let height = this.getData().height;
            this.resizeImage(width, height);
        };
        window.onresize();

        this.drawAll();
    }

    clearCanvas() {
        let w = this.w;
        let h = this.h;
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.fillStyle = this.ploma.paperColor;
        this.ctx.globalAlpha = 1;
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.imageData = this.ctx.getImageData(0, 0, w, h);
        this.imageDataData = this.imageData.data;
        this.s = new Map();
        this.isDrawing = false;
    }

    drawAll() {
        this.clearCanvas();
        let global = this.getData().global;
        global.forEach(stroke => {
            let points = stroke.points;
            let viewId = stroke.viewId;
            let state = this.ensureUser(viewId);
            let m;
            if (stroke.done === false) {return;}

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

        this.ctx.putImageData(this.imageData, 0, 0, 0, 0, this.w, this.h);
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
        if (evt.force > 0) {return evt.force;}

        return 0.5;
    }

    makeEvent(evt) {
        let realEvt;
        if (evt.type.startsWith("touch") && evt.touches) {
            realEvt = evt.touches[0];
        } else {
            realEvt = evt;
        }
        return {
            x: realEvt.offsetX,
            y: realEvt.offsetY,
            p: this.getPressure(realEvt),
            viewId: this.viewId
        };
    }

    pointerDown(evt) {
        this.isDrawing = true;
        let state = this.ensureUser(this.viewId);
        let data = this.makeEvent(evt);
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
        let data = this.makeEvent(evt);
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
        let data = this.makeEvent(evt);
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

    colorSelected(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        let obj = result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;

        let s = this.ensureUser(this.viewId);
        s.color = obj;
    }

    nibSelected(nib) {
        console.log("nib", this.viewId, nib);
        let s = this.ensureUser(this.viewId);
        s.nib = parseFloat(nib);
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
        let canvas = elem.querySelector("#canvas");
        canvas.call("PlomaCanvasModel", "loadPersistentData", persistentData);
    }
}

import {Ploma} from "./ploma.js";
import {PlomaDataModel} from "./plomaData.js";
import {ColorPickerModel, ColorPickerView} from "./colorPicker.js";

export const ploma = {
    functions: [start],
    expanders: [PlomaModel, PlomaView, PlomaCanvasModel, PlomaCanvasView, ButtonView, ColorPickerModel, ColorPickerView],
    classes: [Ploma, PlomaDataModel]
};
