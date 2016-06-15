# vbsp.js
[![forthebadge](http://forthebadge.com/images/badges/designed-in-ms-paint.svg)](http://forthebadge.com)

Source engine maps in your browser!

Minimalistic as possible -- Only renders the BSP with flat shading. No models or textures are loaded. Colors are guessed based on texture names.

Horribly coded, but fairly efficient. Built with emscripten.

If you want to test locally you're gonna have to use -O1 instead of -O3.

## Current Issues
- Old BSP formats are unsupported. Really recent versions may also be unsupported.