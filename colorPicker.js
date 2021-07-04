export class ColorPickerModel {
    setDrawerId(id) {
        this._set("drawerId", id);
    }
}

export class ColorPickerView {
    init() {
        this.buttons = document.createElement("div");
        this.buttons.classList.add("button-list");

        [
            ["undo", () => this.publish(this.getScope(), "undo", this.viewId)],
            ["redo", () => this.publish(this.getScope(), "redo", this.viewId)]
        ].forEach(([n, handler]) => {
            let button = document.createElement("div");
            button.classList.add(`doButton`);
            button.classList.add(`${n}Button`);

            let icon = document.createElement("div");
            icon.classList.add(`${n}Icon`);
            button.appendChild(icon);
            button.onclick = handler;
            this.buttons.appendChild(button);
        });

        this.colors = [
            ["#19082D", "Black"],
            ["#D70049", "Red"],
            ["#238600", "Green"],
        ];

        this.palette = document.createElement("div");
        this.palette.classList.add("color-palette");
        this.colors.forEach(pair => {
            let e = document.createElement("div");
            e.classList.add("swatch");
            e.id = pair[1];
            e.setAttribute("color", pair[0]);
            e.style.setProperty("background-color", pair[0]);
            e.onclick = (evt) => this.selectColor(evt.target);
            this.palette.appendChild(e);
        });

        this.thickness = [1, 0.6];

        this.nibs = document.createElement("div");
        this.nibs.classList.add("nibs-palette");
        this.nibs.id = "nibs-palette";
        this.thickness.forEach(n => {
            let e = document.createElement("div");
            e.classList.add("swatch-pen");
            e.setAttribute("nib", n);
            e.style.setProperty("width", `${(1 / n) * 8}px`);
            e.style.setProperty("height", `${(1 / n) * 8}px`);

            let h = document.createElement("div");
            h.classList.add("swatch", "nib-holder");
            h.appendChild(e);
            h.onclick = (evt) => this.selectNib(evt.currentTarget);
            this.nibs.appendChild(h);
        });

        this.dom.appendChild(this.buttons);
        this.dom.appendChild(this.palette);
        this.dom.appendChild(this.nibs);

        this.selectColor(this.palette.childNodes[0]);
        this.selectNib(this.nibs.childNodes[1]);
    }

    selectColor(elem) {
        for (let i = 0; i < this.palette.childNodes.length; i++) {
            let child = this.palette.childNodes[i];
            child.classList.remove("selected");
        }

        /*
          let colorStr = elem.style.getPropertyValue("background-color");
          let result = /rgb\(([0-9]+), ([0-9]+), ([0-9]+)\)/.exec(colorStr);
          if (!result) {return;}
          let hex = (v) => parseFloat(v).toString(16).padStart(2, "0");
          let color = `#${result.slice(1, 4).map(hex).reduce((a, b) => a + b)}`;
        */

        let color = elem.getAttribute("color");

        for (let i = 0; i < this.nibs.childNodes.length; i++) {
            let child = this.nibs.childNodes[i].firstChild;
            child.style.setProperty("background-color", color);
            child.setAttribute("color", color);
        }

        let scope = this.model._get("drawerId") || this.sessionId;
        this.publish(scope, "colorSelected", color);
    }

    selectNib(holder) {
        for (let i = 0; i < this.nibs.childNodes.length; i++) {
            let child = this.nibs.childNodes[i].firstChild;
            child.classList.remove("selected");
        }

        holder.firstChild.classList.add("selected");

        let scope = this.model._get("drawerId") || this.sessionId;
        this.publish(scope, "nibSelected", holder.firstChild.getAttribute("nib"));
    }

    getScope() {
        return this.model._get("drawerId") || this.sessionId;
    }


    togglePicker() {
        this.dom.classList.toggle("picker-hidden");
    }
}
