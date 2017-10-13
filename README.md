# VBsp.js

VBsp.js is a minimalistic WebGL renderer for Source Engine maps.

## Features
- Makes it easy to embed 3D previews of Source Engine maps in a website.
- Supports maps for the following popular games, and many more:
  - Half Life 2
  - Team Fortress 2
  - Counter-Stike Source
  - Portal
  - Garry's Mod
- Users are able to navigate the previews using familiar controls.
- Does not require any game assets. All colors in the previews are guessed by checking material names against a lookup table.

For a demo, click [here](http://cogg.rocks/vbsp/).

==========================================================================

Source engine maps in your browser!

Minimalistic as possible -- Only renders the BSP with flat shading. No models or textures are loaded. Colors are guessed based on texture names.

Horribly coded, but fairly efficient. Built with emscripten.

If you want to test locally you're gonna have to use -O1 instead of -O3.

## Current Issues
- Old BSP formats are unsupported. Really recent versions may also be unsupported.
