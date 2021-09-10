# Ploma with Croquet Real-Time Collaboration

# Demo

Open [this link](http://croquet.io/ploma). When the URL gets the parameter `?q=...`, copy the the entire URL and open it in a new tab or send it to your friends to draw together.

<p align="center">
  <img src="https://gist.githubusercontent.com/yoshikiohshima/7ac8ed8f2465e03e10826ab0916b6802/raw/9ee59e47bded4801961c8d606cabc934be83fbd2/totoro.png" width="400"/>
</p>


# What is it?

[Ploma](https://github.com/evhan55/ploma) by Evelyn Eastmond and Dan Amelang is a sketching application with high-fidelity ballpoint pen rendering for pressure sensitive tables.

[Croquet](https://github.com/croquet) provides a library and frameworks to create real-time collaborative apps.

By combining these two, this application allows multiple users collaboratively draw in real time.

# Code

`ploma.js` is based on the orignal `ploma.js` but reorganized so that another program can use the algorithm. The class effectively contains no state but pure algorithm. The data structure is expected to be passed in with the `useStateDuring` method.

Wacom Tablet support is dropped. However, the pressure value is obtained via the standard PointerEvents. On iPad, the width of the touch is used to emulate the pressure; if you draw with the wider part of your finger, you get thicker lines. (One might consider reviving the Wacom Tablet plugin support, or integrate a library such as pressure.js.)

`ploma-vdom.js` contains the Croquet bindings. It uses the [Croquet Virtual DOM framework](https://github.com/croquet/virtual-dom).

`croquet-virtual-dom.js` is minified Croquet Virtual Framework. (see its repo if you would like to reproduce it from source.)

# Running Locally

First, obtrain your own Cqouet API Key from [Croquet](https://croquet.io/keys). Paste a key into the `<paste your key here>` in index.html.

You can run a local server (`server.js` or `server.py`).  Again, open `localhost:8000/index.html` in one tab, and then copy the entire URL with `q=..` to another tab.


# To Do

All past stroke data is stored in a data structure. We need to flatten old strokes that would not be undone into a bitmap, and only keep recent strokes for undo.
