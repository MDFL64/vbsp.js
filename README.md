# vbsp.js
[![forthebadge](http://forthebadge.com/images/badges/fuck-it-ship-it.svg)](http://forthebadge.com)

Source engine maps in your website!

Minimalistic as possible -- Only renders the BSP with flat shading. No models or textures are loaded. Colors are guessed based on texture names.

Horribly coded, but fairly efficient. Built with emscripten.

## Current Issues
- Models are all dumped at the origin.
- Displacements are unsupported.
- Old BSP formats are unsupported. Really recent versions may also be unsupported.
- Color guessing is very unaccurate. It would be nice to build a big table of color values for common textures.
