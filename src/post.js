

var color_table = {};

Module.ready = function(f) {
	var module = this;
	var color_req = new XMLHttpRequest();

	color_req.onreadystatechange = function () {
		if (this.readyState == 4){
			if (this.status != 200) {
				console.log("[vbsp.js] Warning! Failed to download color table! Only simple color guessing will be used.");
			} else {
				color_table = JSON.parse(this.response);
			}

			if (module.calledRun) {
				f();
			} else {
				// Defer until ready!
				module.onRuntimeInitialized = f;
			}
		}
	}
	color_req.open('GET',"colors.json",true);
	color_req.send();
}


var _loadMap = Module.cwrap("loadMap", null, ["number","number"]);

var map_request;

Module.setCam = Module.cwrap("setCam", null, ["number","number","number","number","number"]);

var _setSkybox = Module.cwrap("setSkybox", null, ["number","number","number","number"]);
var _setModel = Module.cwrap("setModel", null, ["number","number","number","number"]);
var _setSkyColor = Module.cwrap("setSkyColor", null, ["number","number","number"]);
var _setAmbient = Module.cwrap("setAmbient", null, ["number","number","number"]);
var _setLight = Module.cwrap("setLight", null, ["number","number","number"]);
var _setLightAngle = Module.cwrap("setLightAngle", null, ["number","number"]);

var load_div;

function setLoadPercent(x,text,color) {
	var w = Module.canvas.width;
	var h = Module.canvas.height;
	
	load_div.style.width = w*x;
	load_div.style.height = h/10;
	
	load_div.style.fontSize = h/10 + "px";
	load_div.textContent = text;
	
	load_div.style.backgroundColor = color;
}

Module.loadMap = function(url) {
	console.log("[vbsp.js] Downloading \""+url+"\"...");
	
	if (map_request) {
		map_request.onreadystatechange = null;
		map_request.abort();
	}
	
	map_request = new XMLHttpRequest();
	map_request.responseType = "arraybuffer";
	map_request.onreadystatechange = function () {
		if (this.readyState == 4){
			
			if (this.status != 200) {
				console.log("[vbsp.js] Fatal! Failed to download map!");
				map_request = null;
				setLoadPercent(1,"Download failed!","red");
				return;
			}
			
			setLoadPercent(1,"Initializing...","orange");
			
			setTimeout(function() {
				
				var map_data = map_request.response;
				var map_size = map_data.byteLength;
				var map_ptr = Module._malloc(map_size);
				
				new Uint8Array(Module.buffer, map_ptr, map_size).set(new Uint8Array(map_data));
				
				console.group("[vbsp.js] Initializing \""+url+"\"...");
				console.time("Completed in");
				_loadMap(map_ptr,map_size); // note that this always returns 1 atm, there is no indication of failure!
				console.timeEnd("Completed in");
				console.groupEnd();
				
				Module._free(map_ptr);
				map_request = null;
				setLoadPercent(0);
			});
		}
	};
	map_request.addEventListener("progress",function(e) {
		if (e.lengthComputable) {
			var percent = e.loaded / e.total;
			if (percent!=1)
				setLoadPercent(percent,"Downloading...","yellow");
		}
	});
	map_request.open('GET',url,true);
	map_request.send();
}

var _initRenderer = Module.cwrap("initRenderer", null, ["number","number"]);

Module.initRenderer = function(div) {
	
	div.style.position = "relative";
	
	Module.canvas = document.createElement("canvas");
	div.appendChild(Module.canvas);
	Module.canvas.style.cursor = "move";
	
	load_div = document.createElement("div");
	div.appendChild(load_div);
	load_div.style.position = "absolute";
	load_div.style.bottom = 0;
	
	console.log("[vbsp.js] Starting renderer.");
	_initRenderer(div.offsetWidth,div.offsetHeight);
	
	setLoadPercent(1,"Ready!","lime");

}

function guess_color(name) {

	/*if (name.indexOf("concrete") > -1)
		return colors.concrete;
		
	if (name.indexOf("cement") > -1)
		return colors.concrete;
		
	if (name.indexOf("pavement") > -1)
		return colors.concrete_dark;
		
	if (name.indexOf("plaster") > -1)
		return colors.plaster;
	
	if (name.indexOf("metal") > -1)
		return 0x24201b;
	
	if (name.indexOf("brick") > -1)
		return colors.brick;
		
	if (name.indexOf("wood") > -1)
		return colors.wood;
		
	if (name.indexOf("plastic") > -1)
		return colors.white;
	
	if (name.indexOf("glass") > -1 || name.indexOf("window") > -1)
		return colors.glass;
		
	if (name.indexOf("mud") > -1)
		return colors.mud;
		
	if (name.indexOf("sand") > -1)
		return colors.sand;
		
	if (name.indexOf("dirt") > -1)
		return colors.mud;
		
		
		if (name.indexOf("grass") > -1)
		return colors.grass;
		
		if (name.indexOf("stone") > -1)
		return colors.concrete;
		
		if (name.indexOf("water") > -1)
		return colors.water;
		
		if (name.indexOf("slime") > -1)
		return 0x808000;
		
		if (name.indexOf("button") > -1)
		return 0xFF0000;
		
		if (name.indexOf("sign") > -1)
		return 0x008002;
		
		/*if (name.indexOf("red") > -1)
		return 0xEB5B5B;
		
		if (name.indexOf("blue") > -1)
		return 0x5B92EB;*/
	if (name.indexOf("gravel") > -1)
		return 5788488;
		
	if (name.indexOf("black") > -1)
		return 0;
	
	//console.log(">>> "+name);

	return 0xFFFFFF;
}

//Module.load = Module.cwrap("load", "number", []);