# VBsp.js

VBsp.js is a minimalistic WebGL renderer for Source Engine maps.

## Features
- Makes it easy to embed 3D previews of Source Engine maps in a website.
- High Performance: Written in C++ and compiled to javascript using emscripten.
- Supports maps for the following popular games, and many more:
  - Half Life 2
  - Team Fortress 2
  - Counter-Stike Source
  - Portal
  - Garry's Mod
- Users are able to navigate the previews using familiar controls.
- Does not require any game assets. All colors in the previews are guessed by checking material names against a lookup table.

For a demo, click [here](http://cogg.rocks/vbsp/).

## Usage

Basic usage is easy, and only requires a few lines of code.
```html
<div id="render" style="width: 800px; height: 600px; display: inline-block;"></div>
<script src="vbsp.js"></script>

<script>
  var map = new VBSP();
  map.ready(function() {
    map.initRenderer(document.getElementById("render"));
    map.loadMap("ctf_2fort.bsp");
  });
</script>
```
1. Create an element to place the renderer in.
2. Include the vbsp.js script.
3. From a script, create a new `VBSP` module.
4. From within a callback passed to `ready()` method of the module:
    1. Initialize the renderer on the element you created earlier.
    2. Tell the renderer to load and render a map.

**Warning:** The `VBSP` module can not be used until it is ready.

**Warning:** Due to the way the module is built, it can not be loaded from the filesystem and must be served from a webserver.

## Optimization

Although the module itself is very fast, downloading maps can take a long time. To speed up the process, many parts of the BSP file can be removed. Only the following lumps are needed by the renderer:

```
Lump Name                 Lump ID

LUMP_ENTITIES             0
LUMP_PLANES               1
LUMP_TEXDATA              2
LUMP_VERTS                3
LUMP_TEXINFO              6
LUMP_FACES                7
LUMP_EDGES                12
LUMP_EDGE_INDEX           13
LUMP_MODELS               14
LUMP_DISPINFO             26
LUMP_DISPVERTS            33
LUMP_TEXDATA_STRING_DATA  43
LUMP_TEXDATA_STRING_TABLE 44
```

While VBsp.js may be improved to take advantage of more lumps in the future, it should still function with only the lumps listed here.

I may release a program that removes lumps uncessesary for rendering in the future.

## Contributing

Pull requests and issues are always welcome, but please remember that this is intended to be a minimalistic renderer.

## Acknowledgements
The Valve developer wiki's [Source BSP File Format](https://developer.valvesoftware.com/wiki/Source_BSP_File_Format) was vital in the creation of this library.

Some of the BSP structures were copied from [bspfile.h](https://github.com/ValveSoftware/source-sdk-2013/blob/master/sp/src/public/bspfile.h) in the Source SDK.
