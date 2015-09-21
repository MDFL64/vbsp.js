var VBSP = function(Module) {
  Module = Module || {};

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof VBSP !== 'undefined' ? VBSP : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) return 0; }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module['AsciiToString'] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module['stringToAscii'] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the a given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module['UTF8ArrayToString'] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8, ptr);
}
Module['UTF8ToString'] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module['stringToUTF8Array'] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
Module['stringToUTF8'] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module['lengthBytesUTF8'] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF16'] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module['lengthBytesUTF16'] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF32'] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module['lengthBytesUTF32'] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 83886080;


var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}



// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');


var buffer = new ArrayBuffer(TOTAL_MEMORY);

HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 1968;
  /* global initializers */ __ATINIT__.push({ func: function() { __GLOBAL__sub_I_main_cpp() } });
  

/* memory initializer */ allocate([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,70,111,114,109,97,116,32,86,37,105,10,0,0,0,0,0,70,97,99,101,32,67,111,117,110,116,58,32,37,105,10,0,109,101,116,97,108,0,0,0,99,101,109,101,110,116,0,0,99,111,110,99,114,101,116,101,0,0,0,0,0,0,0,0,115,116,111,110,101,0,0,0,98,114,105,99,107,0,0,0,99,97,114,112,101,116,0,0,112,108,97,115,116,101,114,0,99,101,105,108,105,110,103,0,119,111,111,100,0,0,0,0,109,117,100,0,0,0,0,0,103,114,97,115,115,0,0,0,103,114,97,118,101,108,0,0,103,108,97,115,115,0,0,0,119,97,116,101,114,0,0,0,116,105,108,101,0,0,0,0,116,101,109,112,108,97,116,101,0,0,0,0,0,0,0,0,98,108,97,99,107,0,0,0,116,111,111,108,0,0,0,0,86,101,114,116,32,67,111,117,110,116,58,32,37,105,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,82,101,110,100,101,114,101,114,32,105,115,32,97,108,114,101,97,100,121,32,114,117,110,110,105,110,103,33,46,0,0,0,79,112,101,110,71,76,32,102,97,105,108,101,100,32,116,111,32,105,110,105,116,46,0,0,79,112,101,110,71,76,32,102,97,105,108,101,100,32,116,111,32,111,112,101,110,32,118,105,101,119,112,111,114,116,46,0,112,114,101,99,105,115,105,111,110,32,109,101,100,105,117,109,112,32,102,108,111,97,116,59,117,110,105,102,111,114,109,32,109,97,116,52,32,109,97,116,114,105,120,59,97,116,116,114,105,98,117,116,101,32,118,101,99,52,32,118,80,111,115,59,97,116,116,114,105,98,117,116,101,32,118,101,99,51,32,118,78,111,114,109,59,97,116,116,114,105,98,117,116,101,32,118,101,99,52,32,98,97,115,101,67,111,108,111,114,59,118,97,114,121,105,110,103,32,118,101,99,52,32,99,111,108,111,114,59,118,111,105,100,32,109,97,105,110,40,41,123,9,102,108,111,97,116,32,102,32,61,32,109,97,120,40,100,111,116,40,118,78,111,114,109,44,118,101,99,51,40,46,56,44,46,57,44,49,41,41,44,46,48,41,32,43,32,109,97,120,40,100,111,116,40,118,78,111,114,109,44,118,101,99,51,40,45,46,55,44,45,46,54,44,45,46,53,41,41,44,46,48,41,59,9,99,111,108,111,114,32,61,32,102,42,98,97,115,101,67,111,108,111,114,59,9,103,108,95,80,111,115,105,116,105,111,110,32,61,32,32,109,97,116,114,105,120,42,118,80,111,115,59,125,0,0,0,0,0,0,112,114,101,99,105,115,105,111,110,32,109,101,100,105,117,109,112,32,102,108,111,97,116,59,118,97,114,121,105,110,103,32,118,101,99,52,32,99,111,108,111,114,59,118,111,105,100,32,109,97,105,110,32,40,41,32,123,9,103,108,95,70,114,97,103,67,111,108,111,114,32,61,32,99,111,108,111,114,59,125,0,0,0,0,0,0,0,0,109,97,116,114,105,120,0,0,105,32,62,61,32,48,32,38,38,32,115,116,97,116,105,99,95,99,97,115,116,60,100,101,116,97,105,108,58,58,99,111,109,112,111,110,101,110,116,95,99,111,117,110,116,95,116,62,40,105,41,32,60,32,100,101,116,97,105,108,58,58,99,111,109,112,111,110,101,110,116,95,99,111,117,110,116,40,42,116,104,105,115,41,0,0,0,0,115,114,99,47,103,108,109,47,100,101,116,97,105,108,47,116,121,112,101,95,118,101,99,52,46,105,110,108,0,0,0,0,111,112,101,114,97,116,111,114,91,93,0,0,0,0,0,0,105,32,60,32,116,104,105,115,45,62,108,101,110,103,116,104,40,41,0,0,0,0,0,0,115,114,99,47,103,108,109,47,100,101,116,97,105,108,47,116,121,112,101,95,109,97,116,52,120,52,46,105,110,108,0,0,97,98,115,40,97,115,112,101,99,116,32,45,32,115,116,100,58,58,110,117,109,101,114,105,99,95,108,105,109,105,116,115,60,84,62,58,58,101,112,115,105,108,111,110,40,41,41,32,62,32,115,116,97,116,105,99,95,99,97,115,116,60,84,62,40,48,41,0,0,0,0,0,115,114,99,47,103,108,109,47,103,116,99,47,109,97,116,114,105,120,95,116,114,97,110,115,102,111,114,109,46,105,110,108,0,0,0,0,0,0,0,0,112,101,114,115,112,101,99,116,105,118,101,82,72,0,0,0,0,0,0,0,120,4,0,0,1,0,0,0,2,0,0,0,3,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,96,5,0,0,104,4,0,0,160,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,116,57,101,120,99,101,112,116,105,111,110,0,0,0,0,56,5,0,0,144,4,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,56,5,0,0,168,4,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,96,5,0,0,192,4,0,0,184,4,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,96,5,0,0,248,4,0,0,232,4,0,0,0,0,0,0,0,0,0,0,32,5,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,168,5,0,0,4,0,0,0,12,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,96,5,0,0,128,5,0,0,32,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  var _cosf=Math_cos;

  
  var GL={counter:1,lastError:0,buffers:[],mappedBuffers:{},programs:[],framebuffers:[],renderbuffers:[],textures:[],uniforms:[],shaders:[],vaos:[],contexts:[],currentContext:null,byteSizeByTypeRoot:5120,byteSizeByType:[1,1,2,2,4,4,4,2,3,4,8],programInfos:{},stringCache:{},packAlignment:4,unpackAlignment:4,init:function () {
        GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
        for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
          GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i+1);
        }
      },recordError:function recordError(errorCode) {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },getNewId:function (table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },MINI_TEMP_BUFFER_SIZE:16,miniTempBuffer:null,miniTempBufferViews:[0],getSource:function (shader, count, string, length) {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var frag;
          if (length) {
            var len = HEAP32[(((length)+(i*4))>>2)];
            if (len < 0) {
              frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
            } else {
              frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)], len);
            }
          } else {
            frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
          }
          source += frag;
        }
        return source;
      },computeImageSize:function (width, height, sizePerPixel, alignment) {
        function roundedToNextMultipleOf(x, y) {
          return Math.floor((x + y - 1) / y) * y
        }
        var plainRowSize = width * sizePerPixel;
        var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
        return (height <= 0) ? 0 :
                 ((height - 1) * alignedRowSize + plainRowSize);
      },get:function (name_, p, type) {
        // Guard against user passing a null pointer.
        // Note that GLES2 spec does not say anything about how passing a null pointer should be treated.
        // Testing on desktop core GL 3, the application crashes on glGetIntegerv to a null pointer, but
        // better to report an error instead of doing anything random.
        if (!p) {
          GL.recordError(0x0501 /* GL_INVALID_VALUE */);
          return;
        }
        var ret = undefined;
        switch(name_) { // Handle a few trivial GLES values
          case 0x8DFA: // GL_SHADER_COMPILER
            ret = 1;
            break;
          case 0x8DF8: // GL_SHADER_BINARY_FORMATS
            if (type !== 'Integer') {
              GL.recordError(0x0500); // GL_INVALID_ENUM
            }
            return; // Do not write anything to the out pointer, since no binary formats are supported.
          case 0x8DF9: // GL_NUM_SHADER_BINARY_FORMATS
            ret = 0;
            break;
          case 0x86A2: // GL_NUM_COMPRESSED_TEXTURE_FORMATS
            // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be queried for length),
            // so implement it ourselves to allow C++ GLES2 code get the length.
            var formats = GLctx.getParameter(0x86A3 /*GL_COMPRESSED_TEXTURE_FORMATS*/);
            ret = formats.length;
            break;
          case 0x8B9A: // GL_IMPLEMENTATION_COLOR_READ_TYPE
            ret = 0x1401; // GL_UNSIGNED_BYTE
            break;
          case 0x8B9B: // GL_IMPLEMENTATION_COLOR_READ_FORMAT
            ret = 0x1908; // GL_RGBA
            break;
        }
  
        if (ret === undefined) {
          var result = GLctx.getParameter(name_);
          switch (typeof(result)) {
            case "number":
              ret = result;
              break;
            case "boolean":
              ret = result ? 1 : 0;
              break;
            case "string":
              GL.recordError(0x0500); // GL_INVALID_ENUM
              return;
            case "object":
              if (result === null) {
                // null is a valid result for some (e.g., which buffer is bound - perhaps nothing is bound), but otherwise
                // can mean an invalid name_, which we need to report as an error
                switch(name_) {
                  case 0x8894: // ARRAY_BUFFER_BINDING
                  case 0x8B8D: // CURRENT_PROGRAM
                  case 0x8895: // ELEMENT_ARRAY_BUFFER_BINDING
                  case 0x8CA6: // FRAMEBUFFER_BINDING
                  case 0x8CA7: // RENDERBUFFER_BINDING
                  case 0x8069: // TEXTURE_BINDING_2D
                  case 0x8514: { // TEXTURE_BINDING_CUBE_MAP
                    ret = 0;
                    break;
                  }
                  default: {
                    GL.recordError(0x0500); // GL_INVALID_ENUM
                    return;
                  }
                }
              } else if (result instanceof Float32Array ||
                         result instanceof Uint32Array ||
                         result instanceof Int32Array ||
                         result instanceof Array) {
                for (var i = 0; i < result.length; ++i) {
                  switch (type) {
                    case 'Integer': HEAP32[(((p)+(i*4))>>2)]=result[i];   break;
                    case 'Float':   HEAPF32[(((p)+(i*4))>>2)]=result[i]; break;
                    case 'Boolean': HEAP8[(((p)+(i))>>0)]=result[i] ? 1 : 0;    break;
                    default: throw 'internal glGet error, bad type: ' + type;
                  }
                }
                return;
              } else if (result instanceof WebGLBuffer ||
                         result instanceof WebGLProgram ||
                         result instanceof WebGLFramebuffer ||
                         result instanceof WebGLRenderbuffer ||
                         result instanceof WebGLTexture) {
                ret = result.name | 0;
              } else {
                GL.recordError(0x0500); // GL_INVALID_ENUM
                return;
              }
              break;
            default:
              GL.recordError(0x0500); // GL_INVALID_ENUM
              return;
          }
        }
  
        switch (type) {
          case 'Integer': HEAP32[((p)>>2)]=ret;    break;
          case 'Float':   HEAPF32[((p)>>2)]=ret;  break;
          case 'Boolean': HEAP8[((p)>>0)]=ret ? 1 : 0; break;
          default: throw 'internal glGet error, bad type: ' + type;
        }
      },getTexPixelData:function (type, format, width, height, pixels, internalFormat) {
        var sizePerPixel;
        var numChannels;
        switch(format) {
          case 0x1906 /* GL_ALPHA */:
          case 0x1909 /* GL_LUMINANCE */:
          case 0x1902 /* GL_DEPTH_COMPONENT */:
          case 0x1903 /* GL_RED */:
            numChannels = 1;
            break;
          case 0x190A /* GL_LUMINANCE_ALPHA */:
          case 0x8227 /* GL_RG */:
            numChannels = 2;
            break;
          case 0x1907 /* GL_RGB */:
            numChannels = 3;
            break;
          case 0x1908 /* GL_RGBA */:
            numChannels = 4;
            break;
          default:
            GL.recordError(0x0500); // GL_INVALID_ENUM
            return {
              pixels: null,
              internalFormat: 0x0
            };
        }
        switch (type) {
          case 0x1401 /* GL_UNSIGNED_BYTE */:
            sizePerPixel = numChannels*1;
            break;
          case 0x1403 /* GL_UNSIGNED_SHORT */:
          case 0x8D61 /* GL_HALF_FLOAT_OES */:
            sizePerPixel = numChannels*2;
            break;
          case 0x1405 /* GL_UNSIGNED_INT */:
          case 0x1406 /* GL_FLOAT */:
            sizePerPixel = numChannels*4;
            break;
          case 0x84FA /* UNSIGNED_INT_24_8_WEBGL */:
            sizePerPixel = 4;
            break;
          case 0x8363 /* GL_UNSIGNED_SHORT_5_6_5 */:
          case 0x8033 /* GL_UNSIGNED_SHORT_4_4_4_4 */:
          case 0x8034 /* GL_UNSIGNED_SHORT_5_5_5_1 */:
            sizePerPixel = 2;
            break;
          default:
            GL.recordError(0x0500); // GL_INVALID_ENUM
            return {
              pixels: null,
              internalFormat: 0x0
            };
        }
        var bytes = GL.computeImageSize(width, height, sizePerPixel, GL.unpackAlignment);
        if (type == 0x1401 /* GL_UNSIGNED_BYTE */) {
          pixels = HEAPU8.subarray((pixels),(pixels+bytes));
        } else if (type == 0x1406 /* GL_FLOAT */) {
          pixels = HEAPF32.subarray((pixels)>>2,(pixels+bytes)>>2);
        } else if (type == 0x1405 /* GL_UNSIGNED_INT */ || type == 0x84FA /* UNSIGNED_INT_24_8_WEBGL */) {
          pixels = HEAPU32.subarray((pixels)>>2,(pixels+bytes)>>2);
        } else {
          pixels = HEAPU16.subarray((pixels)>>1,(pixels+bytes)>>1);
        }
        return {
          pixels: pixels,
          internalFormat: internalFormat
        };
      },validateBufferTarget:function (target) {
        switch (target) {
          case 0x8892: // GL_ARRAY_BUFFER
          case 0x8893: // GL_ELEMENT_ARRAY_BUFFER
          case 0x8F36: // GL_COPY_READ_BUFFER
          case 0x8F37: // GL_COPY_WRITE_BUFFER
          case 0x88EB: // GL_PIXEL_PACK_BUFFER
          case 0x88EC: // GL_PIXEL_UNPACK_BUFFER
          case 0x8C2A: // GL_TEXTURE_BUFFER
          case 0x8C8E: // GL_TRANSFORM_FEEDBACK_BUFFER
          case 0x8A11: // GL_UNIFORM_BUFFER
            return true;
          default:
            return false;
        }
      },createContext:function (canvas, webGLContextAttributes) {
        if (typeof webGLContextAttributes.majorVersion === 'undefined' && typeof webGLContextAttributes.minorVersion === 'undefined') {
          webGLContextAttributes.majorVersion = 1;
          webGLContextAttributes.minorVersion = 0;
        }
        var ctx;
        var errorInfo = '?';
        function onContextCreationError(event) {
          errorInfo = event.statusMessage || errorInfo;
        }
        try {
          canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
          try {
            if (webGLContextAttributes.majorVersion == 1 && webGLContextAttributes.minorVersion == 0) {
              ctx = canvas.getContext("webgl", webGLContextAttributes) || canvas.getContext("experimental-webgl", webGLContextAttributes);
            } else if (webGLContextAttributes.majorVersion == 2 && webGLContextAttributes.minorVersion == 0) {
              ctx = canvas.getContext("webgl2", webGLContextAttributes) || canvas.getContext("experimental-webgl2", webGLContextAttributes);
            } else {
              throw 'Unsupported WebGL context version ' + majorVersion + '.' + minorVersion + '!'
            }
          } finally {
            canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e, JSON.stringify(webGLContextAttributes)]);
          return 0;
        }
        // possible GL_DEBUG entry point: ctx = wrapDebugGL(ctx);
  
        if (!ctx) return 0;
        return GL.registerContext(ctx, webGLContextAttributes);
      },registerContext:function (ctx, webGLContextAttributes) {
        var handle = GL.getNewId(GL.contexts);
        var context = {
          handle: handle,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
        // Store the created context object so that we can access the context given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes['enableExtensionsByDefault'] === 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
        return handle;
      },makeContextCurrent:function (contextHandle) {
        var context = GL.contexts[contextHandle];
        if (!context) return false;
        GLctx = Module.ctx = context.GLctx; // Active WebGL context object.
        GL.currentContext = context; // Active Emscripten GL layer context object.
        return true;
      },getContext:function (contextHandle) {
        return GL.contexts[contextHandle];
      },deleteContext:function (contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
        if (typeof JSEvents === 'object') JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas); // Release all JS event handlers on the DOM element that the GL context is associated with since the context is now deleted.
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined; // Make sure the canvas object no longer refers to the context object so there are no GC surprises.
        GL.contexts[contextHandle] = null;
      },initExtensions:function (context) {
  
        // If this function is called without a specific context object, init the extensions of the currently active context.
        if (!context) context = GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        context.maxVertexAttribs = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS);
  
        // Detect the presence of a few extensions manually, this GL interop layer itself will need to know if they exist. 
        context.compressionExt = GLctx.getExtension('WEBGL_compressed_texture_s3tc') ||
                            GLctx.getExtension('MOZ_WEBGL_compressed_texture_s3tc') ||
                            GLctx.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
  
        context.anisotropicExt = GLctx.getExtension('EXT_texture_filter_anisotropic') ||
                            GLctx.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                            GLctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  
        context.floatExt = GLctx.getExtension('OES_texture_float');
  
        // Extension available from Firefox 26 and Google Chrome 30
        context.instancedArraysExt = GLctx.getExtension('ANGLE_instanced_arrays');
        
        // Extension available from Firefox 25 and WebKit
        context.vaoExt = GLctx.getExtension('OES_vertex_array_object');
  
        if (context.version === 2) {
          // drawBuffers is available in WebGL2 by default.
          context.drawBuffersExt = function(n, bufs) {
            GLctx.drawBuffers(n, bufs);
          };
        } else {
          var ext = GLctx.getExtension('WEBGL_draw_buffers');
          if (ext) {
            context.drawBuffersExt = function(n, bufs) {
              ext.drawBuffersWEBGL(n, bufs);
            };
          }
        }
  
        // These are the 'safe' feature-enabling extensions that don't add any performance impact related to e.g. debugging, and
        // should be enabled by default so that client GLES2/GL code will not need to go through extra hoops to get its stuff working.
        // As new extensions are ratified at http://www.khronos.org/registry/webgl/extensions/ , feel free to add your new extensions
        // here, as long as they don't produce a performance impact for users that might not be using those extensions.
        // E.g. debugging-related extensions should probably be off by default.
        var automaticallyEnabledExtensions = [ "OES_texture_float", "OES_texture_half_float", "OES_standard_derivatives",
                                               "OES_vertex_array_object", "WEBGL_compressed_texture_s3tc", "WEBGL_depth_texture",
                                               "OES_element_index_uint", "EXT_texture_filter_anisotropic", "ANGLE_instanced_arrays",
                                               "OES_texture_float_linear", "OES_texture_half_float_linear", "WEBGL_compressed_texture_atc",
                                               "WEBGL_compressed_texture_pvrtc", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float",
                                               "EXT_frag_depth", "EXT_sRGB", "WEBGL_draw_buffers", "WEBGL_shared_resources",
                                               "EXT_shader_texture_lod" ];
  
        function shouldEnableAutomatically(extension) {
          var ret = false;
          automaticallyEnabledExtensions.forEach(function(include) {
            if (ext.indexOf(include) != -1) {
              ret = true;
            }
          });
          return ret;
        }
  
        var exts = GLctx.getSupportedExtensions();
        if (exts && exts.length > 0) {
          GLctx.getSupportedExtensions().forEach(function(ext) {
            ext = ext.replace('MOZ_', '').replace('WEBKIT_', '');
            if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
              GLctx.getExtension(ext); // Calling .getExtension enables that extension permanently, no need to store the return value to be enabled.
            }
          });
        }
      },populateUniformTable:function (program) {
        var p = GL.programs[program];
        GL.programInfos[program] = {
          uniforms: {},
          maxUniformLength: 0, // This is eagerly computed below, since we already enumerate all uniforms anyway.
          maxAttributeLength: -1 // This is lazily computed and cached, computed when/if first asked, "-1" meaning not computed yet.
        };
  
        var ptable = GL.programInfos[program];
        var utable = ptable.uniforms;
        // A program's uniform table maps the string name of an uniform to an integer location of that uniform.
        // The global GL.uniforms map maps integer locations to WebGLUniformLocations.
        var numUniforms = GLctx.getProgramParameter(p, GLctx.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUniforms; ++i) {
          var u = GLctx.getActiveUniform(p, i);
  
          var name = u.name;
          ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length+1);
  
          // Strip off any trailing array specifier we might have got, e.g. "[0]".
          if (name.indexOf(']', name.length-1) !== -1) {
            var ls = name.lastIndexOf('[');
            name = name.slice(0, ls);
          }
  
          // Optimize memory usage slightly: If we have an array of uniforms, e.g. 'vec3 colors[3];', then 
          // only store the string 'colors' in utable, and 'colors[0]', 'colors[1]' and 'colors[2]' will be parsed as 'colors'+i.
          // Note that for the GL.uniforms table, we still need to fetch the all WebGLUniformLocations for all the indices.
          var loc = GLctx.getUniformLocation(p, name);
          var id = GL.getNewId(GL.uniforms);
          utable[name] = [u.size, id];
          GL.uniforms[id] = loc;
  
          for (var j = 1; j < u.size; ++j) {
            var n = name + '['+j+']';
            loc = GLctx.getUniformLocation(p, n);
            id = GL.getNewId(GL.uniforms);
  
            GL.uniforms[id] = loc;
          }
        }
      }};function _glClearColor(x0, x1, x2, x3) { GLctx.clearColor(x0, x1, x2, x3) }

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  
  
  function _emscripten_get_now() {
      if (!_emscripten_get_now.actual) {
        if (ENVIRONMENT_IS_NODE) {
          _emscripten_get_now.actual = function _emscripten_get_now_actual() {
            var t = process['hrtime']();
            return t[0] * 1e3 + t[1] / 1e6;
          }
        } else if (typeof dateNow !== 'undefined') {
          _emscripten_get_now.actual = dateNow;
        } else if (typeof self === 'object' && self['performance'] && typeof self['performance']['now'] === 'function') {
          _emscripten_get_now.actual = function _emscripten_get_now_actual() { return self['performance']['now'](); };
        } else if (typeof performance === 'object' && typeof performance['now'] === 'function') {
          _emscripten_get_now.actual = function _emscripten_get_now_actual() { return performance['now'](); };
        } else {
          _emscripten_get_now.actual = Date.now;
        }
      }
      return _emscripten_get_now.actual();
    }var GLFW={Window:function (id, width, height, title, monitor, share) {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.storedX = 0; // Used to store X before fullscreen
        this.storedY = 0; // Used to store Y before fullscreen
        this.width = width;
        this.height = height;
        this.storedWidth = width; // Used to store width before fullscreen
        this.storedHeight = height; // Used to store height before fullscreen
        this.title = title;
        this.monitor = monitor;
        this.share = share;
        this.attributes = GLFW.hints;
        this.inputModes = {
          0x00033001:0x00034001, // GLFW_CURSOR (GLFW_CURSOR_NORMAL)
          0x00033002:0, // GLFW_STICKY_KEYS
          0x00033003:0, // GLFW_STICKY_MOUSE_BUTTONS
        };
        this.buttons = 0;
        this.keys = new Array();
        this.shouldClose = 0;
        this.title = null;
        this.windowPosFunc = null; // GLFWwindowposfun
        this.windowSizeFunc = null; // GLFWwindowsizefun
        this.windowCloseFunc = null; // GLFWwindowclosefun
        this.windowRefreshFunc = null; // GLFWwindowrefreshfun
        this.windowFocusFunc = null; // GLFWwindowfocusfun
        this.windowIconifyFunc = null; // GLFWwindowiconifyfun
        this.framebufferSizeFunc = null; // GLFWframebuffersizefun
        this.mouseButtonFunc = null; // GLFWmousebuttonfun
        this.cursorPosFunc = null; // GLFWcursorposfun
        this.cursorEnterFunc = null; // GLFWcursorenterfun
        this.scrollFunc = null; // GLFWscrollfun
        this.keyFunc = null; // GLFWkeyfun
        this.charFunc = null; // GLFWcharfun
        this.userptr = null;
      },WindowFromId:function (id) {
        if (id <= 0 || !GLFW.windows) return null;
        return GLFW.windows[id - 1];
      },errorFunc:null,monitorFunc:null,active:null,windows:null,monitors:null,monitorString:null,versionString:null,initialTime:null,extensions:null,hints:null,defaultHints:{131073:0,131074:0,131075:1,131076:1,131077:1,135169:8,135170:8,135171:8,135172:8,135173:24,135174:8,135175:0,135176:0,135177:0,135178:0,135179:0,135180:0,135181:0,135182:0,135183:0,139265:196609,139266:1,139267:0,139268:0,139269:0,139270:0,139271:0,139272:0},DOMToGLFWKeyCode:function (keycode) {
        switch (keycode) {
          case 0x20:return 32; // DOM_VK_SPACE -> GLFW_KEY_SPACE
          case 0xDE:return 39; // DOM_VK_QUOTE -> GLFW_KEY_APOSTROPHE
          case 0xBC:return 44; // DOM_VK_COMMA -> GLFW_KEY_COMMA
          case 0xAD:return 45; // DOM_VK_HYPHEN_MINUS -> GLFW_KEY_MINUS
          case 0xBE:return 46; // DOM_VK_PERIOD -> GLFW_KEY_PERIOD
          case 0xBF:return 47; // DOM_VK_SLASH -> GLFW_KEY_SLASH
          case 0x30:return 48; // DOM_VK_0 -> GLFW_KEY_0
          case 0x31:return 49; // DOM_VK_1 -> GLFW_KEY_1
          case 0x32:return 50; // DOM_VK_2 -> GLFW_KEY_2
          case 0x33:return 51; // DOM_VK_3 -> GLFW_KEY_3
          case 0x34:return 52; // DOM_VK_4 -> GLFW_KEY_4
          case 0x35:return 53; // DOM_VK_5 -> GLFW_KEY_5
          case 0x36:return 54; // DOM_VK_6 -> GLFW_KEY_6
          case 0x37:return 55; // DOM_VK_7 -> GLFW_KEY_7
          case 0x38:return 56; // DOM_VK_8 -> GLFW_KEY_8
          case 0x39:return 57; // DOM_VK_9 -> GLFW_KEY_9
          case 0x3B:return 59; // DOM_VK_SEMICOLON -> GLFW_KEY_SEMICOLON
          case 0x61:return 61; // DOM_VK_EQUALS -> GLFW_KEY_EQUAL
          case 0x41:return 65; // DOM_VK_A -> GLFW_KEY_A
          case 0x42:return 66; // DOM_VK_B -> GLFW_KEY_B
          case 0x43:return 67; // DOM_VK_C -> GLFW_KEY_C
          case 0x44:return 68; // DOM_VK_D -> GLFW_KEY_D
          case 0x45:return 69; // DOM_VK_E -> GLFW_KEY_E
          case 0x46:return 70; // DOM_VK_F -> GLFW_KEY_F
          case 0x47:return 71; // DOM_VK_G -> GLFW_KEY_G
          case 0x48:return 72; // DOM_VK_H -> GLFW_KEY_H
          case 0x49:return 73; // DOM_VK_I -> GLFW_KEY_I
          case 0x4A:return 74; // DOM_VK_J -> GLFW_KEY_J
          case 0x4B:return 75; // DOM_VK_K -> GLFW_KEY_K
          case 0x4C:return 76; // DOM_VK_L -> GLFW_KEY_L
          case 0x4D:return 77; // DOM_VK_M -> GLFW_KEY_M
          case 0x4E:return 78; // DOM_VK_N -> GLFW_KEY_N
          case 0x4F:return 79; // DOM_VK_O -> GLFW_KEY_O
          case 0x50:return 80; // DOM_VK_P -> GLFW_KEY_P
          case 0x51:return 81; // DOM_VK_Q -> GLFW_KEY_Q
          case 0x52:return 82; // DOM_VK_R -> GLFW_KEY_R
          case 0x53:return 83; // DOM_VK_S -> GLFW_KEY_S
          case 0x54:return 84; // DOM_VK_T -> GLFW_KEY_T
          case 0x55:return 85; // DOM_VK_U -> GLFW_KEY_U
          case 0x56:return 86; // DOM_VK_V -> GLFW_KEY_V
          case 0x57:return 87; // DOM_VK_W -> GLFW_KEY_W
          case 0x58:return 88; // DOM_VK_X -> GLFW_KEY_X
          case 0x59:return 89; // DOM_VK_Y -> GLFW_KEY_Y
          case 0x5a:return 90; // DOM_VK_Z -> GLFW_KEY_Z
          case 0xDB:return 91; // DOM_VK_OPEN_BRACKET -> GLFW_KEY_LEFT_BRACKET
          case 0xDC:return 92; // DOM_VK_BACKSLASH -> GLFW_KEY_BACKSLASH
          case 0xDD:return 93; // DOM_VK_CLOSE_BRACKET -> GLFW_KEY_RIGHT_BRACKET
          case 0xC0:return 94; // DOM_VK_BACK_QUOTE -> GLFW_KEY_GRAVE_ACCENT
          case 0x1B:return 256; // DOM_VK_ESCAPE -> GLFW_KEY_ESCAPE
          case 0x0D:return 257; // DOM_VK_RETURN -> GLFW_KEY_ENTER
          case 0x09:return 258; // DOM_VK_TAB -> GLFW_KEY_TAB
          case 0x08:return 259; // DOM_VK_BACK -> GLFW_KEY_BACKSPACE
          case 0x2D:return 260; // DOM_VK_INSERT -> GLFW_KEY_INSERT
          case 0x2E:return 261; // DOM_VK_DELETE -> GLFW_KEY_DELETE
          case 0x27:return 262; // DOM_VK_RIGHT -> GLFW_KEY_RIGHT
          case 0x25:return 263; // DOM_VK_LEFT -> GLFW_KEY_LEFT
          case 0x28:return 264; // DOM_VK_DOWN -> GLFW_KEY_DOWN
          case 0x26:return 265; // DOM_VK_UP -> GLFW_KEY_UP
          case 0x21:return 266; // DOM_VK_PAGE_UP -> GLFW_KEY_PAGE_UP
          case 0x22:return 267; // DOM_VK_PAGE_DOWN -> GLFW_KEY_PAGE_DOWN
          case 0x24:return 268; // DOM_VK_HOME -> GLFW_KEY_HOME
          case 0x23:return 269; // DOM_VK_END -> GLFW_KEY_END
          case 0x14:return 280; // DOM_VK_CAPS_LOCK -> GLFW_KEY_CAPS_LOCK
          case 0x91:return 281; // DOM_VK_SCROLL_LOCK -> GLFW_KEY_SCROLL_LOCK
          case 0x90:return 282; // DOM_VK_NUM_LOCK -> GLFW_KEY_NUM_LOCK
          case 0x2C:return 283; // DOM_VK_SNAPSHOT -> GLFW_KEY_PRINT_SCREEN
          case 0x13:return 284; // DOM_VK_PAUSE -> GLFW_KEY_PAUSE
          case 0x70:return 290; // DOM_VK_F1 -> GLFW_KEY_F1
          case 0x71:return 291; // DOM_VK_F2 -> GLFW_KEY_F2
          case 0x72:return 292; // DOM_VK_F3 -> GLFW_KEY_F3
          case 0x73:return 293; // DOM_VK_F4 -> GLFW_KEY_F4
          case 0x74:return 294; // DOM_VK_F5 -> GLFW_KEY_F5
          case 0x75:return 295; // DOM_VK_F6 -> GLFW_KEY_F6
          case 0x76:return 296; // DOM_VK_F7 -> GLFW_KEY_F7
          case 0x77:return 297; // DOM_VK_F8 -> GLFW_KEY_F8
          case 0x78:return 298; // DOM_VK_F9 -> GLFW_KEY_F9
          case 0x79:return 299; // DOM_VK_F10 -> GLFW_KEY_F10
          case 0x7A:return 300; // DOM_VK_F11 -> GLFW_KEY_F11
          case 0x7B:return 301; // DOM_VK_F12 -> GLFW_KEY_F12
          case 0x7C:return 302; // DOM_VK_F13 -> GLFW_KEY_F13
          case 0x7D:return 303; // DOM_VK_F14 -> GLFW_KEY_F14
          case 0x7E:return 304; // DOM_VK_F15 -> GLFW_KEY_F15
          case 0x7F:return 305; // DOM_VK_F16 -> GLFW_KEY_F16
          case 0x80:return 306; // DOM_VK_F17 -> GLFW_KEY_F17
          case 0x81:return 307; // DOM_VK_F18 -> GLFW_KEY_F18
          case 0x82:return 308; // DOM_VK_F19 -> GLFW_KEY_F19
          case 0x83:return 309; // DOM_VK_F20 -> GLFW_KEY_F20
          case 0x84:return 310; // DOM_VK_F21 -> GLFW_KEY_F21
          case 0x85:return 311; // DOM_VK_F22 -> GLFW_KEY_F22
          case 0x86:return 312; // DOM_VK_F23 -> GLFW_KEY_F23
          case 0x87:return 313; // DOM_VK_F24 -> GLFW_KEY_F24
          case 0x88:return 314; // 0x88 (not used?) -> GLFW_KEY_F25
          case 0x60:return 320; // DOM_VK_NUMPAD0 -> GLFW_KEY_KP_0
          case 0x61:return 321; // DOM_VK_NUMPAD1 -> GLFW_KEY_KP_1
          case 0x62:return 322; // DOM_VK_NUMPAD2 -> GLFW_KEY_KP_2
          case 0x63:return 323; // DOM_VK_NUMPAD3 -> GLFW_KEY_KP_3
          case 0x64:return 324; // DOM_VK_NUMPAD4 -> GLFW_KEY_KP_4
          case 0x65:return 325; // DOM_VK_NUMPAD5 -> GLFW_KEY_KP_5
          case 0x66:return 326; // DOM_VK_NUMPAD6 -> GLFW_KEY_KP_6
          case 0x67:return 327; // DOM_VK_NUMPAD7 -> GLFW_KEY_KP_7
          case 0x68:return 328; // DOM_VK_NUMPAD8 -> GLFW_KEY_KP_8
          case 0x69:return 329; // DOM_VK_NUMPAD9 -> GLFW_KEY_KP_9
          case 0x6E:return 330; // DOM_VK_DECIMAL -> GLFW_KEY_KP_DECIMAL
          case 0x6F:return 331; // DOM_VK_DIVIDE -> GLFW_KEY_KP_DIVIDE
          case 0x6A:return 332; // DOM_VK_MULTIPLY -> GLFW_KEY_KP_MULTIPLY
          case 0x6D:return 333; // DOM_VK_SUBTRACT -> GLFW_KEY_KP_SUBTRACT
          case 0x6B:return 334; // DOM_VK_ADD -> GLFW_KEY_KP_ADD
          // case 0x0D:return 335; // DOM_VK_RETURN -> GLFW_KEY_KP_ENTER (DOM_KEY_LOCATION_RIGHT)
          // case 0x61:return 336; // DOM_VK_EQUALS -> GLFW_KEY_KP_EQUAL (DOM_KEY_LOCATION_RIGHT)
          case 0x10:return 340; // DOM_VK_SHIFT -> GLFW_KEY_LEFT_SHIFT
          case 0x11:return 341; // DOM_VK_CONTROL -> GLFW_KEY_LEFT_CONTROL
          case 0x12:return 342; // DOM_VK_ALT -> GLFW_KEY_LEFT_ALT
          case 0x5B:return 343; // DOM_VK_WIN -> GLFW_KEY_LEFT_SUPER
          // case 0x10:return 344; // DOM_VK_SHIFT -> GLFW_KEY_RIGHT_SHIFT (DOM_KEY_LOCATION_RIGHT)
          // case 0x11:return 345; // DOM_VK_CONTROL -> GLFW_KEY_RIGHT_CONTROL (DOM_KEY_LOCATION_RIGHT)
          // case 0x12:return 346; // DOM_VK_ALT -> GLFW_KEY_RIGHT_ALT (DOM_KEY_LOCATION_RIGHT)
          // case 0x5B:return 347; // DOM_VK_WIN -> GLFW_KEY_RIGHT_SUPER (DOM_KEY_LOCATION_RIGHT)
          case 0x5D:return 348; // DOM_VK_CONTEXT_MENU -> GLFW_KEY_MENU
  
          // XXX: GLFW_KEY_WORLD_1, GLFW_KEY_WORLD_2 what are these?
          default:return -1; // GLFW_KEY_UNKNOWN
        };
      },getModBits:function (win) {
        var mod = 0;
        if (win.keys[340]) mod |= 0x0001; // GLFW_MOD_SHIFT
        if (win.keys[341]) mod |= 0x0002; // GLFW_MOD_CONTROL
        if (win.keys[342]) mod |= 0x0004; // GLFW_MOD_ALT
        if (win.keys[343]) mod |= 0x0008; // GLFW_MOD_SUPER
        return mod;
      },onKeyPress:function (event) {
        if (!GLFW.active || !GLFW.active.charFunc) return;
  
        // correct unicode charCode is only available with onKeyPress event
        var charCode = event.charCode;
        if (charCode == 0 || (charCode >= 0x00 && charCode <= 0x1F)) return;
  
        Runtime.dynCall('vii', GLFW.active.charFunc, [charCode, 1]);
  
      },onKeyChanged:function (event, status) {
        if (!GLFW.active) return;
  
        var key = GLFW.DOMToGLFWKeyCode(event.keyCode);
        if (key == -1) return;
  
        GLFW.active.keys[key] = status;
        if (!GLFW.active.keyFunc) return;
  
        Runtime.dynCall('vii', GLFW.active.keyFunc, [key, status]);
  
      },onKeydown:function (event) {
        GLFW.onKeyChanged(event, 1); // GLFW_PRESS
  
        // This logic comes directly from the sdl implementation. We cannot
        // call preventDefault on all keydown events otherwise onKeyPress will
        // not get called
        if (event.keyCode === 8 /* backspace */ || event.keyCode === 9 /* tab */) {
          event.preventDefault();
        }
      },onKeyup:function (event) {
        GLFW.onKeyChanged(event, 0); // GLFW_RELEASE
      },onMousemove:function (event) {
        if (!GLFW.active) return;
  
        Browser.calculateMouseEvent(event);
  
        if (event.target != Module["canvas"] || !GLFW.active.cursorPosFunc) return;
  
        Runtime.dynCall('vii', GLFW.active.cursorPosFunc, [Browser.mouseX, Browser.mouseY]);
  
      },onMouseButtonChanged:function (event, status) {
        if (!GLFW.active || !GLFW.active.mouseButtonFunc) return;
  
        Browser.calculateMouseEvent(event);
  
        if (event.target != Module["canvas"]) return;
  
        if (status == 1) { // GLFW_PRESS
          try {
            event.target.setCapture();
          } catch (e) {}
        }
  
        // DOM and glfw have different button codes
        var eventButton = event['button'];
        if (eventButton > 0) {
          if (eventButton == 1) {
            eventButton = 2;
          } else {
            eventButton = 1;
          }
        }
  
        Runtime.dynCall('vii', GLFW.active.mouseButtonFunc, [eventButton, status]);
  
      },onMouseButtonDown:function (event) {
        if (!GLFW.active) return;
        GLFW.active.buttons |= (1 << event['button']);
        GLFW.onMouseButtonChanged(event, 1); // GLFW_PRESS
      },onMouseButtonUp:function (event) {
        if (!GLFW.active) return;
        GLFW.active.buttons &= ~(1 << event['button']);
        GLFW.onMouseButtonChanged(event, 0); // GLFW_RELEASE
      },onMouseWheel:function (event) {
        // Note the minus sign that flips browser wheel direction (positive direction scrolls page down) to native wheel direction (positive direction is mouse wheel up)
        var delta = -Browser.getMouseWheelDelta(event);
        delta = (delta == 0) ? 0 : (delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1)); // Quantize to integer so that minimum scroll is at least +/- 1.
        GLFW.wheelPos += delta;
  
        if (!GLFW.active || !GLFW.active.scrollFunc || event.target != Module['canvas']) return;
  
        Runtime.dynCall('vi', GLFW.active.scrollFunc, [GLFW.wheelPos]);
  
  
        event.preventDefault();
      },onFullScreenEventChange:function (event) {
        if (!GLFW.active) return;
  
        if (document["fullScreen"] || document["mozFullScreen"] || document["webkitIsFullScreen"]) {
          GLFW.active.storedX = GLFW.active.x;
          GLFW.active.storedY = GLFW.active.y;
          GLFW.active.x = GLFW.active.y = 0;
          GLFW.active.storedWidth = GLFW.active.width;
          GLFW.active.storedHeight = GLFW.active.height;
          GLFW.active.width = screen.width;
          GLFW.active.height = screen.height;
        } else {
          document.removeEventListener('fullscreenchange', GLFW.onFullScreenEventChange, true);
          document.removeEventListener('mozfullscreenchange', GLFW.onFullScreenEventChange, true);
          document.removeEventListener('webkitfullscreenchange', GLFW.onFullScreenEventChange, true);
          GLFW.active.width = GLFW.active.storedWidth;
          GLFW.active.height = GLFW.active.storedHeight;
        }
  
        Browser.setCanvasSize(GLFW.active.width, GLFW.active.height);
  
        if (!GLFW.active.windowResizeFunc) return;
  
        Runtime.dynCall('vii', GLFW.active.windowResizeFunc, [width, height]);
  
      },requestFullScreen:function () {
        var RFS = Module["canvas"]['requestFullscreen'] ||
                  Module["canvas"]['requestFullScreen'] ||
                  Module["canvas"]['mozRequestFullScreen'] ||
                  Module["canvas"]['webkitRequestFullScreen'] ||
                  (function() {});
        RFS.apply(Module["canvas"], []);
      },cancelFullScreen:function () {
        var CFS = document['exitFullscreen'] ||
                  document['cancelFullScreen'] ||
                  document['mozCancelFullScreen'] ||
                  document['webkitCancelFullScreen'] ||
            (function() {});
        CFS.apply(document, []);
      },getTime:function () {
        return _emscripten_get_now() / 1000;
      },setWindowTitle:function (winid, title) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
  
        win.title = Pointer_stringify(title);
        if (GLFW.active.id == win.id) {
          document.title = win.title;
        }
      },setKeyCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.keyFunc = cbfun;
      },setCharCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.charFunc = cbfun;
      },setMouseButtonCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.mouseButtonFunc = cbfun;
      },setCursorPosCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.cursorPosFunc = cbfun;
      },setScrollCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.scrollFunc = cbfun;
      },setWindowSizeCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.windowSizeFunc = cbfun;
      },setWindowCloseCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.windowCloseFunc = cbfun;
      },setWindowRefreshCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.windowRefreshFunc = cbfun;
      },getKey:function (winid, key) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return 0;
        return win.keys[key];
      },getMouseButton:function (winid, button) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return 0;
        return (win.buttons & (1 << button)) > 0;
      },getCursorPos:function (winid, x, y) {
        setValue(x, Browser.mouseX, 'double');
        setValue(y, Browser.mouseY, 'double');
      },getMousePos:function (winid, x, y) {
        setValue(x, Browser.mouseX, 'i32');
        setValue(y, Browser.mouseY, 'i32');
      },setCursorPos:function (winid, x, y) {
      },getWindowPos:function (winid, x, y) {
        var wx = 0;
        var wy = 0;
  
        var win = GLFW.WindowFromId(winid);
        if (win) {
          wx = win.x;
          wy = win.y;
        }
  
        setValue(x, wx, 'i32');
        setValue(y, wy, 'i32');
      },setWindowPos:function (winid, x, y) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.x = x;
        win.y = y;
      },getWindowSize:function (winid, width, height) {
        var ww = 0;
        var wh = 0;
  
        var win = GLFW.WindowFromId(winid);
        if (win) {
          ww = win.width;
          wh = win.height;
        }
  
        setValue(width, ww, 'i32');
        setValue(height, wh, 'i32');
      },setWindowSize:function (winid, width, height) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
  
        if (GLFW.active.id == win.id) {
          if (width == screen.width && height == screen.height) {
            GLFW.requestFullScreen();
          } else {
            GLFW.cancelFullScreen();
            Browser.setCanvasSize(width, height);
            win.width = width;
            win.height = height;
          }
        }
  
        if (!win.windowResizeFunc) return;
  
        Runtime.dynCall('vii', win.windowResizeFunc, [width, height]);
  
      },createWindow:function (width, height, title, monitor, share) {
        var i, id;
        for (i = 0; i < GLFW.windows.length && GLFW.windows[i] !== null; i++);
        if (i > 0) throw "glfwCreateWindow only supports one window at time currently";
  
        // id for window
        id = i + 1;
  
        // not valid
        if (width <= 0 || height <= 0) return 0;
  
        if (monitor) {
          GLFW.requestFullScreen();
        } else {
          Browser.setCanvasSize(width, height);
        }
  
        // Create context when there are no existing alive windows
        for (i = 0; i < GLFW.windows.length && GLFW.windows[i] == null; i++);
        if (i == GLFW.windows.length) {
          var contextAttributes = {
            antialias: (GLFW.hints[0x0002100D] > 1), // GLFW_SAMPLES
            depth: (GLFW.hints[0x00021005] > 0),     // GLFW_DEPTH_BITS
            stencil: (GLFW.hints[0x00021006] > 0)    // GLFW_STENCIL_BITS
          }
          Module.ctx = Browser.createContext(Module['canvas'], true, true, contextAttributes);
        }
  
        // Get non alive id
        var win = new GLFW.Window(id, width, height, title, monitor, share);
  
        // Set window to array
        if (id - 1 == GLFW.windows.length) {
          GLFW.windows.push(win);
        } else {
          GLFW.windows[id - 1] = win;
        }
  
        GLFW.active = win;
        return win.id;
      },destroyWindow:function (winid) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
  
  
        GLFW.windows[win.id - 1] = null;
        if (GLFW.active.id == win.id)
          GLFW.active = null;
  
        // Destroy context when no alive windows
        for (var i = 0; i < GLFW.windows.length; i++)
          if (GLFW.windows[i] !== null) return;
  
        Module.ctx = Browser.destroyContext(Module['canvas'], true, true);
      },swapBuffers:function (winid) {
      },GLFW2ParamToGLFW3Param:function (param) {
        table = {
          0x00030001:0, // GLFW_MOUSE_CURSOR
          0x00030002:0, // GLFW_STICKY_KEYS
          0x00030003:0, // GLFW_STICKY_MOUSE_BUTTONS
          0x00030004:0, // GLFW_SYSTEM_KEYS
          0x00030005:0, // GLFW_KEY_REPEAT
          0x00030006:0, // GLFW_AUTO_POLL_EVENTS
          0x00020001:0, // GLFW_OPENED
          0x00020002:0, // GLFW_ACTIVE
          0x00020003:0, // GLFW_ICONIFIED
          0x00020004:0, // GLFW_ACCELERATED
          0x00020005:0x00021001, // GLFW_RED_BITS
          0x00020006:0x00021002, // GLFW_GREEN_BITS
          0x00020007:0x00021003, // GLFW_BLUE_BITS
          0x00020008:0x00021004, // GLFW_ALPHA_BITS
          0x00020009:0x00021005, // GLFW_DEPTH_BITS
          0x0002000A:0x00021006, // GLFW_STENCIL_BITS
          0x0002000B:0x0002100F, // GLFW_REFRESH_RATE
          0x0002000C:0x00021007, // GLFW_ACCUM_RED_BITS
          0x0002000D:0x00021008, // GLFW_ACCUM_GREEN_BITS
          0x0002000E:0x00021009, // GLFW_ACCUM_BLUE_BITS
          0x0002000F:0x0002100A, // GLFW_ACCUM_ALPHA_BITS
          0x00020010:0x0002100B, // GLFW_AUX_BUFFERS
          0x00020011:0x0002100C, // GLFW_STEREO
          0x00020012:0, // GLFW_WINDOW_NO_RESIZE
          0x00020013:0x0002100D, // GLFW_FSAA_SAMPLES
          0x00020014:0x00022002, // GLFW_OPENGL_VERSION_MAJOR
          0x00020015:0x00022003, // GLFW_OPENGL_VERSION_MINOR
          0x00020016:0x00022006, // GLFW_OPENGL_FORWARD_COMPAT
          0x00020017:0x00022007, // GLFW_OPENGL_DEBUG_CONTEXT
          0x00020018:0x00022008, // GLFW_OPENGL_PROFILE
        };
        return table[param];
      }};function _glfwGetMouseButton(button) {
      return GLFW.getMouseButton(GLFW.active.id, button);
    }

  function _glfwGetWindowSize(width, height) {
      GLFW.getWindowSize(GLFW.active.id, width, height);
    }

   
  Module["_memset"] = _memset;

  function _glDisableVertexAttribArray(index) {
      GLctx.disableVertexAttribArray(index);
    }

  function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
      GLctx.vertexAttribPointer(index, size, type, normalized, stride, ptr);
    }

  function _glfwTerminate() {
      window.removeEventListener("keydown", GLFW.onKeydown, true);
      window.removeEventListener("keypress", GLFW.onKeyPress, true);
      window.removeEventListener("keyup", GLFW.onKeyup, true);
      Module["canvas"].removeEventListener("mousemove", GLFW.onMousemove, true);
      Module["canvas"].removeEventListener("mousedown", GLFW.onMouseButtonDown, true);
      Module["canvas"].removeEventListener("mouseup", GLFW.onMouseButtonUp, true);
      Module["canvas"].removeEventListener('wheel', GLFW.onMouseWheel, true);
      Module["canvas"].removeEventListener('mousewheel', GLFW.onMouseWheel, true);
      Module["canvas"].width = Module["canvas"].height = 1;
      GLFW.windows = null;
      GLFW.active = null;
    }

  function _abort() {
      Module['abort']();
    }

  function _glLinkProgram(program) {
      GLctx.linkProgram(GL.programs[program]);
      GL.programInfos[program] = null; // uniforms no longer keep the same names after linking
      GL.populateUniformTable(program);
    }

  
  
  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
  
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        // If Module['websocket'] has already been defined (e.g. for configuring
        // the subprotocol/url) use that, if not initialise it to a new object.
        Module['websocket'] = (Module['websocket'] && 
                               ('object' === typeof Module['websocket'])) ? Module['websocket'] : {};
  
        // Add the Event registration mechanism to the exported websocket configuration
        // object so we can register network callbacks from native JavaScript too.
        // For more documentation see system/include/emscripten/emscripten.h
        Module['websocket']._callbacks = {};
        Module['websocket']['on'] = function(event, callback) {
  	    if ('function' === typeof callback) {
  		  this._callbacks[event] = callback;
          }
  	    return this;
        };
  
        Module['websocket'].emit = function(event, param) {
  	    if ('function' === typeof this._callbacks[event]) {
  		  this._callbacks[event].call(this, param);
          }
        };
  
        // If debug is enabled register simple default logging callbacks for each Event.
  
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          error: null, // Used in getsockopt for SOL_SOCKET/SO_ERROR test
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                var parts = addr.split('/');
                url = url + parts[0] + ":" + port + "/" + parts.slice(1).join('/');
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The regex trims the string (removes spaces at the beginning and end, then splits the string by
              // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
              subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
              // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
              var opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
  
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
  
            Module['websocket'].emit('open', sock.stream.fd);
  
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
            Module['websocket'].emit('message', sock.stream.fd);
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('close', function() {
              Module['websocket'].emit('close', sock.stream.fd);
            });
            peer.socket.on('error', function(error) {
              // Although the ws library may pass errors that may be more descriptive than
              // ECONNREFUSED they are not necessarily the expected error code e.g. 
              // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
              // is still probably the most useful thing to do.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onclose = function() {
              Module['websocket'].emit('close', sock.stream.fd);
            };
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
            peer.socket.onerror = function(error) {
              // The WebSocket spec only allows a 'simple event' to be thrown on error,
              // so we only really know as much as ECONNREFUSED.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          Module['websocket'].emit('listen', sock.stream.fd); // Send Event with listen fd.
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
              Module['websocket'].emit('connection', newsock.stream.fd);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
              Module['websocket'].emit('connection', sock.stream.fd);
            }
          });
          sock.server.on('closed', function() {
            Module['websocket'].emit('close', sock.stream.fd);
            sock.server = null;
          });
          sock.server.on('error', function(error) {
            // Although the ws library may pass errors that may be more descriptive than
            // ECONNREFUSED they are not necessarily the expected error code e.g. 
            // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
            // is still probably the most useful thing to do. This error shouldn't
            // occur in a well written app as errors should get trapped in the compiled
            // app's own getaddrinfo call.
            sock.error = ERRNO_CODES.EHOSTUNREACH; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
            Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'EHOSTUNREACH: Host is unreachable']);
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) return -1;
      return stream.fd;
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return (bytesWritten / size)|0;
      }
    }
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[((textIndex)>>0)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)>>0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)>>0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)>>0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)>>0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)>>0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)>>0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[((i)>>0)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }function _printf(format, varargs) {
      // int printf(const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var stdout = HEAP32[((_stdout)>>2)];
      return _fprintf(stdout, format, varargs);
    }

  function _glGetUniformLocation(program, name) {
      name = Pointer_stringify(name);
  
      var arrayOffset = 0;
      // If user passed an array accessor "[index]", parse the array index off the accessor.
      if (name.indexOf(']', name.length-1) !== -1) {
        var ls = name.lastIndexOf('[');
        var arrayIndex = name.slice(ls+1, -1);
        if (arrayIndex.length > 0) {
          arrayOffset = parseInt(arrayIndex);
          if (arrayOffset < 0) {
            return -1;
          }
        }
        name = name.slice(0, ls);
      }
  
      var ptable = GL.programInfos[program];
      if (!ptable) {
        return -1;
      }
      var utable = ptable.uniforms;
      var uniformInfo = utable[name]; // returns pair [ dimension_of_uniform_array, uniform_location ]
      if (uniformInfo && arrayOffset < uniformInfo[0]) { // Check if user asked for an out-of-bounds element, i.e. for 'vec4 colors[3];' user could ask for 'colors[10]' which should return -1.
        return uniformInfo[1]+arrayOffset;
      } else {
        return -1;
      }
    }

  var _tan=Math_tan;


  function _glDrawArrays(mode, first, count) {
  
      GLctx.drawArrays(mode, first, count);
  
    }

  function _glEnable(x0) { GLctx.enable(x0) }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _glClear(x0) { GLctx.clear(x0) }

  var _sqrtf=Math_sqrt;

  function _glShaderSource(shader, count, string, length) {
      var source = GL.getSource(shader, count, string, length);
      GLctx.shaderSource(GL.shaders[shader], source);
    }

  function _glGenBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var buffer = GLctx.createBuffer();
        if (!buffer) {
          GL.recordError(0x0502 /* GL_INVALID_OPERATION */);
          while(i < n) HEAP32[(((buffers)+(i++*4))>>2)]=0;
          return;
        }
        var id = GL.getNewId(GL.buffers);
        buffer.name = id;
        GL.buffers[id] = buffer;
        HEAP32[(((buffers)+(i*4))>>2)]=id;
      }
    }

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _glUniformMatrix4fv(location, count, transpose, value) {
      location = GL.uniforms[location];
      var view;
      if (count === 1) {
        // avoid allocation for the common case of uploading one uniform matrix
        view = GL.miniTempBufferViews[15];
        for (var i = 0; i < 16; i++) {
          view[i] = HEAPF32[(((value)+(i*4))>>2)];
        }
      } else {
        view = HEAPF32.subarray((value)>>2,(value+count*64)>>2);
      }
      GLctx.uniformMatrix4fv(location, transpose, view);
    }

  function _glBindBuffer(target, buffer) {
      var bufferObj = buffer ? GL.buffers[buffer] : null;
  
  
      GLctx.bindBuffer(target, bufferObj);
    }

  function _glEnableVertexAttribArray(index) {
      GLctx.enableVertexAttribArray(index);
    }

  function _glAttachShader(program, shader) {
      GLctx.attachShader(GL.programs[program],
                              GL.shaders[shader]);
    }

  function _glCompileShader(shader) {
      GLctx.compileShader(GL.shaders[shader]);
    }

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  var EXCEPTIONS={last:0,caught:[],infos:{},deAdjust:function (adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
        for (var ptr in EXCEPTIONS.infos) {
          var info = EXCEPTIONS.infos[ptr];
          if (info.adjusted === adjusted) {
            return ptr;
          }
        }
        return adjusted;
      },addRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++;
      },decRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        if (info.refcount === 0) {
          if (info.destructor) {
            Runtime.dynCall('vi', info.destructor, [ptr]);
          }
          delete EXCEPTIONS.infos[ptr];
          ___cxa_free_exception(ptr);
        }
      },clearRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0;
      }};
  function ___resumeException(ptr) {
      if (!EXCEPTIONS.last) { EXCEPTIONS.last = ptr; }
      EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr)); // exception refcount should be cleared, but don't free it
      throw ptr;
    }function ___cxa_find_matching_catch() {
      var thrown = EXCEPTIONS.last;
      if (!thrown) {
        // just pass through the null ptr
        return ((asm["setTempRet0"](0),0)|0);
      }
      var info = EXCEPTIONS.infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((asm["setTempRet0"](0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = Module['___cxa_is_pointer_type'](throwntype);
      // can_catch receives a **, add indirection
      if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
      HEAP32[((___cxa_find_matching_catch.buffer)>>2)]=thrown;
      thrown = ___cxa_find_matching_catch.buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted = thrown;
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      EXCEPTIONS.infos[ptr] = {
        ptr: ptr,
        adjusted: ptr,
        type: type,
        destructor: destructor,
        refcount: 0
      };
      EXCEPTIONS.last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr;
    }

  function _glCreateProgram() {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      program.name = id;
      GL.programs[id] = program;
      return id;
    }

  function _glfwOpenWindow(width, height, redbits, greenbits, bluebits, alphabits, depthbits, stencilbits, mode) {
      GLFW.hints[0x00021001] = redbits;     // GLFW_RED_BITS
      GLFW.hints[0x00021002] = greenbits;   // GLFW_GREEN_BITS
      GLFW.hints[0x00021003] = bluebits;    // GLFW_BLUE_BITS
      GLFW.hints[0x00021004] = alphabits;   // GLFW_ALPHA_BITS
      GLFW.hints[0x00021005] = depthbits;   // GLFW_DEPTH_BITS
      GLFW.hints[0x00021006] = stencilbits; // GLFW_STENCIL_BITS
      GLFW.createWindow(width, height, "GLFW2 Window", 0, 0);
      return 1; // GL_TRUE
    }

  function _glBufferData(target, size, data, usage) {
      switch (usage) { // fix usages, WebGL only has *_DRAW
        case 0x88E1: // GL_STREAM_READ
        case 0x88E2: // GL_STREAM_COPY
          usage = 0x88E0; // GL_STREAM_DRAW
          break;
        case 0x88E5: // GL_STATIC_READ
        case 0x88E6: // GL_STATIC_COPY
          usage = 0x88E4; // GL_STATIC_DRAW
          break;
        case 0x88E9: // GL_DYNAMIC_READ
        case 0x88EA: // GL_DYNAMIC_COPY
          usage = 0x88E8; // GL_DYNAMIC_DRAW
          break;
      }
      if (!data) {
        GLctx.bufferData(target, size, usage);
      } else {
        GLctx.bufferData(target, HEAPU8.subarray(data, data+size), usage);
      }
    }

  function _glViewport(x0, x1, x2, x3) { GLctx.viewport(x0, x1, x2, x3) }


  var _sinf=Math_sin;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _glUseProgram(program) {
      GLctx.useProgram(program ? GL.programs[program] : null);
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  
  function _malloc(bytes) {
      /* Over-allocate to make sure it is byte-aligned by 8.
       * This will leak memory, but this is only the dummy
       * implementation (replaced by dlmalloc normally) so
       * not an issue.
       */
      var ptr = Runtime.dynamicAlloc(bytes + 8);
      return (ptr+8) & 0xFFFFFFF8;
    }
  Module["_malloc"] = _malloc;function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  function _glFrontFace(x0) { GLctx.frontFace(x0) }

  function ___errno_location() {
      return ___errno_state;
    }

  function _glfwInit() {
      if (GLFW.windows) return 1; // GL_TRUE
  
      GLFW.initialTime = GLFW.getTime();
      GLFW.hints = GLFW.defaultHints;
      GLFW.windows = new Array()
      GLFW.active = null;
  
      window.addEventListener("keydown", GLFW.onKeydown, true);
      window.addEventListener("keypress", GLFW.onKeyPress, true);
      window.addEventListener("keyup", GLFW.onKeyup, true);
      Module["canvas"].addEventListener("mousemove", GLFW.onMousemove, true);
      Module["canvas"].addEventListener("mousedown", GLFW.onMouseButtonDown, true);
      Module["canvas"].addEventListener("mouseup", GLFW.onMouseButtonUp, true);
      Module["canvas"].addEventListener('wheel', GLFW.onMouseWheel, true);
      Module["canvas"].addEventListener('mousewheel', GLFW.onMouseWheel, true);
      return 1; // GL_TRUE
    }

  function _glfwGetKey(key) {
      return GLFW.getKey(GLFW.active.id, key);
    }

  function _glfwSwapBuffers() {
      GLFW.swapBuffers(GLFW.active.id);
    }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _glfwGetMousePos(x, y) {
      GLFW.getMousePos(GLFW.active.id, x, y);
    }

  function _glCreateShader(shaderType) {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
      return id;
    }
var GLctx; GL.init()
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");



function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_viiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_v(x) { Module["printErr"]("Invalid function pointer called with signature 'v'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_viiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_viiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_iiii": nullFunc_iiii, "nullFunc_viiiii": nullFunc_viiiii, "nullFunc_vi": nullFunc_vi, "nullFunc_ii": nullFunc_ii, "nullFunc_v": nullFunc_v, "nullFunc_viiiiii": nullFunc_viiiiii, "nullFunc_viiii": nullFunc_viiii, "invoke_iiii": invoke_iiii, "invoke_viiiii": invoke_viiiii, "invoke_vi": invoke_vi, "invoke_ii": invoke_ii, "invoke_v": invoke_v, "invoke_viiiiii": invoke_viiiiii, "invoke_viiii": invoke_viiii, "_glUseProgram": _glUseProgram, "_glVertexAttribPointer": _glVertexAttribPointer, "_cosf": _cosf, "_send": _send, "___assert_fail": ___assert_fail, "_glUniformMatrix4fv": _glUniformMatrix4fv, "__reallyNegative": __reallyNegative, "_glfwGetWindowSize": _glfwGetWindowSize, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_glfwOpenWindow": _glfwOpenWindow, "___cxa_allocate_exception": ___cxa_allocate_exception, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "_glfwGetKey": _glfwGetKey, "_glBindBuffer": _glBindBuffer, "_glCreateProgram": _glCreateProgram, "_pwrite": _pwrite, "_glViewport": _glViewport, "___setErrNo": ___setErrNo, "_glClearColor": _glClearColor, "_sbrk": _sbrk, "_glGetUniformLocation": _glGetUniformLocation, "_glDisableVertexAttribArray": _glDisableVertexAttribArray, "_glClear": _glClear, "_sinf": _sinf, "_fileno": _fileno, "___resumeException": ___resumeException, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "_sysconf": _sysconf, "_glDrawArrays": _glDrawArrays, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_glShaderSource": _glShaderSource, "_glfwGetMousePos": _glfwGetMousePos, "_glfwGetMouseButton": _glfwGetMouseButton, "_glEnable": _glEnable, "_mkport": _mkport, "_sqrtf": _sqrtf, "_glfwInit": _glfwInit, "_glLinkProgram": _glLinkProgram, "_write": _write, "_glfwSwapBuffers": _glfwSwapBuffers, "_fflush": _fflush, "___errno_location": ___errno_location, "_glGenBuffers": _glGenBuffers, "_glAttachShader": _glAttachShader, "_glfwTerminate": _glfwTerminate, "_glFrontFace": _glFrontFace, "_glCompileShader": _glCompileShader, "_printf": _printf, "___cxa_throw": ___cxa_throw, "_glEnableVertexAttribArray": _glEnableVertexAttribArray, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_abort": _abort, "_tan": _tan, "_fwrite": _fwrite, "_emscripten_get_now": _emscripten_get_now, "_time": _time, "_fprintf": _fprintf, "_glBufferData": _glBufferData, "__formatString": __formatString, "_glCreateShader": _glCreateShader, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_viiiii=env.nullFunc_viiiii;
  var nullFunc_vi=env.nullFunc_vi;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_v=env.nullFunc_v;
  var nullFunc_viiiiii=env.nullFunc_viiiiii;
  var nullFunc_viiii=env.nullFunc_viiii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_viiiii=env.invoke_viiiii;
  var invoke_vi=env.invoke_vi;
  var invoke_ii=env.invoke_ii;
  var invoke_v=env.invoke_v;
  var invoke_viiiiii=env.invoke_viiiiii;
  var invoke_viiii=env.invoke_viiii;
  var _glUseProgram=env._glUseProgram;
  var _glVertexAttribPointer=env._glVertexAttribPointer;
  var _cosf=env._cosf;
  var _send=env._send;
  var ___assert_fail=env.___assert_fail;
  var _glUniformMatrix4fv=env._glUniformMatrix4fv;
  var __reallyNegative=env.__reallyNegative;
  var _glfwGetWindowSize=env._glfwGetWindowSize;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _glfwOpenWindow=env._glfwOpenWindow;
  var ___cxa_allocate_exception=env.___cxa_allocate_exception;
  var __ZSt18uncaught_exceptionv=env.__ZSt18uncaught_exceptionv;
  var _glfwGetKey=env._glfwGetKey;
  var _glBindBuffer=env._glBindBuffer;
  var _glCreateProgram=env._glCreateProgram;
  var _pwrite=env._pwrite;
  var _glViewport=env._glViewport;
  var ___setErrNo=env.___setErrNo;
  var _glClearColor=env._glClearColor;
  var _sbrk=env._sbrk;
  var _glGetUniformLocation=env._glGetUniformLocation;
  var _glDisableVertexAttribArray=env._glDisableVertexAttribArray;
  var _glClear=env._glClear;
  var _sinf=env._sinf;
  var _fileno=env._fileno;
  var ___resumeException=env.___resumeException;
  var ___cxa_find_matching_catch=env.___cxa_find_matching_catch;
  var _sysconf=env._sysconf;
  var _glDrawArrays=env._glDrawArrays;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _glShaderSource=env._glShaderSource;
  var _glfwGetMousePos=env._glfwGetMousePos;
  var _glfwGetMouseButton=env._glfwGetMouseButton;
  var _glEnable=env._glEnable;
  var _mkport=env._mkport;
  var _sqrtf=env._sqrtf;
  var _glfwInit=env._glfwInit;
  var _glLinkProgram=env._glLinkProgram;
  var _write=env._write;
  var _glfwSwapBuffers=env._glfwSwapBuffers;
  var _fflush=env._fflush;
  var ___errno_location=env.___errno_location;
  var _glGenBuffers=env._glGenBuffers;
  var _glAttachShader=env._glAttachShader;
  var _glfwTerminate=env._glfwTerminate;
  var _glFrontFace=env._glFrontFace;
  var _glCompileShader=env._glCompileShader;
  var _printf=env._printf;
  var ___cxa_throw=env.___cxa_throw;
  var _glEnableVertexAttribArray=env._glEnableVertexAttribArray;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _abort=env._abort;
  var _tan=env._tan;
  var _fwrite=env._fwrite;
  var _emscripten_get_now=env._emscripten_get_now;
  var _time=env._time;
  var _fprintf=env._fprintf;
  var _glBufferData=env._glBufferData;
  var __formatString=env.__formatString;
  var _glCreateShader=env._glCreateShader;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function ___cxx_global_var_init() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp + 8|0;
 $1 = sp;
 $2 = sp + 4|0;
 HEAP32[$0>>2] = 0;
 HEAP32[$1>>2] = 0;
 HEAP32[$2>>2] = 0;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2IiiiEERKT_RKT0_RKT1_(16,$0,$1,$2);
 STACKTOP = sp;return;
}
function __ZN3glm5tvec3IfLNS_9precisionE0EEC2IiiiEERKT_RKT0_RKT1_($this,$a,$b,$c) {
 $this = $this|0;
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $0;
 $5 = $1;
 $6 = HEAP32[$5>>2]|0;
 $7 = (+($6|0));
 HEAPF32[$4>>2] = $7;
 $8 = (($4) + 4|0);
 $9 = $2;
 $10 = HEAP32[$9>>2]|0;
 $11 = (+($10|0));
 HEAPF32[$8>>2] = $11;
 $12 = (($4) + 8|0);
 $13 = $3;
 $14 = HEAP32[$13>>2]|0;
 $15 = (+($14|0));
 HEAPF32[$12>>2] = $15;
 STACKTOP = sp;return;
}
function _loadMap($bsp_file) {
 $bsp_file = $bsp_file|0;
 var $$arith = 0, $$overflow = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0;
 var $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0;
 var $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0;
 var $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0;
 var $277 = 0, $278 = 0, $279 = 0.0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0.0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0.0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0;
 var $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0.0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0.0, $309 = 0, $31 = 0, $310 = 0, $311 = 0;
 var $312 = 0, $313 = 0.0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0.0, $328 = 0, $329 = 0, $33 = 0;
 var $330 = 0, $331 = 0, $332 = 0.0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0.0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0;
 var $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $e = 0, $edge_list = 0;
 var $edges = 0, $face_count = 0, $faces = 0, $i = 0, $i1 = 0, $invis = 0, $mesh = 0, $n = 0, $normal = 0, $p = 0, $planes = 0, $sky = 0, $tex_b = 0.0, $tex_g = 0.0, $tex_r = 0.0, $texture_data = 0, $texture_info = 0, $texture_name = 0, $texture_string_data = 0, $texture_string_table = 0;
 var $triangle = 0, $v = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, $verts = 0, $vi = 0, $vnum = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp;
 $vararg_buffer = sp + 8|0;
 $normal = sp + 32|0;
 $triangle = sp + 44|0;
 $2 = sp + 100|0;
 $3 = sp + 112|0;
 $4 = sp + 116|0;
 $5 = sp + 124|0;
 $1 = $bsp_file;
 $6 = $1;
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)!=(1347633750);
 if ($8) {
  $0 = 1;
  $355 = $0;
  STACKTOP = sp;return ($355|0);
 }
 $9 = $1;
 $10 = (($9) + 4|0);
 $11 = HEAP32[$10>>2]|0;
 HEAP32[$vararg_buffer>>2] = $11;
 (_printf((48|0),($vararg_buffer|0))|0);
 $12 = $1;
 $13 = (($12) + 8|0);
 $14 = (($13) + 112|0);
 $15 = (($14) + 4|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = (($16>>>0) / 56)&-1;
 $face_count = $17;
 $18 = $1;
 $19 = $1;
 $20 = (($19) + 8|0);
 $21 = (($20) + 112|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = (($18) + ($22)|0);
 $faces = $23;
 $24 = $1;
 $25 = $1;
 $26 = (($25) + 8|0);
 $27 = (($26) + 208|0);
 $28 = HEAP32[$27>>2]|0;
 $29 = (($24) + ($28)|0);
 $edge_list = $29;
 $30 = $1;
 $31 = $1;
 $32 = (($31) + 8|0);
 $33 = (($32) + 192|0);
 $34 = HEAP32[$33>>2]|0;
 $35 = (($30) + ($34)|0);
 $edges = $35;
 $36 = $1;
 $37 = $1;
 $38 = (($37) + 8|0);
 $39 = (($38) + 48|0);
 $40 = HEAP32[$39>>2]|0;
 $41 = (($36) + ($40)|0);
 $verts = $41;
 $42 = $1;
 $43 = $1;
 $44 = (($43) + 8|0);
 $45 = (($44) + 16|0);
 $46 = HEAP32[$45>>2]|0;
 $47 = (($42) + ($46)|0);
 $planes = $47;
 $48 = $1;
 $49 = $1;
 $50 = (($49) + 8|0);
 $51 = (($50) + 96|0);
 $52 = HEAP32[$51>>2]|0;
 $53 = (($48) + ($52)|0);
 $texture_info = $53;
 $54 = $1;
 $55 = $1;
 $56 = (($55) + 8|0);
 $57 = (($56) + 32|0);
 $58 = HEAP32[$57>>2]|0;
 $59 = (($54) + ($58)|0);
 $texture_data = $59;
 $60 = $1;
 $61 = $1;
 $62 = (($61) + 8|0);
 $63 = (($62) + 704|0);
 $64 = HEAP32[$63>>2]|0;
 $65 = (($60) + ($64)|0);
 $texture_string_table = $65;
 $66 = $1;
 $67 = $1;
 $68 = (($67) + 8|0);
 $69 = (($68) + 688|0);
 $70 = HEAP32[$69>>2]|0;
 $71 = (($66) + ($70)|0);
 $texture_string_data = $71;
 $72 = $face_count;
 HEAP32[$vararg_buffer1>>2] = $72;
 (_printf((64|0),($vararg_buffer1|0))|0);
 HEAP32[8>>2] = 0;
 $i = 0;
 while(1) {
  $73 = $i;
  $74 = $face_count;
  $75 = ($73|0)<($74|0);
  if (!($75)) {
   break;
  }
  $76 = $i;
  $77 = $faces;
  $78 = (($77) + (($76*56)|0)|0);
  $79 = (($78) + 8|0);
  $80 = HEAP16[$79>>1]|0;
  $81 = $80 << 16 >> 16;
  $82 = (($81) - 2)|0;
  $83 = ($82*3)|0;
  $84 = HEAP32[8>>2]|0;
  $85 = (($84) + ($83))|0;
  HEAP32[8>>2] = $85;
  $86 = $i;
  $87 = (($86) + 1)|0;
  $i = $87;
 }
 $88 = HEAP32[8>>2]|0;
 $$arith = ($88*36)|0;
 $$overflow = ($88>>>0)>(119304647);
 $89 = $$overflow ? -1 : $$arith;
 $90 = (__Znaj($89)|0);
 $mesh = $90;
 $n = 0;
 $i1 = 0;
 while(1) {
  $91 = $i1;
  $92 = $face_count;
  $93 = ($91|0)<($92|0);
  if (!($93)) {
   break;
  }
  $94 = $i1;
  $95 = $faces;
  $96 = (($95) + (($94*56)|0)|0);
  $97 = (($96) + 10|0);
  $98 = HEAP16[$97>>1]|0;
  $99 = $98 << 16 >> 16;
  $100 = $texture_info;
  $101 = (($100) + (($99*72)|0)|0);
  $102 = (($101) + 64|0);
  $103 = HEAP32[$102>>2]|0;
  $104 = $103 & 6;
  $105 = ($104|0)!=(0);
  $106 = $105&1;
  $sky = $106;
  $107 = $i1;
  $108 = $faces;
  $109 = (($108) + (($107*56)|0)|0);
  $110 = (($109) + 10|0);
  $111 = HEAP16[$110>>1]|0;
  $112 = $111 << 16 >> 16;
  $113 = $texture_info;
  $114 = (($113) + (($112*72)|0)|0);
  $115 = (($114) + 68|0);
  $116 = HEAP32[$115>>2]|0;
  $117 = $texture_data;
  $118 = (($117) + ($116<<5)|0);
  $119 = (($118) + 12|0);
  $120 = HEAP32[$119>>2]|0;
  $121 = $texture_string_table;
  $122 = (($121) + ($120<<2)|0);
  $123 = HEAP32[$122>>2]|0;
  $124 = $texture_string_data;
  $125 = (($124) + ($123)|0);
  $texture_name = $125;
  $126 = $texture_name;
  $p = $126;
  while(1) {
   $127 = $p;
   $128 = HEAP8[$127>>0]|0;
   $129 = ($128<<24>>24)!=(0);
   if (!($129)) {
    break;
   }
   $130 = $p;
   $131 = HEAP8[$130>>0]|0;
   $132 = $131 << 24 >> 24;
   $133 = ($132|0)>(64);
   if ($133) {
    $134 = $p;
    $135 = HEAP8[$134>>0]|0;
    $136 = $135 << 24 >> 24;
    $137 = ($136|0)<(91);
    if ($137) {
     $138 = $p;
     $139 = HEAP8[$138>>0]|0;
     $140 = $139 << 24 >> 24;
     $141 = $140 | 96;
     $146 = $141;
    } else {
     label = 14;
    }
   } else {
    label = 14;
   }
   if ((label|0) == 14) {
    label = 0;
    $142 = $p;
    $143 = HEAP8[$142>>0]|0;
    $144 = $143 << 24 >> 24;
    $146 = $144;
   }
   $145 = $146&255;
   $147 = $p;
   HEAP8[$147>>0] = $145;
   $148 = $p;
   $149 = (($148) + 1|0);
   $p = $149;
  }
  $tex_r = 1.0;
  $tex_g = 1.0;
  $tex_b = 1.0;
  $invis = 0;
  $150 = $sky;
  $151 = $150&1;
  if ($151) {
   $tex_r = 0.5;
   $tex_g = 0.80000001192092896;
   $tex_b = 1.0;
  } else {
   $152 = $texture_name;
   $153 = (_strstr($152,80)|0);
   $154 = ($153|0)!=(0|0);
   if ($154) {
    $tex_r = 0.40000000596046448;
    $tex_g = 0.40000000596046448;
    $tex_b = 0.40000000596046448;
   } else {
    $155 = $texture_name;
    $156 = (_strstr($155,88)|0);
    $157 = ($156|0)!=(0|0);
    if ($157) {
     label = 23;
    } else {
     $158 = $texture_name;
     $159 = (_strstr($158,96)|0);
     $160 = ($159|0)!=(0|0);
     if ($160) {
      label = 23;
     } else {
      $161 = $texture_name;
      $162 = (_strstr($161,112)|0);
      $163 = ($162|0)!=(0|0);
      if ($163) {
       $tex_r = 0.80000001192092896;
       $tex_g = 0.60000002384185791;
       $tex_b = 0.40000000596046448;
      } else {
       $164 = $texture_name;
       $165 = (_strstr($164,120)|0);
       $166 = ($165|0)!=(0|0);
       if ($166) {
        $tex_r = 0.60000002384185791;
        $tex_g = 0.10000000149011612;
        $tex_b = 0.10000000149011612;
       } else {
        $167 = $texture_name;
        $168 = (_strstr($167,128)|0);
        $169 = ($168|0)!=(0|0);
        if ($169) {
         label = 31;
        } else {
         $170 = $texture_name;
         $171 = (_strstr($170,136)|0);
         $172 = ($171|0)!=(0|0);
         if ($172) {
          label = 31;
         } else {
          $173 = $texture_name;
          $174 = (_strstr($173,144)|0);
          $175 = ($174|0)!=(0|0);
          if ($175) {
           label = 31;
          } else {
           $176 = $texture_name;
           $177 = (_strstr($176,152)|0);
           $178 = ($177|0)!=(0|0);
           do {
            if ($178) {
             label = 34;
            } else {
             $179 = $texture_name;
             $180 = (_strstr($179,160)|0);
             $181 = ($180|0)!=(0|0);
             if ($181) {
              label = 34;
              break;
             }
             $182 = $texture_name;
             $183 = (_strstr($182,168)|0);
             $184 = ($183|0)!=(0|0);
             if ($184) {
              $tex_r = 0.20000000298023224;
              $tex_g = 0.60000002384185791;
              $tex_b = 0.20000000298023224;
             } else {
              $185 = $texture_name;
              $186 = (_strstr($185,176)|0);
              $187 = ($186|0)!=(0|0);
              if ($187) {
               $tex_r = 0.60000002384185791;
               $tex_g = 0.5;
               $tex_b = 0.60000002384185791;
              } else {
               $188 = $texture_name;
               $189 = (_strstr($188,184)|0);
               $190 = ($189|0)!=(0|0);
               do {
                if ($190) {
                 label = 41;
                } else {
                 $191 = $texture_name;
                 $192 = (_strstr($191,192)|0);
                 $193 = ($192|0)!=(0|0);
                 if ($193) {
                  label = 41;
                  break;
                 }
                 $194 = $texture_name;
                 $195 = (_strstr($194,200)|0);
                 $196 = ($195|0)!=(0|0);
                 if ($196) {
                  $tex_r = 0.0;
                  $tex_g = 0.5;
                  $tex_b = 0.5;
                 } else {
                  $197 = $texture_name;
                  $198 = (_strstr($197,208)|0);
                  $199 = ($198|0)!=(0|0);
                  if ($199) {
                   $tex_r = 1.0;
                   $tex_g = 1.0;
                   $tex_b = 0.0;
                  } else {
                   $200 = $texture_name;
                   $201 = (_strstr($200,224)|0);
                   $202 = ($201|0)!=(0|0);
                   if ($202) {
                    $tex_r = 0.0;
                    $tex_g = 0.0;
                    $tex_b = 0.0;
                   } else {
                    $203 = $texture_name;
                    $204 = (_strstr($203,232)|0);
                    $205 = ($204|0)!=(0|0);
                    if ($205) {
                     $invis = 1;
                    } else {
                    }
                   }
                  }
                 }
                }
               } while(0);
               if ((label|0) == 41) {
                label = 0;
                $tex_r = 0.5;
                $tex_g = 0.60000002384185791;
                $tex_b = 0.69999998807907104;
               }
              }
             }
            }
           } while(0);
           if ((label|0) == 34) {
            label = 0;
            $tex_r = 0.5;
            $tex_g = 0.40000000596046448;
            $tex_b = 0.30000001192092896;
           }
          }
         }
        }
        if ((label|0) == 31) {
         label = 0;
         $tex_r = 1.0;
         $tex_g = 0.89999997615814208;
         $tex_b = 0.89999997615814208;
        }
       }
      }
     }
    }
    if ((label|0) == 23) {
     label = 0;
     $tex_r = 0.60000002384185791;
     $tex_g = 0.60000002384185791;
     $tex_b = 0.60000002384185791;
    }
   }
  }
  $206 = $sky;
  $207 = $206&1;
  if ($207) {
   HEAPF32[$normal>>2] = 0.0;
   $208 = (($normal) + 4|0);
   HEAPF32[$208>>2] = 0.0;
   $209 = (($normal) + 8|0);
   HEAPF32[$209>>2] = 1.0;
  } else {
   $210 = $i1;
   $211 = $faces;
   $212 = (($211) + (($210*56)|0)|0);
   $213 = HEAP16[$212>>1]|0;
   $214 = $213&65535;
   $215 = $planes;
   $216 = (($215) + (($214*20)|0)|0);
   ;HEAP32[$normal+0>>2]=HEAP32[$216+0>>2]|0;HEAP32[$normal+4>>2]=HEAP32[$216+4>>2]|0;HEAP32[$normal+8>>2]=HEAP32[$216+8>>2]|0;
  }
  $vi = 0;
  $217 = $i1;
  $218 = $faces;
  $219 = (($218) + (($217*56)|0)|0);
  $220 = (($219) + 4|0);
  $221 = HEAP32[$220>>2]|0;
  $v = $221;
  while(1) {
   $222 = $v;
   $223 = $i1;
   $224 = $faces;
   $225 = (($224) + (($223*56)|0)|0);
   $226 = (($225) + 4|0);
   $227 = HEAP32[$226>>2]|0;
   $228 = $i1;
   $229 = $faces;
   $230 = (($229) + (($228*56)|0)|0);
   $231 = (($230) + 8|0);
   $232 = HEAP16[$231>>1]|0;
   $233 = $232 << 16 >> 16;
   $234 = (($227) + ($233))|0;
   $235 = ($222|0)<($234|0);
   if (!($235)) {
    break;
   }
   $236 = $v;
   $237 = $edge_list;
   $238 = (($237) + ($236<<2)|0);
   $239 = HEAP32[$238>>2]|0;
   $e = $239;
   $240 = $e;
   $241 = ($240|0)<(0);
   if ($241) {
    $242 = $e;
    $243 = (0 - ($242))|0;
    $244 = $edges;
    $245 = (($244) + ($243<<2)|0);
    $246 = (($245) + 2|0);
    $247 = HEAP16[$246>>1]|0;
    $248 = $247&65535;
    $vnum = $248;
   } else {
    $249 = $e;
    $250 = $edges;
    $251 = (($250) + ($249<<2)|0);
    $252 = HEAP16[$251>>1]|0;
    $253 = $252&65535;
    $vnum = $253;
   }
   $254 = $invis;
   $255 = $254&1;
   if ($255) {
    $256 = $vi;
    $257 = (($triangle) + (($256*12)|0)|0);
    HEAPF32[$257>>2] = 0.0;
    $258 = $vi;
    $259 = (($triangle) + (($258*12)|0)|0);
    $260 = (($259) + 4|0);
    HEAPF32[$260>>2] = 0.0;
    $261 = $vi;
    $262 = (($triangle) + (($261*12)|0)|0);
    $263 = (($262) + 8|0);
    HEAPF32[$263>>2] = 0.0;
   } else {
    $264 = $vi;
    $265 = (($264) + 1)|0;
    $vi = $265;
    $266 = (($triangle) + (($264*12)|0)|0);
    $267 = $vnum;
    $268 = $verts;
    $269 = (($268) + (($267*12)|0)|0);
    ;HEAP32[$266+0>>2]=HEAP32[$269+0>>2]|0;HEAP32[$266+4>>2]=HEAP32[$269+4>>2]|0;HEAP32[$266+8>>2]=HEAP32[$269+8>>2]|0;
   }
   $270 = $vi;
   $271 = ($270|0)>(2);
   if ($271) {
    $272 = $n;
    $273 = $mesh;
    $274 = (($273) + (($272*36)|0)|0);
    ;HEAP32[$274+0>>2]=HEAP32[$triangle+0>>2]|0;HEAP32[$274+4>>2]=HEAP32[$triangle+4>>2]|0;HEAP32[$274+8>>2]=HEAP32[$triangle+8>>2]|0;
    $275 = $n;
    $276 = $mesh;
    $277 = (($276) + (($275*36)|0)|0);
    $278 = (($277) + 12|0);
    ;HEAP32[$278+0>>2]=HEAP32[$normal+0>>2]|0;HEAP32[$278+4>>2]=HEAP32[$normal+4>>2]|0;HEAP32[$278+8>>2]=HEAP32[$normal+8>>2]|0;
    $279 = $tex_r;
    $280 = $n;
    $281 = $mesh;
    $282 = (($281) + (($280*36)|0)|0);
    $283 = (($282) + 24|0);
    HEAPF32[$283>>2] = $279;
    $284 = $tex_g;
    $285 = $n;
    $286 = $mesh;
    $287 = (($286) + (($285*36)|0)|0);
    $288 = (($287) + 28|0);
    HEAPF32[$288>>2] = $284;
    $289 = $tex_b;
    $290 = $n;
    $291 = (($290) + 1)|0;
    $n = $291;
    $292 = $mesh;
    $293 = (($292) + (($290*36)|0)|0);
    $294 = (($293) + 32|0);
    HEAPF32[$294>>2] = $289;
    $295 = $n;
    $296 = $mesh;
    $297 = (($296) + (($295*36)|0)|0);
    $298 = (($triangle) + 12|0);
    ;HEAP32[$297+0>>2]=HEAP32[$298+0>>2]|0;HEAP32[$297+4>>2]=HEAP32[$298+4>>2]|0;HEAP32[$297+8>>2]=HEAP32[$298+8>>2]|0;
    $299 = $n;
    $300 = $mesh;
    $301 = (($300) + (($299*36)|0)|0);
    $302 = (($301) + 12|0);
    ;HEAP32[$302+0>>2]=HEAP32[$normal+0>>2]|0;HEAP32[$302+4>>2]=HEAP32[$normal+4>>2]|0;HEAP32[$302+8>>2]=HEAP32[$normal+8>>2]|0;
    $303 = $tex_r;
    $304 = $n;
    $305 = $mesh;
    $306 = (($305) + (($304*36)|0)|0);
    $307 = (($306) + 24|0);
    HEAPF32[$307>>2] = $303;
    $308 = $tex_g;
    $309 = $n;
    $310 = $mesh;
    $311 = (($310) + (($309*36)|0)|0);
    $312 = (($311) + 28|0);
    HEAPF32[$312>>2] = $308;
    $313 = $tex_b;
    $314 = $n;
    $315 = (($314) + 1)|0;
    $n = $315;
    $316 = $mesh;
    $317 = (($316) + (($314*36)|0)|0);
    $318 = (($317) + 32|0);
    HEAPF32[$318>>2] = $313;
    $319 = $n;
    $320 = $mesh;
    $321 = (($320) + (($319*36)|0)|0);
    $322 = (($triangle) + 24|0);
    ;HEAP32[$321+0>>2]=HEAP32[$322+0>>2]|0;HEAP32[$321+4>>2]=HEAP32[$322+4>>2]|0;HEAP32[$321+8>>2]=HEAP32[$322+8>>2]|0;
    $323 = $n;
    $324 = $mesh;
    $325 = (($324) + (($323*36)|0)|0);
    $326 = (($325) + 12|0);
    ;HEAP32[$326+0>>2]=HEAP32[$normal+0>>2]|0;HEAP32[$326+4>>2]=HEAP32[$normal+4>>2]|0;HEAP32[$326+8>>2]=HEAP32[$normal+8>>2]|0;
    $327 = $tex_r;
    $328 = $n;
    $329 = $mesh;
    $330 = (($329) + (($328*36)|0)|0);
    $331 = (($330) + 24|0);
    HEAPF32[$331>>2] = $327;
    $332 = $tex_g;
    $333 = $n;
    $334 = $mesh;
    $335 = (($334) + (($333*36)|0)|0);
    $336 = (($335) + 28|0);
    HEAPF32[$336>>2] = $332;
    $337 = $tex_b;
    $338 = $n;
    $339 = (($338) + 1)|0;
    $n = $339;
    $340 = $mesh;
    $341 = (($340) + (($338*36)|0)|0);
    $342 = (($341) + 32|0);
    HEAPF32[$342>>2] = $337;
    $343 = (($triangle) + 12|0);
    $344 = (($triangle) + 24|0);
    ;HEAP32[$343+0>>2]=HEAP32[$344+0>>2]|0;HEAP32[$343+4>>2]=HEAP32[$344+4>>2]|0;HEAP32[$343+8>>2]=HEAP32[$344+8>>2]|0;
    $vi = 2;
   }
   $345 = $v;
   $346 = (($345) + 1)|0;
   $v = $346;
  }
  HEAP32[$3>>2] = 0;
  HEAP32[$4>>2] = 0;
  HEAP32[$5>>2] = 0;
  __ZN3glm5tvec3IfLNS_9precisionE0EEC2IiiiEERKT_RKT0_RKT1_($2,$3,$4,$5);
  (__ZN3glm5tvec3IfLNS_9precisionE0EEaSERKS2_(16,$2)|0);
  HEAPF32[32>>2] = 0.0;
  HEAPF32[40>>2] = 0.0;
  $347 = $i1;
  $348 = (($347) + 1)|0;
  $i1 = $348;
 }
 $349 = HEAP32[8>>2]|0;
 HEAP32[$vararg_buffer4>>2] = $349;
 (_printf((240|0),($vararg_buffer4|0))|0);
 $350 = $mesh;
 $351 = HEAP32[8>>2]|0;
 $352 = ($351*36)|0;
 __Z10load_vertsPvi($350,$352);
 $353 = $mesh;
 $354 = ($353|0)==(0|0);
 if (!($354)) {
  __ZdaPv($353);
 }
 $0 = 1;
 $355 = $0;
 STACKTOP = sp;return ($355|0);
}
function __ZN3glm5tvec3IfLNS_9precisionE0EEaSERKS2_($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF32[$3>>2];
 HEAPF32[$2>>2] = $4;
 $5 = $1;
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 $8 = (($2) + 4|0);
 HEAPF32[$8>>2] = $7;
 $9 = $1;
 $10 = (($9) + 8|0);
 $11 = +HEAPF32[$10>>2];
 $12 = (($2) + 8|0);
 HEAPF32[$12>>2] = $11;
 STACKTOP = sp;return ($2|0);
}
function __Z10load_vertsPvi($verts,$size) {
 $verts = $verts|0;
 $size = $size|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $verts;
 $1 = $size;
 $2 = HEAP32[264>>2]|0;
 _glBindBuffer(34962,($2|0));
 $3 = $1;
 $4 = $0;
 _glBufferData(34962,($3|0),($4|0),35044);
 STACKTOP = sp;return;
}
function __Z7doFramev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0.0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0.0, $46 = 0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0;
 var $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $aspect = 0.0, $cx = 0, $cy = 0, $dx = 0.0, $dy = 0.0, $fov = 0.0, $fwd = 0, $h = 0, $left = 0;
 var $matrix = 0, $speed = 0, $w = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 480|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $w = sp + 476|0;
 $h = sp + 472|0;
 $fwd = sp + 460|0;
 $0 = sp + 448|0;
 $1 = sp + 436|0;
 $2 = sp + 432|0;
 $3 = sp + 428|0;
 $4 = sp + 424|0;
 $left = sp + 412|0;
 $5 = sp + 400|0;
 $6 = sp + 396|0;
 $7 = sp + 392|0;
 $8 = sp + 388|0;
 $cx = sp + 384|0;
 $cy = sp + 380|0;
 $speed = sp + 184|0;
 $9 = sp + 160|0;
 $10 = sp + 172|0;
 $11 = sp + 188|0;
 $12 = sp + 264|0;
 $matrix = sp + 200|0;
 $13 = sp + 16|0;
 $14 = sp + 288|0;
 $15 = sp + 352|0;
 $16 = sp + 364|0;
 $17 = sp + 280|0;
 $18 = sp + 276|0;
 $19 = sp + 376|0;
 _glfwGetWindowSize(($w|0),($h|0));
 $20 = HEAP32[$h>>2]|0;
 $21 = ($20|0)>(0);
 if ($21) {
  $22 = HEAP32[$h>>2]|0;
  $23 = $22;
 } else {
  $23 = 1;
 }
 HEAP32[$h>>2] = $23;
 $24 = HEAP32[$w>>2]|0;
 $25 = HEAP32[$h>>2]|0;
 _glViewport(0,0,($24|0),($25|0));
 $26 = HEAP32[$w>>2]|0;
 $27 = (+($26|0));
 $28 = HEAP32[$h>>2]|0;
 $29 = (+($28|0));
 $30 = $27 / $29;
 $aspect = $30;
 HEAP32[$2>>2] = 1;
 HEAP32[$3>>2] = 0;
 HEAP32[$4>>2] = 0;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2IiiiEERKT_RKT0_RKT1_($1,$2,$3,$4);
 __ZN3glm7rotateYIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($0,$1,32);
 __ZN3glm7rotateZIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($fwd,$0,40);
 HEAP32[$6>>2] = 0;
 HEAP32[$7>>2] = 1;
 HEAP32[$8>>2] = 0;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2IiiiEERKT_RKT0_RKT1_($5,$6,$7,$8);
 __ZN3glm7rotateZIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($left,$5,40);
 $31 = (_glfwGetMouseButton(0)|0);
 $32 = ($31|0)!=(0);
 if ($32) {
  _glfwGetMousePos(($cx|0),($cy|0));
  $33 = HEAP8[280>>0]|0;
  $34 = $33&1;
  if ($34) {
   $35 = HEAP32[$cx>>2]|0;
   $36 = HEAP32[288>>2]|0;
   $37 = (($35) - ($36))|0;
   $38 = (+($37|0));
   $39 = HEAP32[$w>>2]|0;
   $40 = (+($39|0));
   $41 = $38 / $40;
   $dx = $41;
   $42 = HEAP32[$cy>>2]|0;
   $43 = HEAP32[296>>2]|0;
   $44 = (($42) - ($43))|0;
   $45 = (+($44|0));
   $46 = HEAP32[$h>>2]|0;
   $47 = (+($46|0));
   $48 = $45 / $47;
   $dy = $48;
   $49 = $dx;
   $50 = $49 * 3.0;
   $51 = $aspect;
   $52 = $50 * $51;
   $53 = +HEAPF32[40>>2];
   $54 = $53;
   $55 = $54 - $52;
   $56 = $55;
   HEAPF32[40>>2] = $56;
   $57 = $dy;
   $58 = $57 * 3.0;
   $59 = +HEAPF32[32>>2];
   $60 = $59;
   $61 = $60 + $58;
   $62 = $61;
   HEAPF32[32>>2] = $62;
   $63 = +HEAPF32[32>>2];
   $64 = $63;
   $65 = $64 < -1.5700000000000001;
   if ($65) {
    HEAPF32[32>>2] = -1.5700000524520874;
   }
   $66 = +HEAPF32[32>>2];
   $67 = $66;
   $68 = $67 > 1.5700000000000001;
   if ($68) {
    HEAPF32[32>>2] = 1.5700000524520874;
   }
   HEAPF32[$speed>>2] = 10.0;
   $69 = (_glfwGetKey(70)|0);
   $70 = ($69|0)!=(0);
   if ($70) {
    HEAPF32[$speed>>2] = 50.0;
   }
   $71 = (_glfwGetKey(87)|0);
   $72 = ($71|0)!=(0);
   if ($72) {
    __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($9,$fwd,$speed);
    (__ZN3glm5tvec3IfLNS_9precisionE0EEpLIfEERS2_RKNS0_IT_LS1_0EEE(16,$9)|0);
   } else {
    $73 = (_glfwGetKey(83)|0);
    $74 = ($73|0)!=(0);
    if ($74) {
     __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($10,$fwd,$speed);
     (__ZN3glm5tvec3IfLNS_9precisionE0EEmIIfEERS2_RKNS0_IT_LS1_0EEE(16,$10)|0);
    }
   }
   $75 = (_glfwGetKey(65)|0);
   $76 = ($75|0)!=(0);
   if ($76) {
    __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($11,$left,$speed);
    (__ZN3glm5tvec3IfLNS_9precisionE0EEpLIfEERS2_RKNS0_IT_LS1_0EEE(16,$11)|0);
   } else {
    $77 = (_glfwGetKey(68)|0);
    $78 = ($77|0)!=(0);
    if ($78) {
     __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($12,$left,$speed);
     (__ZN3glm5tvec3IfLNS_9precisionE0EEmIIfEERS2_RKNS0_IT_LS1_0EEE(16,$12)|0);
    }
   }
  } else {
   HEAP8[280>>0] = 1;
  }
  $79 = HEAP32[$cx>>2]|0;
  HEAP32[288>>2] = $79;
  $80 = HEAP32[$cy>>2]|0;
  HEAP32[296>>2] = $80;
 } else {
  $81 = HEAP8[280>>0]|0;
  $82 = $81&1;
  if ($82) {
   HEAP8[280>>0] = 0;
  }
 }
 _glClearColor(0.0,0.0,0.0,0.0);
 _glClear(16640);
 $83 = HEAP32[264>>2]|0;
 $84 = ($83|0)!=(0);
 if (!($84)) {
  _glfwSwapBuffers();
  STACKTOP = sp;return;
 }
 $fov = 90.0;
 $85 = $fov;
 $86 = $85 * 0.0087266462499999992;
 $87 = $aspect;
 __ZN3glm11perspectiveIdEENS_7tmat4x4IT_LNS_9precisionE0EEES2_S2_S2_S2_($13,$86,$87,1.0,4.0E+4);
 __ZN3glm7tmat4x4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($matrix,$13);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($15,16,$fwd);
 HEAP32[$17>>2] = 0;
 HEAP32[$18>>2] = 0;
 HEAP32[$19>>2] = 1;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2IiiiEERKT_RKT0_RKT1_($16,$17,$18,$19);
 __ZN3glm6lookAtIfLNS_9precisionE0EEENS_7tmat4x4IT_XT0_EEERKNS_5tvec3IS3_XT0_EEES8_S8_($14,16,$15,$16);
 (__ZN3glm7tmat4x4IfLNS_9precisionE0EEmLIfEERS2_RKNS0_IT_LS1_0EEE($matrix,$14)|0);
 $88 = HEAP32[272>>2]|0;
 _glUniformMatrix4fv(($88|0),1,0,($matrix|0));
 _glEnableVertexAttribArray(0);
 _glEnableVertexAttribArray(1);
 _glEnableVertexAttribArray(2);
 $89 = HEAP32[264>>2]|0;
 _glBindBuffer(34962,($89|0));
 _glVertexAttribPointer(0,3,5126,0,36,(0|0));
 _glVertexAttribPointer(1,3,5126,0,36,((12)|0));
 _glVertexAttribPointer(2,3,5126,0,36,((24)|0));
 $90 = HEAP32[8>>2]|0;
 _glDrawArrays(4,0,($90|0));
 _glDisableVertexAttribArray(0);
 _glDisableVertexAttribArray(1);
 _glDisableVertexAttribArray(2);
 _glfwSwapBuffers();
 STACKTOP = sp;return;
}
function __ZN3glm7rotateZIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($agg$result,$v,$angle) {
 $agg$result = $agg$result|0;
 $v = $v|0;
 $angle = $angle|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, $Cos = 0.0, $Sin = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = $v;
 $3 = $angle;
 $4 = $2;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKS2_($agg$result,$4);
 $5 = $3;
 $6 = +HEAPF32[$5>>2];
 $1 = $6;
 $7 = $1;
 $8 = (+Math_cos((+$7)));
 $Cos = $8;
 $9 = $3;
 $10 = +HEAPF32[$9>>2];
 $0 = $10;
 $11 = $0;
 $12 = (+Math_sin((+$11)));
 $Sin = $12;
 $13 = $2;
 $14 = +HEAPF32[$13>>2];
 $15 = $Cos;
 $16 = $14 * $15;
 $17 = $2;
 $18 = (($17) + 4|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $Sin;
 $21 = $19 * $20;
 $22 = $16 - $21;
 HEAPF32[$agg$result>>2] = $22;
 $23 = $2;
 $24 = +HEAPF32[$23>>2];
 $25 = $Sin;
 $26 = $24 * $25;
 $27 = $2;
 $28 = (($27) + 4|0);
 $29 = +HEAPF32[$28>>2];
 $30 = $Cos;
 $31 = $29 * $30;
 $32 = $26 + $31;
 $33 = (($agg$result) + 4|0);
 HEAPF32[$33>>2] = $32;
 STACKTOP = sp;return;
}
function __ZN3glm7rotateYIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($agg$result,$v,$angle) {
 $agg$result = $agg$result|0;
 $v = $v|0;
 $angle = $angle|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0.0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, $Cos = 0.0, $Sin = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = $v;
 $3 = $angle;
 $4 = $2;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKS2_($agg$result,$4);
 $5 = $3;
 $6 = +HEAPF32[$5>>2];
 $1 = $6;
 $7 = $1;
 $8 = (+Math_cos((+$7)));
 $Cos = $8;
 $9 = $3;
 $10 = +HEAPF32[$9>>2];
 $0 = $10;
 $11 = $0;
 $12 = (+Math_sin((+$11)));
 $Sin = $12;
 $13 = $2;
 $14 = +HEAPF32[$13>>2];
 $15 = $Cos;
 $16 = $14 * $15;
 $17 = $2;
 $18 = (($17) + 8|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $Sin;
 $21 = $19 * $20;
 $22 = $16 + $21;
 HEAPF32[$agg$result>>2] = $22;
 $23 = $2;
 $24 = +HEAPF32[$23>>2];
 $25 = -$24;
 $26 = $Sin;
 $27 = $25 * $26;
 $28 = $2;
 $29 = (($28) + 8|0);
 $30 = +HEAPF32[$29>>2];
 $31 = $Cos;
 $32 = $30 * $31;
 $33 = $27 + $32;
 $34 = (($agg$result) + 8|0);
 HEAPF32[$34>>2] = $33;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec3IfLNS_9precisionE0EEpLIfEERS2_RKNS0_IT_LS1_0EEE($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF32[$3>>2];
 $5 = +HEAPF32[$2>>2];
 $6 = $5 + $4;
 HEAPF32[$2>>2] = $6;
 $7 = $1;
 $8 = (($7) + 4|0);
 $9 = +HEAPF32[$8>>2];
 $10 = (($2) + 4|0);
 $11 = +HEAPF32[$10>>2];
 $12 = $11 + $9;
 HEAPF32[$10>>2] = $12;
 $13 = $1;
 $14 = (($13) + 8|0);
 $15 = +HEAPF32[$14>>2];
 $16 = (($2) + 8|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $17 + $15;
 HEAPF32[$16>>2] = $18;
 STACKTOP = sp;return ($2|0);
}
function __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($agg$result,$v,$scalar) {
 $agg$result = $agg$result|0;
 $v = $v|0;
 $scalar = $scalar|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0;
 var $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 4|0;
 $3 = sp + 8|0;
 $4 = sp + 12|0;
 $0 = $v;
 $1 = $scalar;
 $5 = $0;
 $6 = +HEAPF32[$5>>2];
 $7 = $1;
 $8 = +HEAPF32[$7>>2];
 $9 = $6 * $8;
 HEAPF32[$2>>2] = $9;
 $10 = $0;
 $11 = (($10) + 4|0);
 $12 = +HEAPF32[$11>>2];
 $13 = $1;
 $14 = +HEAPF32[$13>>2];
 $15 = $12 * $14;
 HEAPF32[$3>>2] = $15;
 $16 = $0;
 $17 = (($16) + 8|0);
 $18 = +HEAPF32[$17>>2];
 $19 = $1;
 $20 = +HEAPF32[$19>>2];
 $21 = $18 * $20;
 HEAPF32[$4>>2] = $21;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKfS4_S4_($agg$result,$2,$3,$4);
 STACKTOP = sp;return;
}
function __ZN3glm5tvec3IfLNS_9precisionE0EEmIIfEERS2_RKNS0_IT_LS1_0EEE($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF32[$3>>2];
 $5 = +HEAPF32[$2>>2];
 $6 = $5 - $4;
 HEAPF32[$2>>2] = $6;
 $7 = $1;
 $8 = (($7) + 4|0);
 $9 = +HEAPF32[$8>>2];
 $10 = (($2) + 4|0);
 $11 = +HEAPF32[$10>>2];
 $12 = $11 - $9;
 HEAPF32[$10>>2] = $12;
 $13 = $1;
 $14 = (($13) + 8|0);
 $15 = +HEAPF32[$14>>2];
 $16 = (($2) + 8|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $17 - $15;
 HEAPF32[$16>>2] = $18;
 STACKTOP = sp;return ($2|0);
}
function __ZN3glm11perspectiveIdEENS_7tmat4x4IT_LNS_9precisionE0EEES2_S2_S2_S2_($agg$result,$fovy,$aspect,$zNear,$zFar) {
 $agg$result = $agg$result|0;
 $fovy = +$fovy;
 $aspect = +$aspect;
 $zNear = +$zNear;
 $zFar = +$zFar;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $fovy;
 $1 = $aspect;
 $2 = $zNear;
 $3 = $zFar;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 __ZN3glm13perspectiveRHIdEENS_7tmat4x4IT_LNS_9precisionE0EEES2_S2_S2_S2_($agg$result,$4,$5,$6,$7);
 STACKTOP = sp;return;
}
function __ZN3glm7tmat4x4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($this,$m) {
 $this = $this|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 8|0;
 $3 = sp + 24|0;
 $4 = sp + 40|0;
 $5 = sp + 56|0;
 $0 = $this;
 $1 = $m;
 $6 = $0;
 $7 = (($6) + 64|0);
 $8 = $6;
 while(1) {
  __ZN3glm5tvec4IfLNS_9precisionE0EEC2Ev($8);
  $9 = (($8) + 16|0);
  $10 = ($9|0)==($7|0);
  if ($10) {
   break;
  } else {
   $8 = $9;
  }
 }
 $11 = $1;
 $12 = (__ZNK3glm7tmat4x4IdLNS_9precisionE0EEixEi($11,0)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($2,$12);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($6,$2)|0);
 $13 = (($6) + 16|0);
 $14 = $1;
 $15 = (__ZNK3glm7tmat4x4IdLNS_9precisionE0EEixEi($14,1)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($3,$15);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($13,$3)|0);
 $16 = (($6) + 32|0);
 $17 = $1;
 $18 = (__ZNK3glm7tmat4x4IdLNS_9precisionE0EEixEi($17,2)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($4,$18);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($16,$4)|0);
 $19 = (($6) + 48|0);
 $20 = $1;
 $21 = (__ZNK3glm7tmat4x4IdLNS_9precisionE0EEixEi($20,3)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($5,$21);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($19,$5)|0);
 STACKTOP = sp;return;
}
function __ZN3glm7tmat4x4IfLNS_9precisionE0EEmLIfEERS2_RKNS0_IT_LS1_0EEE($this,$m) {
 $this = $this|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 8|0;
 $0 = $this;
 $1 = $m;
 $3 = $0;
 $4 = $1;
 __ZN3glmmlIfLNS_9precisionE0EEENS_7tmat4x4IT_XT0_EEERKS4_S6_($2,$3,$4);
 $5 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEaSERKS2_($3,$2)|0);
 STACKTOP = sp;return ($5|0);
}
function __ZN3glm6lookAtIfLNS_9precisionE0EEENS_7tmat4x4IT_XT0_EEERKNS_5tvec3IS3_XT0_EEES8_S8_($agg$result,$eye,$center,$up) {
 $agg$result = $agg$result|0;
 $eye = $eye|0;
 $center = $center|0;
 $up = $up|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $eye;
 $1 = $center;
 $2 = $up;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 __ZN3glm8lookAtRHIfLNS_9precisionE0EEENS_7tmat4x4IT_XT0_EEERKNS_5tvec3IS3_XT0_EEES8_S8_($agg$result,$3,$4,$5);
 STACKTOP = sp;return;
}
function __ZN3glmplIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($agg$result,$v1,$v2) {
 $agg$result = $agg$result|0;
 $v1 = $v1|0;
 $v2 = $v2|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0.0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 4|0;
 $3 = sp + 8|0;
 $4 = sp + 12|0;
 $0 = $v1;
 $1 = $v2;
 $5 = $0;
 $6 = +HEAPF32[$5>>2];
 $7 = $1;
 $8 = +HEAPF32[$7>>2];
 $9 = $6 + $8;
 HEAPF32[$2>>2] = $9;
 $10 = $0;
 $11 = (($10) + 4|0);
 $12 = +HEAPF32[$11>>2];
 $13 = $1;
 $14 = (($13) + 4|0);
 $15 = +HEAPF32[$14>>2];
 $16 = $12 + $15;
 HEAPF32[$3>>2] = $16;
 $17 = $0;
 $18 = (($17) + 8|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $1;
 $21 = (($20) + 8|0);
 $22 = +HEAPF32[$21>>2];
 $23 = $19 + $22;
 HEAPF32[$4>>2] = $23;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKfS4_S4_($agg$result,$2,$3,$4);
 STACKTOP = sp;return;
}
function _initRenderer($w,$h) {
 $w = $w|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $fragment_shader = 0, $fs = 0, $prog = 0, $vertex_shader = 0, $vs = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vertex_shader = sp + 8|0;
 $fragment_shader = sp + 12|0;
 $1 = $w;
 $2 = $h;
 $3 = HEAP32[256>>2]|0;
 $4 = ($3|0)!=(0);
 if ($4) {
  $0 = 304;
  $26 = $0;
  STACKTOP = sp;return ($26|0);
 }
 $5 = (_glfwInit()|0);
 $6 = ($5|0)!=(1);
 if ($6) {
  _glfwTerminate();
  $0 = 336;
  $26 = $0;
  STACKTOP = sp;return ($26|0);
 }
 $7 = $1;
 $8 = $2;
 $9 = (_glfwOpenWindow(($7|0),($8|0),8,8,8,8,16,0,65537)|0);
 $10 = ($9|0)!=(1);
 if ($10) {
  _glfwTerminate();
  $0 = 360;
  $26 = $0;
  STACKTOP = sp;return ($26|0);
 } else {
  _glEnable(2929);
  _glEnable(2884);
  _glFrontFace(2304);
  HEAP32[$vertex_shader>>2] = 392;
  HEAP32[$fragment_shader>>2] = 672;
  $11 = (_glCreateShader(35633)|0);
  $vs = $11;
  $12 = $vs;
  _glShaderSource(($12|0),1,($vertex_shader|0),(0|0));
  $13 = $vs;
  _glCompileShader(($13|0));
  $14 = (_glCreateShader(35632)|0);
  $fs = $14;
  $15 = $fs;
  _glShaderSource(($15|0),1,($fragment_shader|0),(0|0));
  $16 = $fs;
  _glCompileShader(($16|0));
  $17 = (_glCreateProgram()|0);
  $prog = $17;
  $18 = $prog;
  $19 = $fs;
  _glAttachShader(($18|0),($19|0));
  $20 = $prog;
  $21 = $vs;
  _glAttachShader(($20|0),($21|0));
  $22 = $prog;
  _glLinkProgram(($22|0));
  $23 = $prog;
  _glUseProgram(($23|0));
  $24 = $prog;
  $25 = (_glGetUniformLocation(($24|0),(760|0))|0);
  HEAP32[272>>2] = $25;
  _emscripten_set_main_loop((16|0),0,0);
  _glGenBuffers(1,(264|0));
  HEAP32[256>>2] = 1;
  $0 = 0;
  $26 = $0;
  STACKTOP = sp;return ($26|0);
 }
 return (0)|0;
}
function __ZN3glm7tmat4x4IfLNS_9precisionE0EEaSERKS2_($this,$m) {
 $this = $this|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $m;
 $2 = $0;
 $3 = $1;
 $4 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($3,0)|0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($2,$4)|0);
 $5 = (($2) + 16|0);
 $6 = $1;
 $7 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($6,1)|0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($5,$7)|0);
 $8 = (($2) + 32|0);
 $9 = $1;
 $10 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($9,2)|0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($8,$10)|0);
 $11 = (($2) + 48|0);
 $12 = $1;
 $13 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($12,3)|0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($11,$13)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN3glmmlIfLNS_9precisionE0EEENS_7tmat4x4IT_XT0_EEERKS4_S6_($agg$result,$m1,$m2) {
 $agg$result = $agg$result|0;
 $m1 = $m1|0;
 $m2 = $m2|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0.0, $53 = 0, $54 = 0.0, $55 = 0, $56 = 0, $57 = 0.0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0, $61 = 0.0, $62 = 0;
 var $63 = 0.0, $64 = 0, $65 = 0, $66 = 0.0, $67 = 0, $68 = 0.0, $69 = 0, $7 = 0, $70 = 0.0, $71 = 0, $72 = 0.0, $73 = 0, $74 = 0, $75 = 0.0, $76 = 0, $77 = 0.0, $78 = 0, $79 = 0.0, $8 = 0, $80 = 0;
 var $81 = 0.0, $9 = 0, $SrcA0 = 0, $SrcA1 = 0, $SrcA2 = 0, $SrcA3 = 0, $SrcB0 = 0, $SrcB1 = 0, $SrcB2 = 0, $SrcB3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $SrcA0 = sp + 560|0;
 $SrcA1 = sp + 544|0;
 $SrcA2 = sp + 528|0;
 $SrcA3 = sp + 512|0;
 $SrcB0 = sp + 496|0;
 $SrcB1 = sp + 480|0;
 $SrcB2 = sp + 464|0;
 $SrcB3 = sp + 448|0;
 $2 = sp + 432|0;
 $3 = sp + 416|0;
 $4 = sp + 400|0;
 $5 = sp + 384|0;
 $6 = sp + 368|0;
 $7 = sp + 352|0;
 $8 = sp + 336|0;
 $9 = sp + 320|0;
 $10 = sp + 304|0;
 $11 = sp + 288|0;
 $12 = sp + 112|0;
 $13 = sp;
 $14 = sp + 16|0;
 $15 = sp + 32|0;
 $16 = sp + 48|0;
 $17 = sp + 64|0;
 $18 = sp + 80|0;
 $19 = sp + 96|0;
 $20 = sp + 128|0;
 $21 = sp + 144|0;
 $22 = sp + 160|0;
 $23 = sp + 176|0;
 $24 = sp + 192|0;
 $25 = sp + 208|0;
 $26 = sp + 224|0;
 $27 = sp + 240|0;
 $28 = sp + 256|0;
 $29 = sp + 272|0;
 $0 = $m1;
 $1 = $m2;
 $30 = $0;
 $31 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($30,0)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcA0,$31);
 $32 = $0;
 $33 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($32,1)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcA1,$33);
 $34 = $0;
 $35 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($34,2)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcA2,$35);
 $36 = $0;
 $37 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($36,3)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcA3,$37);
 $38 = $1;
 $39 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($38,0)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcB0,$39);
 $40 = $1;
 $41 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($40,1)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcB1,$41);
 $42 = $1;
 $43 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($42,2)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcB2,$43);
 $44 = $1;
 $45 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($44,3)|0);
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($SrcB3,$45);
 __ZN3glm7tmat4x4IfLNS_9precisionE0EEC2ENS_4ctorE($agg$result,0);
 $46 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,0)|0);
 $47 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB0,0)|0);
 $48 = +HEAPF32[$47>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($5,$SrcA0,$48);
 $49 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB0,1)|0);
 $50 = +HEAPF32[$49>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($6,$SrcA1,$50);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($4,$5,$6);
 $51 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB0,2)|0);
 $52 = +HEAPF32[$51>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($7,$SrcA2,$52);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($3,$4,$7);
 $53 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB0,3)|0);
 $54 = +HEAPF32[$53>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($8,$SrcA3,$54);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($2,$3,$8);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($46,$2)|0);
 $55 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,1)|0);
 $56 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB1,0)|0);
 $57 = +HEAPF32[$56>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($12,$SrcA0,$57);
 $58 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB1,1)|0);
 $59 = +HEAPF32[$58>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($13,$SrcA1,$59);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($11,$12,$13);
 $60 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB1,2)|0);
 $61 = +HEAPF32[$60>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($14,$SrcA2,$61);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($10,$11,$14);
 $62 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB1,3)|0);
 $63 = +HEAPF32[$62>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($15,$SrcA3,$63);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($9,$10,$15);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($55,$9)|0);
 $64 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,2)|0);
 $65 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB2,0)|0);
 $66 = +HEAPF32[$65>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($19,$SrcA0,$66);
 $67 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB2,1)|0);
 $68 = +HEAPF32[$67>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($20,$SrcA1,$68);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($18,$19,$20);
 $69 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB2,2)|0);
 $70 = +HEAPF32[$69>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($21,$SrcA2,$70);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($17,$18,$21);
 $71 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB2,3)|0);
 $72 = +HEAPF32[$71>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($22,$SrcA3,$72);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($16,$17,$22);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($64,$16)|0);
 $73 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,3)|0);
 $74 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB3,0)|0);
 $75 = +HEAPF32[$74>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($26,$SrcA0,$75);
 $76 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB3,1)|0);
 $77 = +HEAPF32[$76>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($27,$SrcA1,$77);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($25,$26,$27);
 $78 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB3,2)|0);
 $79 = +HEAPF32[$78>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($28,$SrcA2,$79);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($24,$25,$28);
 $80 = (__ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($SrcB3,3)|0);
 $81 = +HEAPF32[$80>>2];
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($29,$SrcA3,$81);
 __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($23,$24,$29);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($73,$23)|0);
 STACKTOP = sp;return;
}
function __ZNK3glm7tmat4x4IfLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EE6lengthEv($2)|0);
 $5 = ($3|0)<($4|0);
 if ($5) {
  $6 = $1;
  $7 = (($2) + ($6<<4)|0);
  STACKTOP = sp;return ($7|0);
 } else {
  ___assert_fail((904|0),(928|0),363,(888|0));
  // unreachable;
 }
 return (0)|0;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2ERKS2_($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF32[$3>>2];
 HEAPF32[$2>>2] = $4;
 $5 = (($2) + 4|0);
 $6 = $1;
 $7 = (($6) + 4|0);
 $8 = +HEAPF32[$7>>2];
 HEAPF32[$5>>2] = $8;
 $9 = (($2) + 8|0);
 $10 = $1;
 $11 = (($10) + 8|0);
 $12 = +HEAPF32[$11>>2];
 HEAPF32[$9>>2] = $12;
 $13 = (($2) + 12|0);
 $14 = $1;
 $15 = (($14) + 12|0);
 $16 = +HEAPF32[$15>>2];
 HEAPF32[$13>>2] = $16;
 STACKTOP = sp;return;
}
function __ZN3glm7tmat4x4IfLNS_9precisionE0EEC2ENS_4ctorE($this,$0) {
 $this = $this|0;
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $this;
 $2 = $0;
 $3 = $1;
 $4 = (($3) + 64|0);
 $5 = $3;
 while(1) {
  __ZN3glm5tvec4IfLNS_9precisionE0EEC2Ev($5);
  $6 = (($5) + 16|0);
  $7 = ($6|0)==($4|0);
  if ($7) {
   break;
  } else {
   $5 = $6;
  }
 }
 STACKTOP = sp;return;
}
function __ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = (__ZNK3glm7tmat4x4IfLNS_9precisionE0EE6lengthEv($2)|0);
 $5 = ($3|0)<($4|0);
 if ($5) {
  $6 = $1;
  $7 = (($2) + ($6<<4)|0);
  STACKTOP = sp;return ($7|0);
 } else {
  ___assert_fail((904|0),(928|0),356,(888|0));
  // unreachable;
 }
 return (0)|0;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF32[$3>>2];
 HEAPF32[$2>>2] = $4;
 $5 = $1;
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 $8 = (($2) + 4|0);
 HEAPF32[$8>>2] = $7;
 $9 = $1;
 $10 = (($9) + 8|0);
 $11 = +HEAPF32[$10>>2];
 $12 = (($2) + 8|0);
 HEAPF32[$12>>2] = $11;
 $13 = $1;
 $14 = (($13) + 12|0);
 $15 = +HEAPF32[$14>>2];
 $16 = (($2) + 12|0);
 HEAPF32[$16>>2] = $15;
 STACKTOP = sp;return ($2|0);
}
function __ZN3glmplIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S6_($agg$result,$v1,$v2) {
 $agg$result = $agg$result|0;
 $v1 = $v1|0;
 $v2 = $v2|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0, $25 = 0, $26 = 0.0;
 var $27 = 0.0, $3 = 0.0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $v1;
 $1 = $v2;
 $2 = $0;
 $3 = +HEAPF32[$2>>2];
 $4 = $1;
 $5 = +HEAPF32[$4>>2];
 $6 = $3 + $5;
 $7 = $0;
 $8 = (($7) + 4|0);
 $9 = +HEAPF32[$8>>2];
 $10 = $1;
 $11 = (($10) + 4|0);
 $12 = +HEAPF32[$11>>2];
 $13 = $9 + $12;
 $14 = $0;
 $15 = (($14) + 8|0);
 $16 = +HEAPF32[$15>>2];
 $17 = $1;
 $18 = (($17) + 8|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $16 + $19;
 $21 = $0;
 $22 = (($21) + 12|0);
 $23 = +HEAPF32[$22>>2];
 $24 = $1;
 $25 = (($24) + 12|0);
 $26 = +HEAPF32[$25>>2];
 $27 = $23 + $26;
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2Effff($agg$result,$6,$13,$20,$27);
 STACKTOP = sp;return;
}
function __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec4IT_XT0_EEERKS4_S3_($agg$result,$v,$scalar) {
 $agg$result = $agg$result|0;
 $v = $v|0;
 $scalar = +$scalar;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0.0;
 var $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $v;
 $1 = $scalar;
 $2 = $0;
 $3 = +HEAPF32[$2>>2];
 $4 = $1;
 $5 = $3 * $4;
 $6 = $0;
 $7 = (($6) + 4|0);
 $8 = +HEAPF32[$7>>2];
 $9 = $1;
 $10 = $8 * $9;
 $11 = $0;
 $12 = (($11) + 8|0);
 $13 = +HEAPF32[$12>>2];
 $14 = $1;
 $15 = $13 * $14;
 $16 = $0;
 $17 = (($16) + 12|0);
 $18 = +HEAPF32[$17>>2];
 $19 = $1;
 $20 = $18 * $19;
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2Effff($agg$result,$5,$10,$15,$20);
 STACKTOP = sp;return;
}
function __ZNK3glm5tvec4IfLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = ($3|0)>=(0);
 if ($4) {
  $5 = $1;
  $6 = (__ZN3glm6detail15component_countINS_5tvec4IfLNS_9precisionE0EEEEEiRKT_($2)|0);
  $7 = ($5|0)<($6|0);
  if ($7) {
   $8 = $1;
   $9 = (($2) + ($8<<2)|0);
   STACKTOP = sp;return ($9|0);
  }
 }
 ___assert_fail((768|0),(856|0),244,(888|0));
 // unreachable;
 return (0)|0;
}
function __ZN3glm6detail15component_countINS_5tvec4IfLNS_9precisionE0EEEEEiRKT_($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (__ZNK3glm5tvec4IfLNS_9precisionE0EE6lengthEv($1)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZNK3glm5tvec4IfLNS_9precisionE0EE6lengthEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 STACKTOP = sp;return 4;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2Effff($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = +$a;
 $b = +$b;
 $c = +$c;
 $d = +$d;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0, $12 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 HEAPF32[$5>>2] = $6;
 $7 = (($5) + 4|0);
 $8 = $2;
 HEAPF32[$7>>2] = $8;
 $9 = (($5) + 8|0);
 $10 = $3;
 HEAPF32[$9>>2] = $10;
 $11 = (($5) + 12|0);
 $12 = $4;
 HEAPF32[$11>>2] = $12;
 STACKTOP = sp;return;
}
function __ZNK3glm7tmat4x4IfLNS_9precisionE0EE6lengthEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 STACKTOP = sp;return 4;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2Ev($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $0;
 HEAPF32[$1>>2] = 0.0;
 $2 = (($1) + 4|0);
 HEAPF32[$2>>2] = 0.0;
 $3 = (($1) + 8|0);
 HEAPF32[$3>>2] = 0.0;
 $4 = (($1) + 12|0);
 HEAPF32[$4>>2] = 0.0;
 STACKTOP = sp;return;
}
function __ZN3glm8lookAtRHIfLNS_9precisionE0EEENS_7tmat4x4IT_XT0_EEERKNS_5tvec3IS3_XT0_EEES8_S8_($agg$result,$eye,$center,$up) {
 $agg$result = $agg$result|0;
 $eye = $eye|0;
 $center = $center|0;
 $up = $up|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0.0, $53 = 0, $54 = 0, $55 = 0, $56 = 0.0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0.0, $f = 0;
 var $s = 0, $u = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f = sp + 52|0;
 $3 = sp + 40|0;
 $s = sp + 24|0;
 $4 = sp + 12|0;
 $u = sp;
 $5 = sp + 36|0;
 $0 = $eye;
 $1 = $center;
 $2 = $up;
 $6 = $1;
 $7 = $0;
 __ZN3glmmiIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($3,$6,$7);
 __ZN3glm9normalizeIfLNS_9precisionE0ENS_5tvec3EEET1_IT_XT0_EERKS4_($f,$3);
 $8 = $2;
 __ZN3glm5crossIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($4,$f,$8);
 __ZN3glm9normalizeIfLNS_9precisionE0ENS_5tvec3EEET1_IT_XT0_EERKS4_($s,$4);
 __ZN3glm5crossIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($u,$s,$f);
 HEAPF32[$5>>2] = 1.0;
 __ZN3glm7tmat4x4IfLNS_9precisionE0EEC2ERKf($agg$result,$5);
 $9 = +HEAPF32[$s>>2];
 $10 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,0)|0);
 $11 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($10,0)|0);
 HEAPF32[$11>>2] = $9;
 $12 = (($s) + 4|0);
 $13 = +HEAPF32[$12>>2];
 $14 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,1)|0);
 $15 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($14,0)|0);
 HEAPF32[$15>>2] = $13;
 $16 = (($s) + 8|0);
 $17 = +HEAPF32[$16>>2];
 $18 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,2)|0);
 $19 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($18,0)|0);
 HEAPF32[$19>>2] = $17;
 $20 = +HEAPF32[$u>>2];
 $21 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,0)|0);
 $22 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($21,1)|0);
 HEAPF32[$22>>2] = $20;
 $23 = (($u) + 4|0);
 $24 = +HEAPF32[$23>>2];
 $25 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,1)|0);
 $26 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($25,1)|0);
 HEAPF32[$26>>2] = $24;
 $27 = (($u) + 8|0);
 $28 = +HEAPF32[$27>>2];
 $29 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,2)|0);
 $30 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($29,1)|0);
 HEAPF32[$30>>2] = $28;
 $31 = +HEAPF32[$f>>2];
 $32 = -$31;
 $33 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,0)|0);
 $34 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($33,2)|0);
 HEAPF32[$34>>2] = $32;
 $35 = (($f) + 4|0);
 $36 = +HEAPF32[$35>>2];
 $37 = -$36;
 $38 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,1)|0);
 $39 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($38,2)|0);
 HEAPF32[$39>>2] = $37;
 $40 = (($f) + 8|0);
 $41 = +HEAPF32[$40>>2];
 $42 = -$41;
 $43 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,2)|0);
 $44 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($43,2)|0);
 HEAPF32[$44>>2] = $42;
 $45 = $0;
 $46 = (+__ZN3glm3dotIfLNS_9precisionE0ENS_5tvec3EEET_RKT1_IS3_XT0_EES6_($s,$45));
 $47 = -$46;
 $48 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,3)|0);
 $49 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($48,0)|0);
 HEAPF32[$49>>2] = $47;
 $50 = $0;
 $51 = (+__ZN3glm3dotIfLNS_9precisionE0ENS_5tvec3EEET_RKT1_IS3_XT0_EES6_($u,$50));
 $52 = -$51;
 $53 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,3)|0);
 $54 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($53,1)|0);
 HEAPF32[$54>>2] = $52;
 $55 = $0;
 $56 = (+__ZN3glm3dotIfLNS_9precisionE0ENS_5tvec3EEET_RKT1_IS3_XT0_EES6_($f,$55));
 $57 = (__ZN3glm7tmat4x4IfLNS_9precisionE0EEixEi($agg$result,3)|0);
 $58 = (__ZN3glm5tvec4IfLNS_9precisionE0EEixEi($57,2)|0);
 HEAPF32[$58>>2] = $56;
 STACKTOP = sp;return;
}
function __ZN3glm9normalizeIfLNS_9precisionE0ENS_5tvec3EEET1_IT_XT0_EERKS4_($agg$result,$x) {
 $agg$result = $agg$result|0;
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = sp;
 $0 = $x;
 $2 = $0;
 $3 = $0;
 $4 = $0;
 $5 = (+__ZN3glm3dotIfLNS_9precisionE0ENS_5tvec3EEET_RKT1_IS3_XT0_EES6_($3,$4));
 $6 = (+__ZN3glm11inversesqrtIfEET_S1_($5));
 HEAPF32[$1>>2] = $6;
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_RKS3_($agg$result,$2,$1);
 STACKTOP = sp;return;
}
function __ZN3glmmiIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($agg$result,$v1,$v2) {
 $agg$result = $agg$result|0;
 $v1 = $v1|0;
 $v2 = $v2|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0.0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 4|0;
 $3 = sp + 8|0;
 $4 = sp + 12|0;
 $0 = $v1;
 $1 = $v2;
 $5 = $0;
 $6 = +HEAPF32[$5>>2];
 $7 = $1;
 $8 = +HEAPF32[$7>>2];
 $9 = $6 - $8;
 HEAPF32[$2>>2] = $9;
 $10 = $0;
 $11 = (($10) + 4|0);
 $12 = +HEAPF32[$11>>2];
 $13 = $1;
 $14 = (($13) + 4|0);
 $15 = +HEAPF32[$14>>2];
 $16 = $12 - $15;
 HEAPF32[$3>>2] = $16;
 $17 = $0;
 $18 = (($17) + 8|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $1;
 $21 = (($20) + 8|0);
 $22 = +HEAPF32[$21>>2];
 $23 = $19 - $22;
 HEAPF32[$4>>2] = $23;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKfS4_S4_($agg$result,$2,$3,$4);
 STACKTOP = sp;return;
}
function __ZN3glm5crossIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($agg$result,$x,$y) {
 $agg$result = $agg$result|0;
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0;
 var $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0.0, $35 = 0, $36 = 0, $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0, $43 = 0.0, $44 = 0.0;
 var $45 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 4|0;
 $3 = sp + 8|0;
 $4 = sp + 12|0;
 $0 = $x;
 $1 = $y;
 $5 = $0;
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 $8 = $1;
 $9 = (($8) + 8|0);
 $10 = +HEAPF32[$9>>2];
 $11 = $7 * $10;
 $12 = $1;
 $13 = (($12) + 4|0);
 $14 = +HEAPF32[$13>>2];
 $15 = $0;
 $16 = (($15) + 8|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $14 * $17;
 $19 = $11 - $18;
 HEAPF32[$2>>2] = $19;
 $20 = $0;
 $21 = (($20) + 8|0);
 $22 = +HEAPF32[$21>>2];
 $23 = $1;
 $24 = +HEAPF32[$23>>2];
 $25 = $22 * $24;
 $26 = $1;
 $27 = (($26) + 8|0);
 $28 = +HEAPF32[$27>>2];
 $29 = $0;
 $30 = +HEAPF32[$29>>2];
 $31 = $28 * $30;
 $32 = $25 - $31;
 HEAPF32[$3>>2] = $32;
 $33 = $0;
 $34 = +HEAPF32[$33>>2];
 $35 = $1;
 $36 = (($35) + 4|0);
 $37 = +HEAPF32[$36>>2];
 $38 = $34 * $37;
 $39 = $1;
 $40 = +HEAPF32[$39>>2];
 $41 = $0;
 $42 = (($41) + 4|0);
 $43 = +HEAPF32[$42>>2];
 $44 = $40 * $43;
 $45 = $38 - $44;
 HEAPF32[$4>>2] = $45;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKfS4_S4_($agg$result,$2,$3,$4);
 STACKTOP = sp;return;
}
function __ZN3glm7tmat4x4IfLNS_9precisionE0EEC2ERKf($this,$s) {
 $this = $this|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 8|0;
 $3 = sp + 24|0;
 $4 = sp + 40|0;
 $5 = sp + 56|0;
 $0 = $this;
 $1 = $s;
 $6 = $0;
 $7 = (($6) + 64|0);
 $8 = $6;
 while(1) {
  __ZN3glm5tvec4IfLNS_9precisionE0EEC2Ev($8);
  $9 = (($8) + 16|0);
  $10 = ($9|0)==($7|0);
  if ($10) {
   break;
  } else {
   $8 = $9;
  }
 }
 $11 = $1;
 $12 = +HEAPF32[$11>>2];
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IfiiiEET_T0_T1_T2_($2,$12,0,0,0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($6,$2)|0);
 $13 = (($6) + 16|0);
 $14 = $1;
 $15 = +HEAPF32[$14>>2];
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IifiiEET_T0_T1_T2_($3,0,$15,0,0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($13,$3)|0);
 $16 = (($6) + 32|0);
 $17 = $1;
 $18 = +HEAPF32[$17>>2];
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IiifiEET_T0_T1_T2_($4,0,0,$18,0);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($16,$4)|0);
 $19 = (($6) + 48|0);
 $20 = $1;
 $21 = +HEAPF32[$20>>2];
 __ZN3glm5tvec4IfLNS_9precisionE0EEC2IiiifEET_T0_T1_T2_($5,0,0,0,$21);
 (__ZN3glm5tvec4IfLNS_9precisionE0EEaSERKS2_($19,$5)|0);
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = ($3|0)>=(0);
 if ($4) {
  $5 = $1;
  $6 = (__ZN3glm6detail15component_countINS_5tvec4IfLNS_9precisionE0EEEEEiRKT_($2)|0);
  $7 = ($5|0)<($6|0);
  if ($7) {
   $8 = $1;
   $9 = (($2) + ($8<<2)|0);
   STACKTOP = sp;return ($9|0);
  }
 }
 ___assert_fail((768|0),(856|0),237,(888|0));
 // unreachable;
 return (0)|0;
}
function __ZN3glm3dotIfLNS_9precisionE0ENS_5tvec3EEET_RKT1_IS3_XT0_EES6_($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0;
 $3 = $1;
 $4 = (+__ZN3glm6detail11compute_dotINS_5tvec3EfLNS_9precisionE0EE4callERKNS2_IfLS3_0EEES7_($2,$3));
 STACKTOP = sp;return (+$4);
}
function __ZN3glm6detail11compute_dotINS_5tvec3EfLNS_9precisionE0EE4callERKNS2_IfLS3_0EEES7_($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0.0, $tmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $tmp = sp + 4|0;
 $0 = $x;
 $1 = $y;
 $2 = $0;
 $3 = $1;
 __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($tmp,$2,$3);
 $4 = +HEAPF32[$tmp>>2];
 $5 = (($tmp) + 4|0);
 $6 = +HEAPF32[$5>>2];
 $7 = $4 + $6;
 $8 = (($tmp) + 8|0);
 $9 = +HEAPF32[$8>>2];
 $10 = $7 + $9;
 STACKTOP = sp;return (+$10);
}
function __ZN3glmmlIfLNS_9precisionE0EEENS_5tvec3IT_XT0_EEERKS4_S6_($agg$result,$v1,$v2) {
 $agg$result = $agg$result|0;
 $v1 = $v1|0;
 $v2 = $v2|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0.0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 4|0;
 $3 = sp + 8|0;
 $4 = sp + 12|0;
 $0 = $v1;
 $1 = $v2;
 $5 = $0;
 $6 = +HEAPF32[$5>>2];
 $7 = $1;
 $8 = +HEAPF32[$7>>2];
 $9 = $6 * $8;
 HEAPF32[$2>>2] = $9;
 $10 = $0;
 $11 = (($10) + 4|0);
 $12 = +HEAPF32[$11>>2];
 $13 = $1;
 $14 = (($13) + 4|0);
 $15 = +HEAPF32[$14>>2];
 $16 = $12 * $15;
 HEAPF32[$3>>2] = $16;
 $17 = $0;
 $18 = (($17) + 8|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $1;
 $21 = (($20) + 8|0);
 $22 = +HEAPF32[$21>>2];
 $23 = $19 * $22;
 HEAPF32[$4>>2] = $23;
 __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKfS4_S4_($agg$result,$2,$3,$4);
 STACKTOP = sp;return;
}
function __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKfS4_S4_($this,$a,$b,$c) {
 $this = $this|0;
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $0;
 $5 = $1;
 $6 = +HEAPF32[$5>>2];
 HEAPF32[$4>>2] = $6;
 $7 = (($4) + 4|0);
 $8 = $2;
 $9 = +HEAPF32[$8>>2];
 HEAPF32[$7>>2] = $9;
 $10 = (($4) + 8|0);
 $11 = $3;
 $12 = +HEAPF32[$11>>2];
 HEAPF32[$10>>2] = $12;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2IfiiiEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = +$a;
 $b = $b|0;
 $c = $c|0;
 $d = $d|0;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 HEAPF32[$5>>2] = $6;
 $7 = (($5) + 4|0);
 $8 = $2;
 $9 = (+($8|0));
 HEAPF32[$7>>2] = $9;
 $10 = (($5) + 8|0);
 $11 = $3;
 $12 = (+($11|0));
 HEAPF32[$10>>2] = $12;
 $13 = (($5) + 12|0);
 $14 = $4;
 $15 = (+($14|0));
 HEAPF32[$13>>2] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2IifiiEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = $a|0;
 $b = +$b;
 $c = $c|0;
 $d = $d|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 $7 = (+($6|0));
 HEAPF32[$5>>2] = $7;
 $8 = (($5) + 4|0);
 $9 = $2;
 HEAPF32[$8>>2] = $9;
 $10 = (($5) + 8|0);
 $11 = $3;
 $12 = (+($11|0));
 HEAPF32[$10>>2] = $12;
 $13 = (($5) + 12|0);
 $14 = $4;
 $15 = (+($14|0));
 HEAPF32[$13>>2] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2IiifiEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = $a|0;
 $b = $b|0;
 $c = +$c;
 $d = $d|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 $7 = (+($6|0));
 HEAPF32[$5>>2] = $7;
 $8 = (($5) + 4|0);
 $9 = $2;
 $10 = (+($9|0));
 HEAPF32[$8>>2] = $10;
 $11 = (($5) + 8|0);
 $12 = $3;
 HEAPF32[$11>>2] = $12;
 $13 = (($5) + 12|0);
 $14 = $4;
 $15 = (+($14|0));
 HEAPF32[$13>>2] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2IiiifEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 $d = +$d;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 $7 = (+($6|0));
 HEAPF32[$5>>2] = $7;
 $8 = (($5) + 4|0);
 $9 = $2;
 $10 = (+($9|0));
 HEAPF32[$8>>2] = $10;
 $11 = (($5) + 8|0);
 $12 = $3;
 $13 = (+($12|0));
 HEAPF32[$11>>2] = $13;
 $14 = (($5) + 12|0);
 $15 = $4;
 HEAPF32[$14>>2] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm11inversesqrtIfEET_S1_($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $x;
 $2 = $1;
 $0 = $2;
 $3 = $0;
 $4 = (+Math_sqrt((+$3)));
 $5 = 1.0 / $4;
 STACKTOP = sp;return (+$5);
}
function __ZNK3glm7tmat4x4IdLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = (__ZNK3glm7tmat4x4IdLNS_9precisionE0EE6lengthEv($2)|0);
 $5 = ($3|0)<($4|0);
 if ($5) {
  $6 = $1;
  $7 = (($2) + ($6<<5)|0);
  STACKTOP = sp;return ($7|0);
 } else {
  ___assert_fail((904|0),(928|0),363,(888|0));
  // unreachable;
 }
 return (0)|0;
}
function __ZN3glm5tvec4IfLNS_9precisionE0EEC2IdLS1_0EEERKNS0_IT_XT0_EEE($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF64[$3>>3];
 $5 = $4;
 HEAPF32[$2>>2] = $5;
 $6 = (($2) + 4|0);
 $7 = $1;
 $8 = (($7) + 8|0);
 $9 = +HEAPF64[$8>>3];
 $10 = $9;
 HEAPF32[$6>>2] = $10;
 $11 = (($2) + 8|0);
 $12 = $1;
 $13 = (($12) + 16|0);
 $14 = +HEAPF64[$13>>3];
 $15 = $14;
 HEAPF32[$11>>2] = $15;
 $16 = (($2) + 12|0);
 $17 = $1;
 $18 = (($17) + 24|0);
 $19 = +HEAPF64[$18>>3];
 $20 = $19;
 HEAPF32[$16>>2] = $20;
 STACKTOP = sp;return;
}
function __ZNK3glm7tmat4x4IdLNS_9precisionE0EE6lengthEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 STACKTOP = sp;return 4;
}
function __ZN3glm13perspectiveRHIdEENS_7tmat4x4IT_LNS_9precisionE0EEES2_S2_S2_S2_($agg$result,$fovy,$aspect,$zNear,$zFar) {
 $agg$result = $agg$result|0;
 $fovy = +$fovy;
 $aspect = +$aspect;
 $zNear = +$zNear;
 $zFar = +$zFar;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0;
 var $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0.0, $tanHalfFovy = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $4 = sp + 32|0;
 $0 = $fovy;
 $1 = $aspect;
 $2 = $zNear;
 $3 = $zFar;
 $5 = $1;
 $6 = $5 - 2.2204460492503131E-16;
 $7 = (+__ZN3glm3absIdEET_S1_($6));
 $8 = $7 > 0.0;
 if ($8) {
  $9 = $0;
  $10 = $9 / 2.0;
  $11 = (+Math_tan((+$10)));
  $tanHalfFovy = $11;
  HEAPF64[$4>>3] = 0.0;
  __ZN3glm7tmat4x4IdLNS_9precisionE0EEC2ERKd($agg$result,$4);
  $12 = $1;
  $13 = $tanHalfFovy;
  $14 = $12 * $13;
  $15 = 1.0 / $14;
  $16 = (__ZN3glm7tmat4x4IdLNS_9precisionE0EEixEi($agg$result,0)|0);
  $17 = (__ZN3glm5tvec4IdLNS_9precisionE0EEixEi($16,0)|0);
  HEAPF64[$17>>3] = $15;
  $18 = $tanHalfFovy;
  $19 = 1.0 / $18;
  $20 = (__ZN3glm7tmat4x4IdLNS_9precisionE0EEixEi($agg$result,1)|0);
  $21 = (__ZN3glm5tvec4IdLNS_9precisionE0EEixEi($20,1)|0);
  HEAPF64[$21>>3] = $19;
  $22 = $3;
  $23 = $2;
  $24 = $22 + $23;
  $25 = -$24;
  $26 = $3;
  $27 = $2;
  $28 = $26 - $27;
  $29 = $25 / $28;
  $30 = (__ZN3glm7tmat4x4IdLNS_9precisionE0EEixEi($agg$result,2)|0);
  $31 = (__ZN3glm5tvec4IdLNS_9precisionE0EEixEi($30,2)|0);
  HEAPF64[$31>>3] = $29;
  $32 = (__ZN3glm7tmat4x4IdLNS_9precisionE0EEixEi($agg$result,2)|0);
  $33 = (__ZN3glm5tvec4IdLNS_9precisionE0EEixEi($32,3)|0);
  HEAPF64[$33>>3] = -1.0;
  $34 = $3;
  $35 = 2.0 * $34;
  $36 = $2;
  $37 = $35 * $36;
  $38 = -$37;
  $39 = $3;
  $40 = $2;
  $41 = $39 - $40;
  $42 = $38 / $41;
  $43 = (__ZN3glm7tmat4x4IdLNS_9precisionE0EEixEi($agg$result,3)|0);
  $44 = (__ZN3glm5tvec4IdLNS_9precisionE0EEixEi($43,2)|0);
  HEAPF64[$44>>3] = $42;
  STACKTOP = sp;return;
 } else {
  ___assert_fail((960|0),(1032|0),236,(1072|0));
  // unreachable;
 }
}
function __ZN3glm3absIdEET_S1_($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0;
 $2 = (+__ZN3glm6detail11compute_absIdLb1EE4callEd($1));
 STACKTOP = sp;return (+$2);
}
function __ZN3glm7tmat4x4IdLNS_9precisionE0EEC2ERKd($this,$s) {
 $this = $this|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 144|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $2 = sp + 32|0;
 $3 = sp + 64|0;
 $4 = sp;
 $5 = sp + 96|0;
 $0 = $this;
 $1 = $s;
 $6 = $0;
 $7 = (($6) + 128|0);
 $8 = $6;
 while(1) {
  __ZN3glm5tvec4IdLNS_9precisionE0EEC2Ev($8);
  $9 = (($8) + 32|0);
  $10 = ($9|0)==($7|0);
  if ($10) {
   break;
  } else {
   $8 = $9;
  }
 }
 $11 = $1;
 $12 = +HEAPF64[$11>>3];
 __ZN3glm5tvec4IdLNS_9precisionE0EEC2IdiiiEET_T0_T1_T2_($2,$12,0,0,0);
 (__ZN3glm5tvec4IdLNS_9precisionE0EEaSERKS2_($6,$2)|0);
 $13 = (($6) + 32|0);
 $14 = $1;
 $15 = +HEAPF64[$14>>3];
 __ZN3glm5tvec4IdLNS_9precisionE0EEC2IidiiEET_T0_T1_T2_($3,0,$15,0,0);
 (__ZN3glm5tvec4IdLNS_9precisionE0EEaSERKS2_($13,$3)|0);
 $16 = (($6) + 64|0);
 $17 = $1;
 $18 = +HEAPF64[$17>>3];
 __ZN3glm5tvec4IdLNS_9precisionE0EEC2IiidiEET_T0_T1_T2_($4,0,0,$18,0);
 (__ZN3glm5tvec4IdLNS_9precisionE0EEaSERKS2_($16,$4)|0);
 $19 = (($6) + 96|0);
 $20 = $1;
 $21 = +HEAPF64[$20>>3];
 __ZN3glm5tvec4IdLNS_9precisionE0EEC2IiiidEET_T0_T1_T2_($5,0,0,0,$21);
 (__ZN3glm5tvec4IdLNS_9precisionE0EEaSERKS2_($19,$5)|0);
 STACKTOP = sp;return;
}
function __ZN3glm7tmat4x4IdLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = (__ZNK3glm7tmat4x4IdLNS_9precisionE0EE6lengthEv($2)|0);
 $5 = ($3|0)<($4|0);
 if ($5) {
  $6 = $1;
  $7 = (($2) + ($6<<5)|0);
  STACKTOP = sp;return ($7|0);
 } else {
  ___assert_fail((904|0),(928|0),356,(888|0));
  // unreachable;
 }
 return (0)|0;
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEixEi($this,$i) {
 $this = $this|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = ($3|0)>=(0);
 if ($4) {
  $5 = $1;
  $6 = (__ZN3glm6detail15component_countINS_5tvec4IdLNS_9precisionE0EEEEEiRKT_($2)|0);
  $7 = ($5|0)<($6|0);
  if ($7) {
   $8 = $1;
   $9 = (($2) + ($8<<3)|0);
   STACKTOP = sp;return ($9|0);
  }
 }
 ___assert_fail((768|0),(856|0),237,(888|0));
 // unreachable;
 return (0)|0;
}
function __ZN3glm6detail15component_countINS_5tvec4IdLNS_9precisionE0EEEEEiRKT_($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (__ZNK3glm5tvec4IdLNS_9precisionE0EE6lengthEv($1)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZNK3glm5tvec4IdLNS_9precisionE0EE6lengthEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 STACKTOP = sp;return 4;
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEC2Ev($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $0;
 HEAPF64[$1>>3] = 0.0;
 $2 = (($1) + 8|0);
 HEAPF64[$2>>3] = 0.0;
 $3 = (($1) + 16|0);
 HEAPF64[$3>>3] = 0.0;
 $4 = (($1) + 24|0);
 HEAPF64[$4>>3] = 0.0;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEaSERKS2_($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF64[$3>>3];
 HEAPF64[$2>>3] = $4;
 $5 = $1;
 $6 = (($5) + 8|0);
 $7 = +HEAPF64[$6>>3];
 $8 = (($2) + 8|0);
 HEAPF64[$8>>3] = $7;
 $9 = $1;
 $10 = (($9) + 16|0);
 $11 = +HEAPF64[$10>>3];
 $12 = (($2) + 16|0);
 HEAPF64[$12>>3] = $11;
 $13 = $1;
 $14 = (($13) + 24|0);
 $15 = +HEAPF64[$14>>3];
 $16 = (($2) + 24|0);
 HEAPF64[$16>>3] = $15;
 STACKTOP = sp;return ($2|0);
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEC2IdiiiEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = +$a;
 $b = $b|0;
 $c = $c|0;
 $d = $d|0;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 HEAPF64[$5>>3] = $6;
 $7 = (($5) + 8|0);
 $8 = $2;
 $9 = (+($8|0));
 HEAPF64[$7>>3] = $9;
 $10 = (($5) + 16|0);
 $11 = $3;
 $12 = (+($11|0));
 HEAPF64[$10>>3] = $12;
 $13 = (($5) + 24|0);
 $14 = $4;
 $15 = (+($14|0));
 HEAPF64[$13>>3] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEC2IidiiEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = $a|0;
 $b = +$b;
 $c = $c|0;
 $d = $d|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 $7 = (+($6|0));
 HEAPF64[$5>>3] = $7;
 $8 = (($5) + 8|0);
 $9 = $2;
 HEAPF64[$8>>3] = $9;
 $10 = (($5) + 16|0);
 $11 = $3;
 $12 = (+($11|0));
 HEAPF64[$10>>3] = $12;
 $13 = (($5) + 24|0);
 $14 = $4;
 $15 = (+($14|0));
 HEAPF64[$13>>3] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEC2IiidiEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = $a|0;
 $b = $b|0;
 $c = +$c;
 $d = $d|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 $7 = (+($6|0));
 HEAPF64[$5>>3] = $7;
 $8 = (($5) + 8|0);
 $9 = $2;
 $10 = (+($9|0));
 HEAPF64[$8>>3] = $10;
 $11 = (($5) + 16|0);
 $12 = $3;
 HEAPF64[$11>>3] = $12;
 $13 = (($5) + 24|0);
 $14 = $4;
 $15 = (+($14|0));
 HEAPF64[$13>>3] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm5tvec4IdLNS_9precisionE0EEC2IiiidEET_T0_T1_T2_($this,$a,$b,$c,$d) {
 $this = $this|0;
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 $d = +$d;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $a;
 $2 = $b;
 $3 = $c;
 $4 = $d;
 $5 = $0;
 $6 = $1;
 $7 = (+($6|0));
 HEAPF64[$5>>3] = $7;
 $8 = (($5) + 8|0);
 $9 = $2;
 $10 = (+($9|0));
 HEAPF64[$8>>3] = $10;
 $11 = (($5) + 16|0);
 $12 = $3;
 $13 = (+($12|0));
 HEAPF64[$11>>3] = $13;
 $14 = (($5) + 24|0);
 $15 = $4;
 HEAPF64[$14>>3] = $15;
 STACKTOP = sp;return;
}
function __ZN3glm6detail11compute_absIdLb1EE4callEd($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0;
 $2 = $1 >= 0.0;
 if ($2) {
  $3 = $0;
  $6 = $3;
 } else {
  $4 = $0;
  $5 = -$4;
  $6 = $5;
 }
 STACKTOP = sp;return (+$6);
}
function __ZN3glm5tvec3IfLNS_9precisionE0EEC2ERKS2_($this,$v) {
 $this = $this|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = $v;
 $2 = $0;
 $3 = $1;
 $4 = +HEAPF32[$3>>2];
 HEAPF32[$2>>2] = $4;
 $5 = (($2) + 4|0);
 $6 = $1;
 $7 = (($6) + 4|0);
 $8 = +HEAPF32[$7>>2];
 HEAPF32[$5>>2] = $8;
 $9 = (($2) + 8|0);
 $10 = $1;
 $11 = (($10) + 8|0);
 $12 = +HEAPF32[$11>>2];
 HEAPF32[$9>>2] = $12;
 STACKTOP = sp;return;
}
function __GLOBAL__sub_I_main_cpp() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___cxx_global_var_init();
 return;
}
function _strchr($s,$c) {
 $s = $s|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___strchrnul($s,$c)|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $c&255;
 $3 = ($1<<24>>24)==($2<<24>>24);
 $4 = $3 ? $0 : 0;
 return ($4|0);
}
function ___strchrnul($s,$c) {
 $s = $s|0;
 $c = $c|0;
 var $$0 = 0, $$02$lcssa = 0, $$0211 = 0, $$0211$lcssa = 0, $$1 = 0, $$1$lcssa = 0, $$lcssa20 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond5 = 0, $w$0$lcssa = 0, $w$0$lcssa$ph = 0, $w$08 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = ($0|0)==(0);
 if ($1) {
  $6 = (_strlen(($s|0))|0);
  $7 = (($s) + ($6)|0);
  $$0 = $7;
  return ($$0|0);
 }
 $2 = $s;
 $3 = $2 & 3;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $$02$lcssa = $s;
  } else {
   $5 = $c&255;
   $$0211 = $s;
   while(1) {
    $12 = HEAP8[$$0211>>0]|0;
    $13 = ($12<<24>>24)==(0);
    $14 = ($12<<24>>24)==($5<<24>>24);
    $or$cond = $13 | $14;
    $8 = (($$0211) + 1|0);
    if ($or$cond) {
     $$0211$lcssa = $$0211;
     break;
    }
    $9 = $8;
    $10 = $9 & 3;
    $11 = ($10|0)==(0);
    if ($11) {
     $$lcssa20 = $8;
     label = 7;
     break;
    } else {
     $$0211 = $8;
    }
   }
   if ((label|0) == 7) {
    $$02$lcssa = $$lcssa20;
    break;
   }
   $$0 = $$0211$lcssa;
   return ($$0|0);
  }
 } while(0);
 $15 = Math_imul($0, 16843009)|0;
 $16 = HEAP32[$$02$lcssa>>2]|0;
 $17 = (($16) + -16843009)|0;
 $18 = $16 & -2139062144;
 $19 = $18 ^ -2139062144;
 $20 = $19 & $17;
 $21 = ($20|0)==(0);
 if ($21) {
  $30 = $16;$w$08 = $$02$lcssa;
  while(1) {
   $29 = $30 ^ $15;
   $31 = (($29) + -16843009)|0;
   $32 = $29 & -2139062144;
   $33 = $32 ^ -2139062144;
   $34 = $33 & $31;
   $35 = ($34|0)==(0);
   $23 = (($w$08) + 4|0);
   if (!($35)) {
    $w$0$lcssa$ph = $w$08;
    break;
   }
   $22 = HEAP32[$23>>2]|0;
   $24 = (($22) + -16843009)|0;
   $25 = $22 & -2139062144;
   $26 = $25 ^ -2139062144;
   $27 = $26 & $24;
   $28 = ($27|0)==(0);
   if ($28) {
    $30 = $22;$w$08 = $23;
   } else {
    $w$0$lcssa$ph = $23;
    break;
   }
  }
  $w$0$lcssa = $w$0$lcssa$ph;
 } else {
  $w$0$lcssa = $$02$lcssa;
 }
 $36 = $c&255;
 $$1 = $w$0$lcssa;
 while(1) {
  $37 = HEAP8[$$1>>0]|0;
  $38 = ($37<<24>>24)==(0);
  $39 = ($37<<24>>24)==($36<<24>>24);
  $or$cond5 = $38 | $39;
  $40 = (($$1) + 1|0);
  if ($or$cond5) {
   $$1$lcssa = $$1;
   break;
  } else {
   $$1 = $40;
  }
 }
 $$0 = $$1$lcssa;
 return ($$0|0);
}
function _strstr($h,$n) {
 $h = $h|0;
 $n = $n|0;
 var $$$i = 0, $$$i15 = 0, $$$i7 = 0, $$0 = 0, $$0$lcssa$i = 0, $$0$lcssa$i14 = 0, $$01$i = 0, $$02$i = 0, $$02$i10 = 0, $$03$i = 0, $$03$i$be = 0, $$03$i$lcssa136 = 0, $$03$us$i = 0, $$03$us$i$be = 0, $$03$us$i$lcssa138 = 0, $$lcssa = 0, $$lcssa$i = 0, $$lcssa$i13 = 0, $$lcssa$i6 = 0, $$lcssa132 = 0;
 var $$lcssa133 = 0, $$lcssa134 = 0, $$lcssa139 = 0, $$lcssa142 = 0, $$lcssa145 = 0, $$lcssa155 = 0, $$lcssa159 = 0, $$lcssa162 = 0, $$lcssa165 = 0, $$lcssa175 = 0, $$lcssa180 = 0, $$mem$0$us$i = 0, $$pr$i = 0, $$pr$us$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0;
 var $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0;
 var $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0;
 var $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0;
 var $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0;
 var $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0;
 var $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0;
 var $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0;
 var $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0;
 var $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $27$phi = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $byteset$i = 0, $div$i = 0, $div$us$i = 0;
 var $div4$i = 0, $hw$0$in2$i = 0, $hw$03$i = 0, $hw$03$i9 = 0, $ip$0$ph$lcssa$i = 0, $ip$0$ph$lcssa147$i = 0, $ip$0$ph76$i = 0, $ip$0$ph76$i$lcssa176 = 0, $ip$0$ph76$i$lcssa177 = 0, $ip$0$ph76$i$lcssa178 = 0, $ip$1$ip$0$$i = 0, $ip$1$ip$0$i = 0, $ip$1$ph$lcssa$i = 0, $ip$1$ph55$i = 0, $ip$1$ph55$i$lcssa156 = 0, $ip$1$ph55$i$lcssa157 = 0, $ip$1$ph55$i$lcssa158 = 0, $jp$0$ph13$ph70$i = 0, $jp$0$ph1365$i = 0, $jp$0$ph1365$i$lcssa = 0;
 var $jp$0$ph1365$i$lcssa$lcssa = 0, $jp$0$ph1365$i$lcssa$lcssa$lcssa = 0, $jp$0$ph77$i = 0, $jp$1$ph56$i = 0, $jp$1$ph9$ph49$i = 0, $jp$1$ph944$i = 0, $jp$1$ph944$i$lcssa = 0, $jp$1$ph944$i$lcssa$lcssa = 0, $jp$1$ph944$i$lcssa$lcssa$lcssa = 0, $k$059$i = 0, $k$139$i = 0, $k$2$us$i = 0, $k$338$i = 0, $k$338$i$lcssa = 0, $k$338$us$i = 0, $k$338$us$i$lcssa = 0, $k$4$i = 0, $k$4$us$i = 0, $l$080$i = 0, $l$080$i$lcssa179 = 0;
 var $mem$0$us$i = 0, $mem$0$us$i$be = 0, $or$cond$i = 0, $or$cond$i11 = 0, $or$cond5$us$i = 0, $p$0$ph$ph$lcssa32$i = 0, $p$0$ph$ph$lcssa32151$i = 0, $p$0$ph$ph71$i = 0, $p$0$ph$ph71$i$lcssa171 = 0, $p$0$ph$ph71$i$lcssa172 = 0, $p$1$p$0$i = 0, $p$1$ph$ph$lcssa23$i = 0, $p$1$ph$ph50$i = 0, $p$1$ph$ph50$i$lcssa151 = 0, $p$1$ph$ph50$i$lcssa152 = 0, $p$3155$i = 0, $shift$i = 0, $z$0$i = 0, $z$0$us$i = 0, $z$1$i = 0;
 var $z$1$us$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1056|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $byteset$i = sp + 1024|0;
 $shift$i = sp;
 $0 = HEAP8[$n>>0]|0;
 $1 = ($0<<24>>24)==(0);
 if ($1) {
  $$0 = $h;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = $0 << 24 >> 24;
 $3 = (_strchr($h,$2)|0);
 $4 = ($3|0)==(0|0);
 if ($4) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $5 = (($n) + 1|0);
 $6 = HEAP8[$5>>0]|0;
 $7 = ($6<<24>>24)==(0);
 if ($7) {
  $$0 = $3;
  STACKTOP = sp;return ($$0|0);
 }
 $8 = (($3) + 1|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = ($9<<24>>24)==(0);
 if ($10) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $11 = (($n) + 2|0);
 $12 = HEAP8[$11>>0]|0;
 $13 = ($12<<24>>24)==(0);
 if ($13) {
  $14 = $0&255;
  $15 = $14 << 8;
  $16 = $6&255;
  $17 = $16 | $15;
  $18 = HEAP8[$3>>0]|0;
  $19 = $18&255;
  $20 = $19 << 8;
  $21 = $9&255;
  $22 = $20 | $21;
  $$01$i = $8;$27 = $3;$275 = $9;$hw$0$in2$i = $22;
  while(1) {
   $23 = $hw$0$in2$i & 65535;
   $24 = ($23|0)==($17|0);
   if ($24) {
    $$lcssa$i = $27;$32 = $275;
    break;
   }
   $25 = $23 << 8;
   $26 = (($27) + 2|0);
   $28 = HEAP8[$26>>0]|0;
   $29 = $28&255;
   $30 = $29 | $25;
   $31 = ($28<<24>>24)==(0);
   if ($31) {
    $$lcssa$i = $$01$i;$32 = 0;
    break;
   } else {
    $27$phi = $$01$i;$$01$i = $26;$275 = $28;$hw$0$in2$i = $30;$27 = $27$phi;
   }
  }
  $33 = ($32<<24>>24)==(0);
  $$$i = $33 ? 0 : $$lcssa$i;
  $$0 = $$$i;
  STACKTOP = sp;return ($$0|0);
 }
 $34 = (($3) + 2|0);
 $35 = HEAP8[$34>>0]|0;
 $36 = ($35<<24>>24)==(0);
 if ($36) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $37 = (($n) + 3|0);
 $38 = HEAP8[$37>>0]|0;
 $39 = ($38<<24>>24)==(0);
 if ($39) {
  $40 = $0&255;
  $41 = $40 << 24;
  $42 = $6&255;
  $43 = $42 << 16;
  $44 = $43 | $41;
  $45 = $12&255;
  $46 = $45 << 8;
  $47 = $44 | $46;
  $48 = HEAP8[$3>>0]|0;
  $49 = $48&255;
  $50 = $49 << 24;
  $51 = $9&255;
  $52 = $51 << 16;
  $53 = $35&255;
  $54 = $53 << 8;
  $55 = $54 | $52;
  $56 = $55 | $50;
  $57 = ($56|0)==($47|0);
  if ($57) {
   $$0$lcssa$i = $34;$$lcssa$i6 = 0;
  } else {
   $$02$i = $34;$hw$03$i = $56;
   while(1) {
    $58 = (($$02$i) + 1|0);
    $59 = HEAP8[$58>>0]|0;
    $60 = $59&255;
    $61 = $60 | $hw$03$i;
    $62 = $61 << 8;
    $63 = ($59<<24>>24)==(0);
    $64 = ($62|0)==($47|0);
    $or$cond$i = $63 | $64;
    if ($or$cond$i) {
     $$lcssa = $58;$$lcssa132 = $63;
     break;
    } else {
     $$02$i = $58;$hw$03$i = $62;
    }
   }
   $$0$lcssa$i = $$lcssa;$$lcssa$i6 = $$lcssa132;
  }
  $65 = (($$0$lcssa$i) + -2|0);
  $$$i7 = $$lcssa$i6 ? 0 : $65;
  $$0 = $$$i7;
  STACKTOP = sp;return ($$0|0);
 }
 $66 = (($3) + 3|0);
 $67 = HEAP8[$66>>0]|0;
 $68 = ($67<<24>>24)==(0);
 if ($68) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $69 = (($n) + 4|0);
 $70 = HEAP8[$69>>0]|0;
 $71 = ($70<<24>>24)==(0);
 if ($71) {
  $72 = $0&255;
  $73 = $72 << 24;
  $74 = $6&255;
  $75 = $74 << 16;
  $76 = $75 | $73;
  $77 = $12&255;
  $78 = $77 << 8;
  $79 = $76 | $78;
  $80 = $38&255;
  $81 = $79 | $80;
  $82 = HEAP8[$3>>0]|0;
  $83 = $82&255;
  $84 = $83 << 24;
  $85 = $9&255;
  $86 = $85 << 16;
  $87 = $35&255;
  $88 = $87 << 8;
  $89 = $67&255;
  $90 = $88 | $86;
  $91 = $90 | $89;
  $92 = $91 | $84;
  $93 = ($92|0)==($81|0);
  if ($93) {
   $$0$lcssa$i14 = $66;$$lcssa$i13 = 0;
  } else {
   $$02$i10 = $66;$hw$03$i9 = $92;
   while(1) {
    $94 = $hw$03$i9 << 8;
    $95 = (($$02$i10) + 1|0);
    $96 = HEAP8[$95>>0]|0;
    $97 = $96&255;
    $98 = $97 | $94;
    $99 = ($96<<24>>24)==(0);
    $100 = ($98|0)==($81|0);
    $or$cond$i11 = $99 | $100;
    if ($or$cond$i11) {
     $$lcssa133 = $95;$$lcssa134 = $99;
     break;
    } else {
     $$02$i10 = $95;$hw$03$i9 = $98;
    }
   }
   $$0$lcssa$i14 = $$lcssa133;$$lcssa$i13 = $$lcssa134;
  }
  $101 = (($$0$lcssa$i14) + -3|0);
  $$$i15 = $$lcssa$i13 ? 0 : $101;
  $$0 = $$$i15;
  STACKTOP = sp;return ($$0|0);
 }
 ;HEAP32[$byteset$i+0>>2]=0|0;HEAP32[$byteset$i+4>>2]=0|0;HEAP32[$byteset$i+8>>2]=0|0;HEAP32[$byteset$i+12>>2]=0|0;HEAP32[$byteset$i+16>>2]=0|0;HEAP32[$byteset$i+20>>2]=0|0;HEAP32[$byteset$i+24>>2]=0|0;HEAP32[$byteset$i+28>>2]=0|0;
 $106 = $0;$l$080$i = 0;
 while(1) {
  $102 = (($3) + ($l$080$i)|0);
  $103 = HEAP8[$102>>0]|0;
  $104 = ($103<<24>>24)==(0);
  if ($104) {
   label = 105;
   break;
  }
  $105 = $106 & 31;
  $107 = $105&255;
  $108 = 1 << $107;
  $div4$i = ($106&255) >>> 5;
  $109 = $div4$i&255;
  $110 = (($byteset$i) + ($109<<2)|0);
  $111 = HEAP32[$110>>2]|0;
  $112 = $111 | $108;
  HEAP32[$110>>2] = $112;
  $113 = (($l$080$i) + 1)|0;
  $114 = $106&255;
  $115 = (($shift$i) + ($114<<2)|0);
  HEAP32[$115>>2] = $113;
  $116 = (($n) + ($113)|0);
  $117 = HEAP8[$116>>0]|0;
  $118 = ($117<<24>>24)==(0);
  if ($118) {
   $$lcssa180 = $113;$l$080$i$lcssa179 = $l$080$i;
   break;
  } else {
   $106 = $117;$l$080$i = $113;
  }
 }
 if ((label|0) == 105) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $119 = ($$lcssa180>>>0)>(1);
 do {
  if ($119) {
   $276 = 1;$ip$0$ph76$i = -1;$jp$0$ph77$i = 0;
   L56: while(1) {
    $277 = $276;$jp$0$ph13$ph70$i = $jp$0$ph77$i;$p$0$ph$ph71$i = 1;
    while(1) {
     $278 = $277;$jp$0$ph1365$i = $jp$0$ph13$ph70$i;
     L60: while(1) {
      $129 = $278;$k$059$i = 1;
      while(1) {
       $125 = (($k$059$i) + ($ip$0$ph76$i))|0;
       $126 = (($n) + ($125)|0);
       $127 = HEAP8[$126>>0]|0;
       $128 = (($n) + ($129)|0);
       $130 = HEAP8[$128>>0]|0;
       $131 = ($127<<24>>24)==($130<<24>>24);
       if (!($131)) {
        $$lcssa159 = $129;$$lcssa162 = $127;$$lcssa165 = $130;$jp$0$ph1365$i$lcssa = $jp$0$ph1365$i;
        break L60;
       }
       $132 = ($k$059$i|0)==($p$0$ph$ph71$i|0);
       $123 = (($k$059$i) + 1)|0;
       if ($132) {
        break;
       }
       $122 = (($123) + ($jp$0$ph1365$i))|0;
       $124 = ($122>>>0)<($$lcssa180>>>0);
       if ($124) {
        $129 = $122;$k$059$i = $123;
       } else {
        $ip$0$ph76$i$lcssa177 = $ip$0$ph76$i;$p$0$ph$ph71$i$lcssa171 = $p$0$ph$ph71$i;
        label = 34;
        break L56;
       }
      }
      $133 = (($jp$0$ph1365$i) + ($p$0$ph$ph71$i))|0;
      $134 = (($133) + 1)|0;
      $135 = ($134>>>0)<($$lcssa180>>>0);
      if ($135) {
       $278 = $134;$jp$0$ph1365$i = $133;
      } else {
       $ip$0$ph76$i$lcssa178 = $ip$0$ph76$i;$p$0$ph$ph71$i$lcssa172 = $p$0$ph$ph71$i;
       label = 35;
       break L56;
      }
     }
     $136 = ($$lcssa162&255)>($$lcssa165&255);
     $137 = (($$lcssa159) - ($ip$0$ph76$i))|0;
     if (!($136)) {
      $jp$0$ph1365$i$lcssa$lcssa = $jp$0$ph1365$i$lcssa;
      break;
     }
     $120 = (($$lcssa159) + 1)|0;
     $121 = ($120>>>0)<($$lcssa180>>>0);
     if ($121) {
      $277 = $120;$jp$0$ph13$ph70$i = $$lcssa159;$p$0$ph$ph71$i = $137;
     } else {
      $$lcssa175 = $137;$ip$0$ph76$i$lcssa176 = $ip$0$ph76$i;
      label = 36;
      break L56;
     }
    }
    $138 = (($jp$0$ph1365$i$lcssa$lcssa) + 1)|0;
    $139 = (($jp$0$ph1365$i$lcssa$lcssa) + 2)|0;
    $140 = ($139>>>0)<($$lcssa180>>>0);
    if ($140) {
     $276 = $139;$ip$0$ph76$i = $jp$0$ph1365$i$lcssa$lcssa;$jp$0$ph77$i = $138;
    } else {
     $jp$0$ph1365$i$lcssa$lcssa$lcssa = $jp$0$ph1365$i$lcssa$lcssa;
     label = 37;
     break;
    }
   }
   if ((label|0) == 34) {
    $ip$0$ph$lcssa$i = $ip$0$ph76$i$lcssa177;$p$0$ph$ph$lcssa32$i = $p$0$ph$ph71$i$lcssa171;
   }
   else if ((label|0) == 35) {
    $ip$0$ph$lcssa$i = $ip$0$ph76$i$lcssa178;$p$0$ph$ph$lcssa32$i = $p$0$ph$ph71$i$lcssa172;
   }
   else if ((label|0) == 36) {
    $ip$0$ph$lcssa$i = $ip$0$ph76$i$lcssa176;$p$0$ph$ph$lcssa32$i = $$lcssa175;
   }
   else if ((label|0) == 37) {
    $ip$0$ph$lcssa$i = $jp$0$ph1365$i$lcssa$lcssa$lcssa;$p$0$ph$ph$lcssa32$i = 1;
   }
   $279 = 1;$ip$1$ph55$i = -1;$jp$1$ph56$i = 0;
   L76: while(1) {
    $281 = $279;$jp$1$ph9$ph49$i = $jp$1$ph56$i;$p$1$ph$ph50$i = 1;
    while(1) {
     $280 = $281;$jp$1$ph944$i = $jp$1$ph9$ph49$i;
     L80: while(1) {
      $148 = $280;$k$139$i = 1;
      while(1) {
       $144 = (($k$139$i) + ($ip$1$ph55$i))|0;
       $145 = (($n) + ($144)|0);
       $146 = HEAP8[$145>>0]|0;
       $147 = (($n) + ($148)|0);
       $149 = HEAP8[$147>>0]|0;
       $150 = ($146<<24>>24)==($149<<24>>24);
       if (!($150)) {
        $$lcssa139 = $148;$$lcssa142 = $146;$$lcssa145 = $149;$jp$1$ph944$i$lcssa = $jp$1$ph944$i;
        break L80;
       }
       $151 = ($k$139$i|0)==($p$1$ph$ph50$i|0);
       $142 = (($k$139$i) + 1)|0;
       if ($151) {
        break;
       }
       $141 = (($142) + ($jp$1$ph944$i))|0;
       $143 = ($141>>>0)<($$lcssa180>>>0);
       if ($143) {
        $148 = $141;$k$139$i = $142;
       } else {
        $ip$1$ph55$i$lcssa157 = $ip$1$ph55$i;$p$1$ph$ph50$i$lcssa151 = $p$1$ph$ph50$i;
        label = 54;
        break L76;
       }
      }
      $152 = (($jp$1$ph944$i) + ($p$1$ph$ph50$i))|0;
      $153 = (($152) + 1)|0;
      $154 = ($153>>>0)<($$lcssa180>>>0);
      if ($154) {
       $280 = $153;$jp$1$ph944$i = $152;
      } else {
       $ip$1$ph55$i$lcssa158 = $ip$1$ph55$i;$p$1$ph$ph50$i$lcssa152 = $p$1$ph$ph50$i;
       label = 55;
       break L76;
      }
     }
     $155 = ($$lcssa142&255)<($$lcssa145&255);
     $156 = (($$lcssa139) - ($ip$1$ph55$i))|0;
     if (!($155)) {
      $jp$1$ph944$i$lcssa$lcssa = $jp$1$ph944$i$lcssa;
      break;
     }
     $160 = (($$lcssa139) + 1)|0;
     $161 = ($160>>>0)<($$lcssa180>>>0);
     if ($161) {
      $281 = $160;$jp$1$ph9$ph49$i = $$lcssa139;$p$1$ph$ph50$i = $156;
     } else {
      $$lcssa155 = $156;$ip$1$ph55$i$lcssa156 = $ip$1$ph55$i;
      label = 56;
      break L76;
     }
    }
    $157 = (($jp$1$ph944$i$lcssa$lcssa) + 1)|0;
    $158 = (($jp$1$ph944$i$lcssa$lcssa) + 2)|0;
    $159 = ($158>>>0)<($$lcssa180>>>0);
    if ($159) {
     $279 = $158;$ip$1$ph55$i = $jp$1$ph944$i$lcssa$lcssa;$jp$1$ph56$i = $157;
    } else {
     $jp$1$ph944$i$lcssa$lcssa$lcssa = $jp$1$ph944$i$lcssa$lcssa;
     label = 57;
     break;
    }
   }
   if ((label|0) == 54) {
    $ip$0$ph$lcssa147$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $ip$1$ph55$i$lcssa157;$p$0$ph$ph$lcssa32151$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = $p$1$ph$ph50$i$lcssa151;
    break;
   }
   else if ((label|0) == 55) {
    $ip$0$ph$lcssa147$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $ip$1$ph55$i$lcssa158;$p$0$ph$ph$lcssa32151$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = $p$1$ph$ph50$i$lcssa152;
    break;
   }
   else if ((label|0) == 56) {
    $ip$0$ph$lcssa147$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $ip$1$ph55$i$lcssa156;$p$0$ph$ph$lcssa32151$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = $$lcssa155;
    break;
   }
   else if ((label|0) == 57) {
    $ip$0$ph$lcssa147$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $jp$1$ph944$i$lcssa$lcssa$lcssa;$p$0$ph$ph$lcssa32151$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = 1;
    break;
   }
  } else {
   $ip$0$ph$lcssa147$i = -1;$ip$1$ph$lcssa$i = -1;$p$0$ph$ph$lcssa32151$i = 1;$p$1$ph$ph$lcssa23$i = 1;
  }
 } while(0);
 $162 = (($ip$1$ph$lcssa$i) + 1)|0;
 $163 = (($ip$0$ph$lcssa147$i) + 1)|0;
 $164 = ($162>>>0)>($163>>>0);
 $p$1$p$0$i = $164 ? $p$1$ph$ph$lcssa23$i : $p$0$ph$ph$lcssa32151$i;
 $ip$1$ip$0$i = $164 ? $ip$1$ph$lcssa$i : $ip$0$ph$lcssa147$i;
 $165 = (($n) + ($p$1$p$0$i)|0);
 $166 = (($ip$1$ip$0$i) + 1)|0;
 $167 = (_memcmp($n,$165,$166)|0);
 $168 = ($167|0)==(0);
 if ($168) {
  $174 = (($$lcssa180) - ($p$1$p$0$i))|0;
  $175 = $$lcssa180 | 63;
  $176 = ($$lcssa180|0)==($p$1$p$0$i|0);
  if ($176) {
   $232 = $175;$p$3155$i = $$lcssa180;
  } else {
   $$03$us$i = $3;$mem$0$us$i = 0;$z$0$us$i = $3;
   L100: while(1) {
    $178 = $z$0$us$i;
    $179 = $$03$us$i;
    $180 = (($178) - ($179))|0;
    $181 = ($180>>>0)<($$lcssa180>>>0);
    do {
     if ($181) {
      $182 = (_memchr($z$0$us$i,0,$175)|0);
      $183 = ($182|0)==(0|0);
      if ($183) {
       $187 = (($z$0$us$i) + ($175)|0);
       $z$1$us$i = $187;
       break;
      } else {
       $184 = $182;
       $185 = (($184) - ($179))|0;
       $186 = ($185>>>0)<($$lcssa180>>>0);
       if ($186) {
        label = 104;
        break L100;
       } else {
        $z$1$us$i = $182;
        break;
       }
      }
     } else {
      $z$1$us$i = $z$0$us$i;
     }
    } while(0);
    $188 = (($$03$us$i) + ($l$080$i$lcssa179)|0);
    $189 = HEAP8[$188>>0]|0;
    $div$us$i = ($189&255) >>> 5;
    $190 = $div$us$i&255;
    $191 = (($byteset$i) + ($190<<2)|0);
    $192 = HEAP32[$191>>2]|0;
    $193 = $189 & 31;
    $194 = $193&255;
    $195 = 1 << $194;
    $196 = $195 & $192;
    $197 = ($196|0)==(0);
    L108: do {
     if ($197) {
      $227 = (($$03$us$i) + ($$lcssa180)|0);
      $$03$us$i$be = $227;$mem$0$us$i$be = 0;
     } else {
      $198 = $189&255;
      $199 = (($shift$i) + ($198<<2)|0);
      $200 = HEAP32[$199>>2]|0;
      $201 = (($$lcssa180) - ($200))|0;
      $202 = ($$lcssa180|0)==($200|0);
      if (!($202)) {
       $203 = ($mem$0$us$i|0)!=(0);
       $204 = ($201>>>0)<($p$1$p$0$i>>>0);
       $or$cond5$us$i = $203 & $204;
       $k$2$us$i = $or$cond5$us$i ? $174 : $201;
       $205 = (($$03$us$i) + ($k$2$us$i)|0);
       $$03$us$i$be = $205;$mem$0$us$i$be = 0;
       break;
      }
      $206 = ($166>>>0)>($mem$0$us$i>>>0);
      $$mem$0$us$i = $206 ? $166 : $mem$0$us$i;
      $207 = (($n) + ($$mem$0$us$i)|0);
      $208 = HEAP8[$207>>0]|0;
      $209 = ($208<<24>>24)==(0);
      do {
       if (!($209)) {
        $$pr$us$i = $208;$k$338$us$i = $$mem$0$us$i;
        while(1) {
         $214 = (($$03$us$i) + ($k$338$us$i)|0);
         $215 = HEAP8[$214>>0]|0;
         $216 = ($$pr$us$i<<24>>24)==($215<<24>>24);
         $211 = (($k$338$us$i) + 1)|0;
         if (!($216)) {
          $k$338$us$i$lcssa = $k$338$us$i;
          label = 77;
          break;
         }
         $210 = (($n) + ($211)|0);
         $212 = HEAP8[$210>>0]|0;
         $213 = ($212<<24>>24)==(0);
         if ($213) {
          label = 73;
          break;
         } else {
          $$pr$us$i = $212;$k$338$us$i = $211;
         }
        }
        if ((label|0) == 73) {
         label = 0;
         break;
        }
        else if ((label|0) == 77) {
         label = 0;
         $217 = (($k$338$us$i$lcssa) - ($ip$1$ip$0$i))|0;
         $218 = (($$03$us$i) + ($217)|0);
         $$03$us$i$be = $218;$mem$0$us$i$be = 0;
         break L108;
        }
       }
      } while(0);
      $k$4$us$i = $166;
      while(1) {
       $219 = ($k$4$us$i>>>0)>($mem$0$us$i>>>0);
       if (!($219)) {
        $$03$us$i$lcssa138 = $$03$us$i;
        label = 103;
        break L100;
       }
       $220 = (($k$4$us$i) + -1)|0;
       $221 = (($n) + ($220)|0);
       $222 = HEAP8[$221>>0]|0;
       $223 = (($$03$us$i) + ($220)|0);
       $224 = HEAP8[$223>>0]|0;
       $225 = ($222<<24>>24)==($224<<24>>24);
       if ($225) {
        $k$4$us$i = $220;
       } else {
        break;
       }
      }
      $226 = (($$03$us$i) + ($p$1$p$0$i)|0);
      $$03$us$i$be = $226;$mem$0$us$i$be = $174;
     }
    } while(0);
    $$03$us$i = $$03$us$i$be;$mem$0$us$i = $mem$0$us$i$be;$z$0$us$i = $z$1$us$i;
   }
   if ((label|0) == 103) {
    $$0 = $$03$us$i$lcssa138;
    STACKTOP = sp;return ($$0|0);
   }
   else if ((label|0) == 104) {
    $$0 = 0;
    STACKTOP = sp;return ($$0|0);
   }
  }
 } else {
  $169 = (($$lcssa180) - ($ip$1$ip$0$i))|0;
  $170 = (($169) + -1)|0;
  $171 = ($ip$1$ip$0$i>>>0)>($170>>>0);
  $ip$1$ip$0$$i = $171 ? $ip$1$ip$0$i : $170;
  $172 = (($ip$1$ip$0$$i) + 1)|0;
  $173 = $$lcssa180 | 63;
  $232 = $173;$p$3155$i = $172;
 }
 $177 = (($n) + ($166)|0);
 $$03$i = $3;$z$0$i = $3;
 L134: while(1) {
  $228 = $z$0$i;
  $229 = $$03$i;
  $230 = (($228) - ($229))|0;
  $231 = ($230>>>0)<($$lcssa180>>>0);
  do {
   if ($231) {
    $233 = (_memchr($z$0$i,0,$232)|0);
    $234 = ($233|0)==(0|0);
    if ($234) {
     $238 = (($z$0$i) + ($232)|0);
     $z$1$i = $238;
     break;
    } else {
     $235 = $233;
     $236 = (($235) - ($229))|0;
     $237 = ($236>>>0)<($$lcssa180>>>0);
     if ($237) {
      label = 102;
      break L134;
     } else {
      $z$1$i = $233;
      break;
     }
    }
   } else {
    $z$1$i = $z$0$i;
   }
  } while(0);
  $239 = (($$03$i) + ($l$080$i$lcssa179)|0);
  $240 = HEAP8[$239>>0]|0;
  $div$i = ($240&255) >>> 5;
  $241 = $div$i&255;
  $242 = (($byteset$i) + ($241<<2)|0);
  $243 = HEAP32[$242>>2]|0;
  $244 = $240 & 31;
  $245 = $244&255;
  $246 = 1 << $245;
  $247 = $246 & $243;
  $248 = ($247|0)==(0);
  L142: do {
   if ($248) {
    $255 = (($$03$i) + ($$lcssa180)|0);
    $$03$i$be = $255;
   } else {
    $249 = $240&255;
    $250 = (($shift$i) + ($249<<2)|0);
    $251 = HEAP32[$250>>2]|0;
    $252 = ($$lcssa180|0)==($251|0);
    if (!($252)) {
     $253 = (($$lcssa180) - ($251))|0;
     $254 = (($$03$i) + ($253)|0);
     $$03$i$be = $254;
     break;
    }
    $256 = HEAP8[$177>>0]|0;
    $257 = ($256<<24>>24)==(0);
    do {
     if (!($257)) {
      $$pr$i = $256;$k$338$i = $166;
      while(1) {
       $262 = (($$03$i) + ($k$338$i)|0);
       $263 = HEAP8[$262>>0]|0;
       $264 = ($$pr$i<<24>>24)==($263<<24>>24);
       $259 = (($k$338$i) + 1)|0;
       if (!($264)) {
        $k$338$i$lcssa = $k$338$i;
        label = 97;
        break;
       }
       $258 = (($n) + ($259)|0);
       $260 = HEAP8[$258>>0]|0;
       $261 = ($260<<24>>24)==(0);
       if ($261) {
        label = 93;
        break;
       } else {
        $$pr$i = $260;$k$338$i = $259;
       }
      }
      if ((label|0) == 93) {
       label = 0;
       break;
      }
      else if ((label|0) == 97) {
       label = 0;
       $265 = (($k$338$i$lcssa) - ($ip$1$ip$0$i))|0;
       $266 = (($$03$i) + ($265)|0);
       $$03$i$be = $266;
       break L142;
      }
     }
    } while(0);
    $k$4$i = $166;
    while(1) {
     $267 = ($k$4$i|0)==(0);
     if ($267) {
      $$03$i$lcssa136 = $$03$i;
      label = 101;
      break L134;
     }
     $268 = (($k$4$i) + -1)|0;
     $269 = (($n) + ($268)|0);
     $270 = HEAP8[$269>>0]|0;
     $271 = (($$03$i) + ($268)|0);
     $272 = HEAP8[$271>>0]|0;
     $273 = ($270<<24>>24)==($272<<24>>24);
     if ($273) {
      $k$4$i = $268;
     } else {
      break;
     }
    }
    $274 = (($$03$i) + ($p$3155$i)|0);
    $$03$i$be = $274;
   }
  } while(0);
  $$03$i = $$03$i$be;$z$0$i = $z$1$i;
 }
 if ((label|0) == 101) {
  $$0 = $$03$i$lcssa136;
  STACKTOP = sp;return ($$0|0);
 }
 else if ((label|0) == 102) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function __Znwj($size) {
 $size = $size|0;
 var $$lcssa = 0, $$lcssa3 = 0, $$size = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($size|0)==(0);
 $$size = $0 ? 1 : $size;
 $1 = (_malloc($$size)|0);
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   while(1) {
    $3 = (__ZSt15get_new_handlerv()|0);
    $4 = ($3|0)==(0|0);
    if ($4) {
     label = 5;
     break;
    }
    FUNCTION_TABLE_v[$3 & 31]();
    $5 = (_malloc($$size)|0);
    $6 = ($5|0)==(0|0);
    if (!($6)) {
     $$lcssa3 = $5;
     label = 6;
     break;
    }
   }
   if ((label|0) == 5) {
    $7 = (___cxa_allocate_exception(4)|0);
    HEAP32[$7>>2] = ((1088 + 8|0));
    ___cxa_throw(($7|0),(1144|0),(1|0));
    // unreachable;
   }
   else if ((label|0) == 6) {
    $$lcssa = $$lcssa3;
    break;
   }
  } else {
   $$lcssa = $1;
  }
 } while(0);
 return ($$lcssa|0);
}
function __Znaj($size) {
 $size = $size|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj($size)|0);
 return ($0|0);
}
function __ZdlPv($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _free($ptr);
 return;
}
function __ZdaPv($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($ptr);
 return;
}
function __ZNSt9bad_allocD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNSt9bad_allocD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZNKSt9bad_alloc4whatEv($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (1112|0);
}
function __ZSt15get_new_handlerv() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1160>>2]|0;HEAP32[1160>>2] = (($0+0)|0);
 $1 = $0;
 return ($1|0);
}
function __ZNSt9exceptionD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNSt9type_infoD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv116__shim_type_infoD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv117__class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZN10__cxxabiv120__si_class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($this,$thrown_type,$adjustedPtr) {
 $this = $this|0;
 $thrown_type = $thrown_type|0;
 $adjustedPtr = $adjustedPtr|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $info = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $info = sp;
 $0 = ($this|0)==($thrown_type|0);
 if ($0) {
  $$1 = 1;
 } else {
  $1 = ($thrown_type|0)==(0|0);
  if ($1) {
   $$1 = 0;
  } else {
   $2 = (___dynamic_cast($thrown_type,1256,1312,0)|0);
   $3 = ($2|0)==(0|0);
   if ($3) {
    $$1 = 0;
   } else {
    dest=$info+0|0; stop=dest+56|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
    HEAP32[$info>>2] = $2;
    $4 = (($info) + 8|0);
    HEAP32[$4>>2] = $this;
    $5 = (($info) + 12|0);
    HEAP32[$5>>2] = -1;
    $6 = (($info) + 48|0);
    HEAP32[$6>>2] = 1;
    $7 = HEAP32[$2>>2]|0;
    $8 = (($7) + 28|0);
    $9 = HEAP32[$8>>2]|0;
    $10 = HEAP32[$adjustedPtr>>2]|0;
    FUNCTION_TABLE_viiii[$9 & 15]($2,$info,$10,1);
    $11 = (($info) + 24|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==(1);
    if ($13) {
     $14 = (($info) + 16|0);
     $15 = HEAP32[$14>>2]|0;
     HEAP32[$adjustedPtr>>2] = $15;
     $$1 = 1;
    } else {
     $$1 = 0;
    }
   }
  }
 }
 STACKTOP = sp;return ($$1|0);
}
function __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   HEAP32[$0>>2] = $adjustedPtr;
   $3 = (($info) + 24|0);
   HEAP32[$3>>2] = $path_below;
   $4 = (($info) + 36|0);
   HEAP32[$4>>2] = 1;
  } else {
   $5 = ($1|0)==($adjustedPtr|0);
   if (!($5)) {
    $9 = (($info) + 36|0);
    $10 = HEAP32[$9>>2]|0;
    $11 = (($10) + 1)|0;
    HEAP32[$9>>2] = $11;
    $12 = (($info) + 24|0);
    HEAP32[$12>>2] = 2;
    $13 = (($info) + 54|0);
    HEAP8[$13>>0] = 1;
    break;
   }
   $6 = (($info) + 24|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = ($7|0)==(2);
   if ($8) {
    HEAP32[$6>>2] = $path_below;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==($this|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
 }
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
 } else {
  $3 = (($this) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = HEAP32[$4>>2]|0;
  $6 = (($5) + 28|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viiii[$7 & 15]($4,$info,$adjustedPtr,$path_below);
 }
 return;
}
function ___dynamic_cast($static_ptr,$static_type,$dst_type,$src2dst_offset) {
 $static_ptr = $static_ptr|0;
 $static_type = $static_type|0;
 $dst_type = $dst_type|0;
 $src2dst_offset = $src2dst_offset|0;
 var $$ = 0, $$8 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dst_ptr$0 = 0, $info = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $info = sp;
 $0 = HEAP32[$static_ptr>>2]|0;
 $1 = (($0) + -8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2;
 $4 = (($static_ptr) + ($3)|0);
 $5 = (($0) + -4|0);
 $6 = HEAP32[$5>>2]|0;
 HEAP32[$info>>2] = $dst_type;
 $7 = (($info) + 4|0);
 HEAP32[$7>>2] = $static_ptr;
 $8 = (($info) + 8|0);
 HEAP32[$8>>2] = $static_type;
 $9 = (($info) + 12|0);
 HEAP32[$9>>2] = $src2dst_offset;
 $10 = (($info) + 16|0);
 $11 = (($info) + 20|0);
 $12 = (($info) + 24|0);
 $13 = (($info) + 28|0);
 $14 = (($info) + 32|0);
 $15 = (($info) + 40|0);
 $16 = ($6|0)==($dst_type|0);
 dest=$10+0|0; stop=dest+36|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));HEAP16[$10+36>>1]=0|0;HEAP8[$10+38>>0]=0|0;
 do {
  if ($16) {
   $17 = (($info) + 48|0);
   HEAP32[$17>>2] = 1;
   $18 = HEAP32[$6>>2]|0;
   $19 = (($18) + 20|0);
   $20 = HEAP32[$19>>2]|0;
   FUNCTION_TABLE_viiiiii[$20 & 15]($6,$info,$4,$4,1,0);
   $21 = HEAP32[$12>>2]|0;
   $22 = ($21|0)==(1);
   $$ = $22 ? $4 : 0;
   $dst_ptr$0 = $$;
  } else {
   $23 = (($info) + 36|0);
   $24 = HEAP32[$6>>2]|0;
   $25 = (($24) + 24|0);
   $26 = HEAP32[$25>>2]|0;
   FUNCTION_TABLE_viiiii[$26 & 15]($6,$info,$4,1,0);
   $27 = HEAP32[$23>>2]|0;
   if ((($27|0) == 0)) {
    $28 = HEAP32[$15>>2]|0;
    $29 = ($28|0)==(1);
    $30 = HEAP32[$13>>2]|0;
    $31 = ($30|0)==(1);
    $or$cond = $29 & $31;
    $32 = HEAP32[$14>>2]|0;
    $33 = ($32|0)==(1);
    $or$cond3 = $or$cond & $33;
    $34 = HEAP32[$11>>2]|0;
    $$8 = $or$cond3 ? $34 : 0;
    $dst_ptr$0 = $$8;
    break;
   } else if (!((($27|0) == 1))) {
    $dst_ptr$0 = 0;
    break;
   }
   $35 = HEAP32[$12>>2]|0;
   $36 = ($35|0)==(1);
   if (!($36)) {
    $37 = HEAP32[$15>>2]|0;
    $38 = ($37|0)==(0);
    $39 = HEAP32[$13>>2]|0;
    $40 = ($39|0)==(1);
    $or$cond5 = $38 & $40;
    $41 = HEAP32[$14>>2]|0;
    $42 = ($41|0)==(1);
    $or$cond7 = $or$cond5 & $42;
    if (!($or$cond7)) {
     $dst_ptr$0 = 0;
     break;
    }
   }
   $43 = HEAP32[$10>>2]|0;
   $dst_ptr$0 = $43;
  }
 } while(0);
 STACKTOP = sp;return ($dst_ptr$0|0);
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($this,$info,$dst_ptr,$current_ptr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 53|0);
 HEAP8[$0>>0] = 1;
 $1 = (($info) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==($current_ptr|0);
 do {
  if ($3) {
   $4 = (($info) + 52|0);
   HEAP8[$4>>0] = 1;
   $5 = (($info) + 16|0);
   $6 = HEAP32[$5>>2]|0;
   $7 = ($6|0)==(0|0);
   if ($7) {
    HEAP32[$5>>2] = $dst_ptr;
    $8 = (($info) + 24|0);
    HEAP32[$8>>2] = $path_below;
    $9 = (($info) + 36|0);
    HEAP32[$9>>2] = 1;
    $10 = (($info) + 48|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ($11|0)==(1);
    $13 = ($path_below|0)==(1);
    $or$cond = $12 & $13;
    if (!($or$cond)) {
     break;
    }
    $14 = (($info) + 54|0);
    HEAP8[$14>>0] = 1;
    break;
   }
   $15 = ($6|0)==($dst_ptr|0);
   if (!($15)) {
    $25 = (($info) + 36|0);
    $26 = HEAP32[$25>>2]|0;
    $27 = (($26) + 1)|0;
    HEAP32[$25>>2] = $27;
    $28 = (($info) + 54|0);
    HEAP8[$28>>0] = 1;
    break;
   }
   $16 = (($info) + 24|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = ($17|0)==(2);
   if ($18) {
    HEAP32[$16>>2] = $path_below;
    $22 = $path_below;
   } else {
    $22 = $17;
   }
   $19 = (($info) + 48|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ($20|0)==(1);
   $23 = ($22|0)==(1);
   $or$cond1 = $21 & $23;
   if ($or$cond1) {
    $24 = (($info) + 54|0);
    HEAP8[$24>>0] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $is_dst_type_derived_from_static_type$0$off01 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 L1: do {
  if ($2) {
   $3 = (($info) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = (($info) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($this|0)==($9|0);
   if (!($10)) {
    $43 = (($this) + 8|0);
    $44 = HEAP32[$43>>2]|0;
    $45 = HEAP32[$44>>2]|0;
    $46 = (($45) + 24|0);
    $47 = HEAP32[$46>>2]|0;
    FUNCTION_TABLE_viiiii[$47 & 15]($44,$info,$current_ptr,$path_below,$use_strcmp);
    break;
   }
   $11 = (($info) + 16|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = ($12|0)==($current_ptr|0);
   if (!($13)) {
    $14 = (($info) + 20|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)==($current_ptr|0);
    if (!($16)) {
     $19 = (($info) + 32|0);
     HEAP32[$19>>2] = $path_below;
     $20 = (($info) + 44|0);
     $21 = HEAP32[$20>>2]|0;
     $22 = ($21|0)==(4);
     if ($22) {
      break;
     }
     $23 = (($info) + 52|0);
     HEAP8[$23>>0] = 0;
     $24 = (($info) + 53|0);
     HEAP8[$24>>0] = 0;
     $25 = (($this) + 8|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = HEAP32[$26>>2]|0;
     $28 = (($27) + 20|0);
     $29 = HEAP32[$28>>2]|0;
     FUNCTION_TABLE_viiiiii[$29 & 15]($26,$info,$current_ptr,$current_ptr,1,$use_strcmp);
     $30 = HEAP8[$24>>0]|0;
     $31 = ($30<<24>>24)==(0);
     if ($31) {
      $is_dst_type_derived_from_static_type$0$off01 = 0;
      label = 13;
     } else {
      $32 = HEAP8[$23>>0]|0;
      $not$ = ($32<<24>>24)==(0);
      if ($not$) {
       $is_dst_type_derived_from_static_type$0$off01 = 1;
       label = 13;
      }
     }
     do {
      if ((label|0) == 13) {
       HEAP32[$14>>2] = $current_ptr;
       $33 = (($info) + 40|0);
       $34 = HEAP32[$33>>2]|0;
       $35 = (($34) + 1)|0;
       HEAP32[$33>>2] = $35;
       $36 = (($info) + 36|0);
       $37 = HEAP32[$36>>2]|0;
       $38 = ($37|0)==(1);
       if ($38) {
        $39 = (($info) + 24|0);
        $40 = HEAP32[$39>>2]|0;
        $41 = ($40|0)==(2);
        if ($41) {
         $42 = (($info) + 54|0);
         HEAP8[$42>>0] = 1;
         if ($is_dst_type_derived_from_static_type$0$off01) {
          break;
         }
        } else {
         label = 16;
        }
       } else {
        label = 16;
       }
       if ((label|0) == 16) {
        if ($is_dst_type_derived_from_static_type$0$off01) {
         break;
        }
       }
       HEAP32[$20>>2] = 4;
       break L1;
      }
     } while(0);
     HEAP32[$20>>2] = 3;
     break;
    }
   }
   $17 = ($path_below|0)==(1);
   if ($17) {
    $18 = (($info) + 32|0);
    HEAP32[$18>>2] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==($this|0);
 do {
  if ($2) {
   $3 = (($info) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = (($info) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($9|0)==($this|0);
   if ($10) {
    $11 = (($info) + 16|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==($current_ptr|0);
    if (!($13)) {
     $14 = (($info) + 20|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ($15|0)==($current_ptr|0);
     if (!($16)) {
      $19 = (($info) + 32|0);
      HEAP32[$19>>2] = $path_below;
      HEAP32[$14>>2] = $current_ptr;
      $20 = (($info) + 40|0);
      $21 = HEAP32[$20>>2]|0;
      $22 = (($21) + 1)|0;
      HEAP32[$20>>2] = $22;
      $23 = (($info) + 36|0);
      $24 = HEAP32[$23>>2]|0;
      $25 = ($24|0)==(1);
      if ($25) {
       $26 = (($info) + 24|0);
       $27 = HEAP32[$26>>2]|0;
       $28 = ($27|0)==(2);
       if ($28) {
        $29 = (($info) + 54|0);
        HEAP8[$29>>0] = 1;
       }
      }
      $30 = (($info) + 44|0);
      HEAP32[$30>>2] = 4;
      break;
     }
    }
    $17 = ($path_below|0)==(1);
    if ($17) {
     $18 = (($info) + 32|0);
     HEAP32[$18>>2] = 1;
    }
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 } else {
  $3 = (($this) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = HEAP32[$4>>2]|0;
  $6 = (($5) + 20|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viiiiii[$7 & 15]($4,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp);
 }
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($info) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==($this|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 }
 return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$lcssa = 0, $$lcssa110 = 0, $$lcssa112 = 0, $$lcssa115 = 0, $$lcssa116 = 0, $$lcssa117 = 0, $$lcssa118 = 0, $$lcssa120 = 0, $$lcssa123 = 0, $$lcssa125 = 0, $$lcssa127 = 0, $$lcssa130 = 0, $$lcssa132 = 0, $$lcssa134 = 0, $$lcssa137 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0;
 var $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$rsize$3$i$lcssa = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0, $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0;
 var $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0, $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0;
 var $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0;
 var $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0;
 var $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0;
 var $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0;
 var $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0;
 var $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0;
 var $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0;
 var $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0;
 var $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0;
 var $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0;
 var $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0;
 var $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0;
 var $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0;
 var $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0;
 var $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0;
 var $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0;
 var $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0;
 var $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0;
 var $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0;
 var $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0;
 var $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0;
 var $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0;
 var $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0;
 var $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0;
 var $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0;
 var $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0;
 var $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0;
 var $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0;
 var $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0;
 var $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0;
 var $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0;
 var $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0;
 var $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0;
 var $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0;
 var $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0;
 var $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0;
 var $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0;
 var $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0;
 var $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0;
 var $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0;
 var $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0;
 var $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0;
 var $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0;
 var $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0;
 var $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0;
 var $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0;
 var $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0;
 var $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0;
 var $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0;
 var $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0;
 var $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0;
 var $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0;
 var $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0;
 var $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0;
 var $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0;
 var $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0;
 var $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0;
 var $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0, $R$0$i = 0, $R$0$i$be = 0, $R$0$i$i = 0, $R$0$i$i$be = 0;
 var $R$0$i$i$lcssa = 0, $R$0$i$i$ph = 0, $R$0$i$lcssa = 0, $R$0$i$ph = 0, $R$0$i18 = 0, $R$0$i18$be = 0, $R$0$i18$lcssa = 0, $R$0$i18$ph = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$be = 0, $RP$0$i$i = 0, $RP$0$i$i$be = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$i$ph = 0, $RP$0$i$lcssa = 0, $RP$0$i$ph = 0, $RP$0$i17 = 0;
 var $RP$0$i17$be = 0, $RP$0$i17$lcssa = 0, $RP$0$i17$ph = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$014$i$i$lcssa = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$052$i$i = 0, $T$052$i$i$lcssa = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0;
 var $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0;
 var $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$2$i$ph = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$0$i$i$lcssa = 0, $sp$074$i = 0, $sp$074$i$lcssa = 0, $sp$173$i = 0, $sp$173$i$lcssa = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0;
 var $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$1$i$ph = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$2$v$3$i$lcssa = 0, $t$230$i = 0, $t$230$i$be = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$2$i$ph = 0, $v$3$lcssa$i = 0;
 var $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[1464>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((1464 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((1464 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[1464>>2] = $22;
     } else {
      $23 = HEAP32[((1464 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[((1464 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((1464 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((1464 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[1464>>2] = $74;
       $88 = $34;
      } else {
       $75 = HEAP32[((1464 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((1464 + 8|0))>>2]|0;
        $88 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[((1464 + 20|0))>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = ((1464 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[1464>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[1464>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((1464 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((1464 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((1464 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((1464 + 8|0))>>2] = $81;
     HEAP32[((1464 + 20|0))>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[((1464 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((1464 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((1464 + 16|0))>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($5)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i$lcssa) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i$lcssa) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = (($v$0$i$lcssa) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i$lcssa) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i$ph = $171;$RP$0$i$ph = $170;
        }
       } else {
        $R$0$i$ph = $168;$RP$0$i$ph = $167;
       }
       $R$0$i = $R$0$i$ph;$RP$0$i = $RP$0$i$ph;
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if ($175) {
         $176 = (($R$0$i) + 16|0);
         $177 = HEAP32[$176>>2]|0;
         $178 = ($177|0)==(0|0);
         if ($178) {
          $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
          break;
         } else {
          $R$0$i$be = $177;$RP$0$i$be = $176;
         }
        } else {
         $R$0$i$be = $174;$RP$0$i$be = $173;
        }
        $R$0$i = $R$0$i$be;$RP$0$i = $RP$0$i$be;
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = (($v$0$i$lcssa) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i$lcssa) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((1464 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((1464 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((1464 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((1464 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((1464 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i$lcssa) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i$lcssa) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((1464 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i$lcssa) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i$lcssa) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($5))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[((1464 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((1464 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((1464 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[1464>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[1464>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((1464 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((1464 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((1464 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((1464 + 8|0))>>2] = $rsize$0$i$lcssa;
      HEAP32[((1464 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i$lcssa) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((1464 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((1464 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     if ($277) {
      $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
     } else {
      $278 = ($idx$0$i|0)==(31);
      if ($278) {
       $282 = 0;
      } else {
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $282 = $280;
      }
      $281 = $246 << $282;
      $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
      while(1) {
       $283 = (($t$0$i14) + 4|0);
       $284 = HEAP32[$283>>2]|0;
       $285 = $284 & -8;
       $286 = (($285) - ($246))|0;
       $287 = ($286>>>0)<($rsize$0$i15>>>0);
       if ($287) {
        $288 = ($285|0)==($246|0);
        if ($288) {
         $rsize$2$i$ph = $286;$t$1$i$ph = $t$0$i14;$v$2$i$ph = $t$0$i14;
         break;
        } else {
         $rsize$1$i = $286;$v$1$i = $t$0$i14;
        }
       } else {
        $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
       }
       $289 = (($t$0$i14) + 20|0);
       $290 = HEAP32[$289>>2]|0;
       $291 = $sizebits$0$i >>> 31;
       $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
       $293 = HEAP32[$292>>2]|0;
       $294 = ($290|0)==(0|0);
       $295 = ($290|0)==($293|0);
       $or$cond19$i = $294 | $295;
       $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
       $296 = ($293|0)==(0|0);
       $297 = $sizebits$0$i << 1;
       if ($296) {
        $rsize$2$i$ph = $rsize$1$i;$t$1$i$ph = $rst$1$i;$v$2$i$ph = $v$1$i;
        break;
       } else {
        $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
       }
      }
      $rsize$2$i = $rsize$2$i$ph;$t$1$i = $t$1$i$ph;$v$2$i = $v$2$i$ph;
     }
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((1464 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if ($338) {
        $339 = (($t$230$i) + 20|0);
        $340 = HEAP32[$339>>2]|0;
        $341 = ($340|0)==(0|0);
        if ($341) {
         $$rsize$3$i$lcssa = $$rsize$3$i;$t$2$v$3$i$lcssa = $t$2$v$3$i;
         break;
        } else {
         $t$230$i$be = $340;
        }
       } else {
        $t$230$i$be = $337;
       }
       $rsize$331$i = $$rsize$3$i;$t$230$i = $t$230$i$be;$v$332$i = $t$2$v$3$i;
      }
      $rsize$3$lcssa$i = $$rsize$3$i$lcssa;$v$3$lcssa$i = $t$2$v$3$i$lcssa;
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((1464 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((1464 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18$ph = $368;$RP$0$i17$ph = $367;
          }
         } else {
          $R$0$i18$ph = $365;$RP$0$i17$ph = $364;
         }
         $R$0$i18 = $R$0$i18$ph;$RP$0$i17 = $RP$0$i17$ph;
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if ($372) {
           $373 = (($R$0$i18) + 16|0);
           $374 = HEAP32[$373>>2]|0;
           $375 = ($374|0)==(0|0);
           if ($375) {
            $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
            break;
           } else {
            $R$0$i18$be = $374;$RP$0$i17$be = $373;
           }
          } else {
           $R$0$i18$be = $371;$RP$0$i17$be = $370;
          }
          $R$0$i18 = $R$0$i18$be;$RP$0$i17 = $RP$0$i17$be;
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((1464 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((1464 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((1464 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((1464 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((1464 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((1464 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L95: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((1464 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[1464>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[1464>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((1464 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((1464 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((1464 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((1464 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((1464 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((1464 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$029$i = $483;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = ((($T$028$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa134 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $$lcssa137 = $487;
             label = 163;
             break;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           if ((label|0) == 163) {
            $T$0$lcssa$i = $$lcssa137;
            break;
           }
           $494 = HEAP32[((1464 + 16|0))>>2]|0;
           $495 = ($$lcssa134>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa134>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L95;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((1464 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((1464 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((1464 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((1464 + 20|0))>>2] = $514;
   HEAP32[((1464 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((1464 + 8|0))>>2] = 0;
   HEAP32[((1464 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[((1464 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((1464 + 12|0))>>2] = $528;
  $529 = HEAP32[((1464 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((1464 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[1936>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((1936 + 8|0))>>2] = $538;
    HEAP32[((1936 + 4|0))>>2] = $538;
    HEAP32[((1936 + 12|0))>>2] = -1;
    HEAP32[((1936 + 16|0))>>2] = -1;
    HEAP32[((1936 + 20|0))>>2] = 0;
    HEAP32[((1464 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[1936>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((1936 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[((1464 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((1464 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[((1464 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L279: do {
  if ($560) {
   $561 = HEAP32[((1464 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   do {
    if ($562) {
     label = 191;
    } else {
     $sp$0$i$i = ((1464 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa130 = $sp$0$i$i;$$lcssa132 = $565;$sp$0$i$i$lcssa = $sp$0$i$i;
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 190;
       break;
      } else {
       $sp$0$i$i = $570;
      }
     }
     if ((label|0) == 190) {
      label = 191;
      break;
     }
     $572 = ($sp$0$i$i$lcssa|0)==(0|0);
     if ($572) {
      label = 191;
     } else {
      $595 = HEAP32[((1464 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$$lcssa130>>2]|0;
       $601 = HEAP32[$$lcssa132>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 200;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 201;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 191) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((1936 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((1464 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((1464 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 200;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 201;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L303: do {
    if ((label|0) == 200) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 211;
      break L279;
     }
    }
    else if ((label|0) == 201) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((1936 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L303;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 211;
      break L279;
     }
    }
   } while(0);
   $619 = HEAP32[((1464 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((1464 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 208;
  } else {
   $tsize$1$i = 0;
   label = 208;
  }
 } while(0);
 if ((label|0) == 208) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 211;
    }
   }
  }
 }
 if ((label|0) == 211) {
  $632 = HEAP32[((1464 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((1464 + 432|0))>>2] = $633;
  $634 = HEAP32[((1464 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((1464 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((1464 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L323: do {
   if ($637) {
    $638 = HEAP32[((1464 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((1464 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((1464 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((1464 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((1464 + 460|0))>>2] = 0;
    $641 = HEAP32[1936>>2]|0;
    HEAP32[((1464 + 36|0))>>2] = $641;
    HEAP32[((1464 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((1464 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((1464 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((1464 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((1464 + 24|0))>>2] = $654;
    HEAP32[((1464 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((1936 + 16|0))>>2]|0;
    HEAP32[((1464 + 28|0))>>2] = $660;
   } else {
    $sp$074$i = ((1464 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$074$i>>2]|0;
     $662 = (($sp$074$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      $$lcssa123 = $661;$$lcssa125 = $662;$$lcssa127 = $663;$sp$074$i$lcssa = $sp$074$i;
      label = 224;
      break;
     }
     $666 = (($sp$074$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      label = 229;
      break;
     } else {
      $sp$074$i = $667;
     }
    }
    if ((label|0) == 224) {
     $669 = (($sp$074$i$lcssa) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($$lcssa123>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($$lcssa127) + ($tsize$244$i))|0;
       HEAP32[$$lcssa125>>2] = $675;
       $676 = HEAP32[((1464 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((1464 + 24|0))>>2] = $684;
       HEAP32[((1464 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((1936 + 16|0))>>2]|0;
       HEAP32[((1464 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    else if ((label|0) == 229) {
    }
    $691 = HEAP32[((1464 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((1464 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$173$i = ((1464 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$173$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      $$lcssa120 = $sp$173$i;$sp$173$i$lcssa = $sp$173$i;
      label = 235;
      break;
     }
     $696 = (($sp$173$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      label = 319;
      break;
     } else {
      $sp$173$i = $697;
     }
    }
    if ((label|0) == 235) {
     $699 = (($sp$173$i$lcssa) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$$lcssa120>>2] = $tbase$245$i;
      $703 = (($sp$173$i$lcssa) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L352: do {
       if ($729) {
        $730 = HEAP32[((1464 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((1464 + 12|0))>>2] = $731;
        HEAP32[((1464 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((1464 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((1464 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((1464 + 8|0))>>2] = $737;
         HEAP32[((1464 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L360: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((1464 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[1464>>2]|0;
            $764 = $763 & $762;
            HEAP32[1464>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i$ph = $789;$RP$0$i$i$ph = $788;
              }
             } else {
              $R$0$i$i$ph = $786;$RP$0$i$i$ph = $785;
             }
             $R$0$i$i = $R$0$i$i$ph;$RP$0$i$i = $RP$0$i$i$ph;
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if ($793) {
               $794 = (($R$0$i$i) + 16|0);
               $795 = HEAP32[$794>>2]|0;
               $796 = ($795|0)==(0|0);
               if ($796) {
                $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
                break;
               } else {
                $R$0$i$i$be = $795;$RP$0$i$i$be = $794;
               }
              } else {
               $R$0$i$i$be = $792;$RP$0$i$i$be = $791;
              }
              $R$0$i$i = $R$0$i$i$be;$RP$0$i$i = $RP$0$i$i$be;
             }
             $797 = ($RP$0$i$i$lcssa>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((1464 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((1464 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((1464 + 4|0))>>2] = $807;
             break L360;
            } else {
             $808 = HEAP32[((1464 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L360;
             }
            }
           } while(0);
           $815 = HEAP32[((1464 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((1464 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((1464 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[1464>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[1464>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((1464 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((1464 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((1464 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((1464 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((1464 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((1464 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            $$lcssa = $909;$T$052$i$i$lcssa = $T$052$i$i;
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $$lcssa110 = $904;
            label = 314;
            break;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          if ((label|0) == 314) {
           $T$0$lcssa$i26$i = $$lcssa110;
           break;
          }
          $911 = HEAP32[((1464 + 16|0))>>2]|0;
          $912 = ($$lcssa>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L352;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((1464 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      return ($mem$0|0);
     }
    }
    else if ((label|0) == 319) {
    }
    $sp$0$i$i$i = ((1464 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       $$lcssa116 = $926;$$lcssa117 = $929;$$lcssa118 = $930;
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($$lcssa117) + -47)|0;
    $$sum1$i14$i = (($$lcssa117) + -39)|0;
    $934 = (($$lcssa116) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($$lcssa116) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((1464 + 24|0))>>2] = $953;
    HEAP32[((1464 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((1936 + 16|0))>>2]|0;
    HEAP32[((1464 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((1464 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((1464 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((1464 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((1464 + 448|0))+12>>2]|0;
    HEAP32[((1464 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((1464 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((1464 + 460|0))>>2] = 0;
    HEAP32[((1464 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($$lcssa118>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($$lcssa118>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((1464 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[1464>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[1464>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((1464 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((1464 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((1464 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((1464 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((1464 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((1464 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         $$lcssa112 = $1048;$T$014$i$i$lcssa = $T$014$i$i;
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $$lcssa115 = $1043;
         label = 353;
         break;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       if ((label|0) == 353) {
        $T$0$lcssa$i$i = $$lcssa115;
        break;
       }
       $1050 = HEAP32[((1464 + 16|0))>>2]|0;
       $1051 = ($$lcssa112>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa112>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i$lcssa;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L323;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((1464 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((1464 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((1464 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((1464 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((1464 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$lcssa73 = 0, $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0;
 var $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0;
 var $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0;
 var $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0;
 var $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0;
 var $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0;
 var $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0;
 var $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0;
 var $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0;
 var $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0;
 var $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0;
 var $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0;
 var $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0;
 var $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0;
 var $320 = 0, $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$060 = 0, $R$0 = 0;
 var $R$0$be = 0, $R$0$lcssa = 0, $R$0$ph = 0, $R$1 = 0, $R7$0 = 0, $R7$0$be = 0, $R7$0$lcssa = 0, $R7$0$ph = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$be = 0, $RP$0$lcssa = 0, $RP$0$ph = 0, $RP9$0 = 0, $RP9$0$be = 0, $RP9$0$lcssa = 0, $RP9$0$ph = 0, $T$0$lcssa = 0, $T$059 = 0, $T$059$lcssa = 0;
 var $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((1464 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((1464 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((1464 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((1464 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[1464>>2]|0;
     $36 = $35 & $34;
     HEAP32[1464>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0$ph = $61;$RP$0$ph = $60;
      }
     } else {
      $R$0$ph = $58;$RP$0$ph = $57;
     }
     $R$0 = $R$0$ph;$RP$0 = $RP$0$ph;
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if ($65) {
       $66 = (($R$0) + 16|0);
       $67 = HEAP32[$66>>2]|0;
       $68 = ($67|0)==(0|0);
       if ($68) {
        $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
        break;
       } else {
        $R$0$be = $67;$RP$0$be = $66;
       }
      } else {
       $R$0$be = $64;$RP$0$be = $63;
      }
      $R$0 = $R$0$be;$RP$0 = $RP$0$be;
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((1464 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((1464 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((1464 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((1464 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((1464 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((1464 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((1464 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((1464 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((1464 + 12|0))>>2] = $120;
   HEAP32[((1464 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((1464 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[((1464 + 20|0))>>2] = 0;
   HEAP32[((1464 + 8|0))>>2] = 0;
   return;
  }
  $125 = HEAP32[((1464 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((1464 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((1464 + 8|0))>>2] = $128;
   HEAP32[((1464 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((1464 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((1464 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[1464>>2]|0;
     $152 = $151 & $150;
     HEAP32[1464>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((1464 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0$ph = $179;$RP9$0$ph = $178;
       }
      } else {
       $R7$0$ph = $176;$RP9$0$ph = $175;
      }
      $R7$0 = $R7$0$ph;$RP9$0 = $RP9$0$ph;
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if ($183) {
        $184 = (($R7$0) + 16|0);
        $185 = HEAP32[$184>>2]|0;
        $186 = ($185|0)==(0|0);
        if ($186) {
         $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
         break;
        } else {
         $R7$0$be = $185;$RP9$0$be = $184;
        }
       } else {
        $R7$0$be = $182;$RP9$0$be = $181;
       }
       $R7$0 = $R7$0$be;$RP9$0 = $RP9$0$be;
      }
      $187 = HEAP32[((1464 + 16|0))>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((1464 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((1464 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((1464 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((1464 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((1464 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((1464 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((1464 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((1464 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((1464 + 8|0))>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((1464 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[1464>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[1464>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((1464 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((1464 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((1464 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((1464 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((1464 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L205: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((1464 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$060 = $292;$T$059 = $284;
     while(1) {
      $300 = $K19$060 >>> 31;
      $301 = ((($T$059) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$059$lcssa = $T$059;
       break;
      }
      $294 = $K19$060 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $$lcssa73 = $296;
       label = 137;
       break;
      } else {
       $K19$060 = $294;$T$059 = $296;
      }
     }
     if ((label|0) == 137) {
      $T$0$lcssa = $$lcssa73;
      break;
     }
     $303 = HEAP32[((1464 + 16|0))>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$059$lcssa;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L205;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((1464 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((1464 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((1464 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if (!($319)) {
  return;
 }
 $sp$0$in$i = ((1464 + 456|0));
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((1464 + 32|0))>>2] = -1;
 return;
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$019$lcssa = 0, $$1$lcssa = 0, $$1$lcssa$ph = 0, $$110 = 0, $$24 = 0, $$3 = 0, $$3$ph = 0, $$lcssa = 0, $$lcssa47 = 0, $$lcssa48 = 0, $$lcssa49 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0;
 var $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0;
 var $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond18 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$020$lcssa = 0, $s$15 = 0, $s$2 = 0, $s$2$ph = 0;
 var $w$0$lcssa = 0, $w$0$lcssa$ph = 0, $w$011 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond18 = $3 & $4;
 do {
  if ($or$cond18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$019$lcssa = $$019;$s$020$lcssa = $s$020;
     label = 7;
     break;
    }
    $8 = (($s$020) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $12 & $13;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
    } else {
     $$lcssa47 = $8;$$lcssa48 = $9;$$lcssa49 = $13;
     label = 5;
     break;
    }
   }
   if ((label|0) == 5) {
    $$0$lcssa = $$lcssa48;$$lcssa = $$lcssa49;$s$0$lcssa = $$lcssa47;
    label = 6;
    break;
   }
   else if ((label|0) == 7) {
    $$0$lcssa44 = $$019$lcssa;$s$0$lcssa43 = $s$020$lcssa;
    break;
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 6;
  }
 } while(0);
 if ((label|0) == 6) {
  if ($$lcssa) {
   $$0$lcssa44 = $$0$lcssa;$s$0$lcssa43 = $s$0$lcssa;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
   $35 = ($$3|0)!=(0);
   $36 = $35 ? $s$2 : 0;
   return ($36|0);
  }
 }
 $14 = HEAP8[$s$0$lcssa43>>0]|0;
 $15 = $c&255;
 $16 = ($14<<24>>24)==($15<<24>>24);
 if ($16) {
  $$3 = $$0$lcssa44;$s$2 = $s$0$lcssa43;
  $35 = ($$3|0)!=(0);
  $36 = $35 ? $s$2 : 0;
  return ($36|0);
 }
 $17 = Math_imul($0, 16843009)|0;
 $18 = ($$0$lcssa44>>>0)>(3);
 if ($18) {
  $$110 = $$0$lcssa44;$w$011 = $s$0$lcssa43;
  while(1) {
   $19 = HEAP32[$w$011>>2]|0;
   $20 = $19 ^ $17;
   $21 = (($20) + -16843009)|0;
   $22 = $20 & -2139062144;
   $23 = $22 ^ -2139062144;
   $24 = $23 & $21;
   $25 = ($24|0)==(0);
   if (!($25)) {
    $$1$lcssa$ph = $$110;$w$0$lcssa$ph = $w$011;
    break;
   }
   $26 = (($w$011) + 4|0);
   $27 = (($$110) + -4)|0;
   $28 = ($27>>>0)>(3);
   if ($28) {
    $$110 = $27;$w$011 = $26;
   } else {
    $$1$lcssa$ph = $27;$w$0$lcssa$ph = $26;
    break;
   }
  }
  $$1$lcssa = $$1$lcssa$ph;$w$0$lcssa = $w$0$lcssa$ph;
 } else {
  $$1$lcssa = $$0$lcssa44;$w$0$lcssa = $s$0$lcssa43;
 }
 $29 = ($$1$lcssa|0)==(0);
 if ($29) {
  $$3 = 0;$s$2 = $w$0$lcssa;
  $35 = ($$3|0)!=(0);
  $36 = $35 ? $s$2 : 0;
  return ($36|0);
 }
 $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
 while(1) {
  $30 = HEAP8[$s$15>>0]|0;
  $31 = ($30<<24>>24)==($15<<24>>24);
  if ($31) {
   $$3$ph = $$24;$s$2$ph = $s$15;
   break;
  }
  $32 = (($s$15) + 1|0);
  $33 = (($$24) + -1)|0;
  $34 = ($33|0)==(0);
  if ($34) {
   $$3$ph = 0;$s$2$ph = $32;
   break;
  } else {
   $$24 = $33;$s$15 = $32;
  }
 }
 $$3 = $$3$ph;$s$2 = $s$2$ph;
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 return ($36|0);
}
function _memcmp($vl,$vr,$n) {
 $vl = $vl|0;
 $vr = $vr|0;
 $n = $n|0;
 var $$03 = 0, $$lcssa = 0, $$lcssa10 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$04 = 0, $r$05 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $11 = 0;
  return ($11|0);
 }
 $$03 = $n;$l$04 = $vl;$r$05 = $vr;
 while(1) {
  $1 = HEAP8[$l$04>>0]|0;
  $2 = HEAP8[$r$05>>0]|0;
  $3 = ($1<<24>>24)==($2<<24>>24);
  if (!($3)) {
   $$lcssa = $1;$$lcssa10 = $2;
   label = 5;
   break;
  }
  $4 = (($$03) + -1)|0;
  $5 = (($l$04) + 1|0);
  $6 = (($r$05) + 1|0);
  $7 = ($4|0)==(0);
  if ($7) {
   label = 6;
   break;
  } else {
   $$03 = $4;$l$04 = $5;$r$05 = $6;
  }
 }
 if ((label|0) == 5) {
  $8 = $$lcssa&255;
  $9 = $$lcssa10&255;
  $10 = (($8) - ($9))|0;
  $11 = $10;
  return ($11|0);
 }
 else if ((label|0) == 6) {
  $11 = 0;
  return ($11|0);
 }
 return (0)|0;
}
function runPostSets() {
 
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}

  
function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&15](a1|0,a2|0,a3|0)|0;
}


function dynCall_viiiii(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0;
  FUNCTION_TABLE_viiiii[index&15](a1|0,a2|0,a3|0,a4|0,a5|0);
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&15](a1|0);
}


function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&3](a1|0)|0;
}


function dynCall_v(index) {
  index = index|0;
  
  FUNCTION_TABLE_v[index&31]();
}


function dynCall_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0;
  FUNCTION_TABLE_viiiiii[index&15](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0);
}


function dynCall_viiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  FUNCTION_TABLE_viiii[index&15](a1|0,a2|0,a3|0,a4|0);
}

function b0(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0; }
function b1(p0,p1,p2,p3,p4) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0; nullFunc_viiiii(1); }
function b2(p0) { p0 = p0|0; nullFunc_vi(2); }
function b3(p0) { p0 = p0|0; nullFunc_ii(3);return 0; }
function b4() { ; nullFunc_v(4); }
function b5(p0,p1,p2,p3,p4,p5) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_viiiiii(5); }
function b6(p0,p1,p2,p3) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_viiii(6); }

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_iiii = [b0,b0,b0,b0,b0,b0,b0,b0,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,b0,b0,b0,b0,b0,b0,b0];
var FUNCTION_TABLE_viiiii = [b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b1,b1,b1,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b1];
var FUNCTION_TABLE_vi = [b2,__ZNSt9bad_allocD2Ev,__ZNSt9bad_allocD0Ev,b2,__ZN10__cxxabiv116__shim_type_infoD2Ev,__ZN10__cxxabiv117__class_type_infoD0Ev,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,b2,b2,b2,b2,__ZN10__cxxabiv120__si_class_type_infoD0Ev,b2,b2,b2];
var FUNCTION_TABLE_ii = [b3,b3,b3,__ZNKSt9bad_alloc4whatEv];
var FUNCTION_TABLE_v = [b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,__Z7doFramev,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4];
var FUNCTION_TABLE_viiiiii = [b5,b5,b5,b5,b5,b5,b5,b5,b5,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b5,b5,b5,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b5,b5];
var FUNCTION_TABLE_viiii = [b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b6,b6,b6,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi];

  return { _strlen: _strlen, _free: _free, _loadMap: _loadMap, _memset: _memset, _malloc: _malloc, _initRenderer: _initRenderer, _memcpy: _memcpy, __GLOBAL__sub_I_main_cpp: __GLOBAL__sub_I_main_cpp, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_viiiii: dynCall_viiiii, dynCall_vi: dynCall_vi, dynCall_ii: dynCall_ii, dynCall_v: dynCall_v, dynCall_viiiiii: dynCall_viiiiii, dynCall_viiii: dynCall_viiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real__loadMap = asm["_loadMap"]; asm["_loadMap"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__loadMap.apply(null, arguments);
};

var real__initRenderer = asm["_initRenderer"]; asm["_initRenderer"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__initRenderer.apply(null, arguments);
};

var real___GLOBAL__sub_I_main_cpp = asm["__GLOBAL__sub_I_main_cpp"]; asm["__GLOBAL__sub_I_main_cpp"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real___GLOBAL__sub_I_main_cpp.apply(null, arguments);
};

var real_runPostSets = asm["runPostSets"]; asm["runPostSets"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real_runPostSets.apply(null, arguments);
};
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _loadMap = Module["_loadMap"] = asm["_loadMap"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _initRenderer = Module["_initRenderer"] = asm["_initRenderer"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var __GLOBAL__sub_I_main_cpp = Module["__GLOBAL__sub_I_main_cpp"] = asm["__GLOBAL__sub_I_main_cpp"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    function applyMemoryInitializer(data) {
      if (data.byteLength) data = new Uint8Array(data);
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }
    var request = Module['memoryInitializerRequest'];
    if (request) {
      // a network request has already been created, just use that
      if (request.response) {
        setTimeout(function() {
          applyMemoryInitializer(request.response);
        }, 0); // it's already here; but, apply it asynchronously
      } else {
        request.addEventListener('load', function() { // wait for it
          if (request.status !== 200 && request.status !== 0) {
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status);
          }
          if (!request.response || typeof request.response !== 'object' || !request.response.byteLength) {
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest response (expected ArrayBuffer): ' + request.response);
          }
          applyMemoryInitializer(request.response);
        });
      }
    } else {
      // fetch it from the network ourselves
      Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so not exiting (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (Module['onExit']) Module['onExit'](status);

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  abortDecorators.forEach(function(decorator) {
    output = decorator(output, what);
  });
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



var _loadMap = Module.cwrap("loadMap", null, ["number","number"]);

var map_request;

Module.loadMap = function(url) {
	console.log("[vbsp.js] Downloading \""+url+"\"");
	
	if (map_request) {
		console.log("--->");
		map_request.onreadystatechange = null;
		map_request.abort();
	}
	
	map_request = new XMLHttpRequest();
	map_request.responseType = "arraybuffer";
	map_request.onreadystatechange = function () {
		if (this.readyState == 4){
			Module.load_div.style.width=0;
			
			if (this.status != 200) {
				console.log("[vbsp.js] Fatal! Failed to download map!");
				map_request = null;
				return;
			}
			
			var map_data = map_request.response;
			var map_size = map_data.byteLength;
			var map_ptr = Module._malloc(map_size);
			
			new Uint8Array(Module.buffer, map_ptr, map_size).set(new Uint8Array(map_data));
			
			console.log("[vbsp.js] Initializing \""+url+"\"");
			console.group();
			console.time("Completed in");
			_loadMap(map_ptr,map_size);
			console.timeEnd("Completed in");
			console.groupEnd();
			
			Module._free(map_ptr);
			map_request = null;
		}
	};
	map_request.addEventListener("progress",function(e) {
		if (e.lengthComputable) {
			var percent = e.loaded / e.total;
			
			var w = Module.canvas.width;
			var h = Module.canvas.height;
			
			Module.load_div.style.width = w*percent;
			Module.load_div.style.height = h/10;
		}
	});
	map_request.open('GET',url,true);
	map_request.send();
}

var _initRenderer = Module.cwrap("initRenderer", null, ["number","number"]);

Module.initRenderer = function(div) {
	div.style.position = "relative";
	
	var canvas = document.createElement("canvas");
	div.appendChild(canvas);
	canvas.style.cursor = "move";
	Module.canvas = canvas;
	
	var load_div = document.createElement("div");
	div.appendChild(load_div);
	load_div.style.backgroundColor = "lime";
	load_div.style.position = "absolute";
	load_div.style.bottom = 0;
	Module.load_div = load_div;
	
	console.log("[vbsp.js] Starting renderer.");
	_initRenderer(div.offsetWidth,div.offsetHeight);
}

//Module.load = Module.cwrap("load", "number", []);

  return Module;
};
