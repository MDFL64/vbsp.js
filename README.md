# VBsp.js

VBsp.js is a minimalistic WebGL renderer for Source Engine maps.

For a demo, click [here](http://cogg.rocks/vbsp/).

## Features
- Makes it easy to embed 3D previews of Source Engine maps in a website.
- High Performance: Written in C++ and compiled to javascript using [emscripten](https://kripken.github.io/emscripten-site/).
- Supports maps for many popular games, including the following:
  - Half Life 2
  - Team Fortress 2
  - Counter-Strike Source
  - Portal
  - Garry's Mod
- Users are able to navigate the previews using familiar controls.
- Does not require any game assets. All colors in the previews are guessed by checking material names against a lookup table.

## Usage

Basic usage is easy, and only requires a few lines of code.

1. Make sure both vbsp.js and vbsp.js.mem are available on your server. **Warning:** Due to the way the module is loaded, it can not be tested locally and must be served by a webserver.
2. Use or edit the following code:
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
- **Warning:** The `VBSP` module can not be used until it is ready.
- Use `VBSP.initRenderer(element)` to set up the renderer and place it in a DOM element.
- Use `VBSP.loadMap(url)` to load a map from a URL.
- Use `VBSP.setCam(x,y,z,pitch,yaw)` to control the position and angle of the camera. Both pitch and yaw are measured in degrees.

## Planned Features
- Provide a minified build and a webassembly build.
- Support more variants of the BSP file format.
- Generate a much larger and more accurate lookup table of material colors.
- Add sky materials to color lookup.
- Add support for simple lighting.

## Contributing

Pull requests and issues are always welcome, but please remember that this is intended to be a minimalistic renderer. A change that improves color selection logic would be welcome. A change that implements loading of other Source Engine assets might not be accepted.

Read the section below for more information on editing the source.

## Building and Modifying the Code

To build the module, install [emscripten](https://kripken.github.io/emscripten-site/) and run build.bat.

Here is a short overview of the project's structure:
- [main.cpp](/src/main.cpp) contains the entire C++ portion of the code, including the BSP parser and OpenGL renderer.
- [library.js](/src/library.js) contains some library functions written in javascript that are used by the C++ portion.
- [post.js](/src/post.js) contains wrappers around some C++ functions that make them easier to use. It is also responsible for the color guessing logic.
- [kvparse.js](/src/kvparse.js) contains a parser for Valve's [KeyValues](https://developer.valvesoftware.com/wiki/KeyValues) format, which is used to parse the entity lump in the BSP file.

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

While VBsp.js may be improved to take advantage of more lumps in the future, it should still function with only the lumps listed above.

Unfortunately, removing lumps requires parsing and rebuilding the BSP file, but I may release a program that removes lumps unnecessary for rendering in the future.

## Acknowledgements
The Valve developer wiki's [Source BSP File Format](https://developer.valvesoftware.com/wiki/Source_BSP_File_Format) article was vital to the creation of this library.

Some of the BSP structures were copied from [bspfile.h](https://github.com/ValveSoftware/source-sdk-2013/blob/master/sp/src/public/bspfile.h) in the Source SDK.

The [OpenGL Mathematics](https://glm.g-truc.net/0.9.8/index.html) library was used to make dealing with OpenGL less painful.
