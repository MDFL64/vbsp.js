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