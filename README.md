# Ploma with Croquet Real-Time Collaboration

# Launch demo

Open this linke[(http://croquet.io/ploma)], and when the URL gets the parameter `q=...`, copy the the entire URL and open it in a new tab, or send it to your friends to draw together.

# What it is?

[Ploma](https://github.com/evhan55/ploma) by Evelyn Eastmond and Dan Amelang is a sketching application with high-fidelity ballpoint pen rendering for pressure sensitive tables.

[Croquet](https://github.com/croquet) provides an SDK and frameworks to create real-time collaborative apps.

By combining these two, this application allows multiple users collaboratively draw in real time.

# Code

`ploma.js` is based on the orignal `ploma.js` but reorganized so that another program can use the algorithm. The class effectively contains no state but pure algorithm. The data structure is expected to be passed in with the `useStateDuring` method.

Wacom Tablet support is dropped. However, the pressure value is obtained via the standard PointerEvents. On iPad, the width of the touch is used to emulate the pressure; if you draw with the wider part of your finger, you get thiker lines.

`ploma-vdom.js` contains the Croquet bindings. It uses the [Croquet Virtual DOM framework](https://github.com/croquet/virtual-dom).

`framework.js` is the minified version of the Croquet Virtual Framework.

# Running Locally

You can run a local server (`server.js` or `server.py`).  Again, open `localhost:8000/index.html` in one tab, and then copy the entire URL with `q=..` to another tab.

# To Do

All past stroke data is stored in the data structure. We need to flatten old strokes that would not be undone into a bitmap, and only keep recent strokes for undo.
