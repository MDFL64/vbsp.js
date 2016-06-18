

Module.ready = function(f) {
	if (this.calledRun) {
		f();
	} else {
		// Defer until ready!
		this.onRuntimeInitialized = f;
	}
}


var _loadMap = Module.cwrap("loadMap", null, ["number","number"]);

var map_request;

Module.setCam = Module.cwrap("setCam", null, ["number","number","number","number","number"]);

var _setSkybox = Module.cwrap("setSkybox", null, ["number","number","number","number"]);
var _setModel = Module.cwrap("setModel", null, ["number","number","number","number"]);

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

var colors = {
	plaster: 0xe0d4ba,
	plaster_dark: 0x998d73,
	plaster_red: 0x8d6059,
	plaster_blue: 0x6f7172,
	
	grass: 0x454e28,
	mud: 0x35281c,
	sand: 0xCCC495,
	
	brick: 0x7b6255,
	wood: 0x8F765B,
	
	glass: 0x7f969f,
	glass_light: 0xbacdd4,
	
	
	concrete: 0x8f8f89,
	concrete_dark: 0x6a6763,
	water: 0x123d48,
	
	
	white: 0xe0ddd7,
	off_white: 0xccc7bb,
	black: 0x313033,
	
	test: 0x00FF00,
	info: 0x00FFFF
}

color_table = {
	"gm_construct/construct_credits": colors.info,
	"gm_construct/color_room": 0xffffff,
	
	"gm_construct/wall_bottom": colors.plaster_red,
	"gm_construct/wall_top": colors.plaster,
	
	"plaster/plasterwall017c_c17": colors.plaster_red,
	
	"building_template/building_template002a": colors.off_white,
	"building_template/building_template002c": colors.off_white,
	"building_template/building_template002e": colors.off_white,
	"building_template/building_template002h": colors.off_white,
	"building_template/building_template002k": colors.off_white,
	"building_template/building_template002l": colors.off_white,
	"building_template/building_template002m": colors.off_white,
	"building_template/building_template002n": colors.off_white,
	
	"building_template/building_template003a": colors.concrete, // bricks
	"building_template/building_template003d": colors.concrete,
	"building_template/building_template003e": colors.concrete,
	
	
	"building_template/building_template005c": colors.plaster_dark,
	"building_template/building_template005f": colors.plaster_dark,
	"building_template/building_template005g": colors.plaster_dark,
	
	"building_template/building_template006b": colors.black, // dark glass
	
	"building_template/building_template007a": colors.white,
	"building_template/building_template007b": colors.glass_light, // very light windows
	"building_template/building_template007c": colors.glass_light,
	"building_template/building_template007d": colors.white, // very lil dark window
	"building_template/building_template007h": colors.glass_light, // window w dark bit
	"building_template/building_template007i": colors.glass_light, // teal window
	"building_template/building_template007j": colors.glass_light, // big covered window
	"building_template/building_template007l": colors.glass_light, // woodish?
	"building_template/building_template007m": colors.black, // more dark glass
	
	"building_template/building_template010a": colors.white,
	"building_template/building_template010b": colors.black, // DARK window
	"building_template/building_template010c": colors.black, // DARK window
	
	"building_template/building_template010g": colors.glass,
	
	"building_template/building_template012e": colors.plaster_dark,
	"building_template/building_template012i": 0xE3BD64,
	
	"building_template/building_template013a": colors.plaster_dark,
	"building_template/building_template013b": colors.plaster_dark, //tanish
	"building_template/building_template013d": colors.plaster_dark,
	"building_template/building_template013h": colors.off_white, // lil dark window
	"building_template/building_template013j": colors.off_white, // black door
	"building_template/building_template013o": colors.off_white, // fairly normal
	"building_template/building_template013l": colors.plaster_dark,
	"building_template/building_template013m": colors.plaster_dark, // tanish color
	
	"building_template/building_template019f": colors.plaster_dark,
	
	//"building_template/building_template029a": 0xFF00FF, no clue
	
	"storefront_template/storefront_template001a": colors.glass_light,
	"storefront_template/storefront_template001c": colors.glass_light,	
	"storefront_template/storefront_template001g": colors.off_white,
	
	"dev/dev_measuregeneric01b": colors.concrete_dark, // grey squares
	
	"cs_assault/assault_skybox_building01": colors.glass_light,
	"cs_assault/assault_skybox_building02": colors.glass,
	"cs_assault/assault_skybox_building04": colors.glass_light,
	
	"cs_assault/assault_police_tape01": 0xFFFF00,
	"dev/dev_hazzardstripe01a": 0xFFFF00,
	
	"cs_havana/ceiling01": colors.white,
	"de_piranesi/marblefloor01": colors.concrete,
	"de_train/train_glasswindow_01": colors.black,
	
	"concrete/concreteceiling003a": colors.white,
	"concrete/concretefloor026a": colors.concrete_dark,
	"concrete/concretefloor038a": colors.concrete_dark,
	"concrete/concretewall059d": colors.concrete_dark,
	"concrete/concretewall059e": colors.concrete_dark,
	"gm_construct/construct_concrete_ground": colors.concrete_dark,
	
	"props/tarpaperroof002a": colors.concrete_dark,
	
	"tile/tileroof002a": 0x4c474e,
	"tile/tileroof004a": 0x876260,
	
	"tile/tilefloor001a": colors.plaster_dark,
	"tile/tilefloor007b": colors.white,
	"tile/tilefloor011a": colors.white,
	"tile/tilefloor012a": colors.off_white,
	"tile/tilefloor020a": 0x303138,
	
	"tile/tilewall006a": colors.white,
	"tile/tilewall006b": colors.white,
	
	"vehicle/rubbertrainfloor001a": colors.black,
	
	"props/carpetfloor003a": 0x527054,
	"props/carpetfloor004a": 0x8CA381,
	
	
	// fucking train tracks wtf
	"nature/gravelfloor002b": colors.black,
	
	"building_template/roof_template001a": colors.black,
	"plaster/plasterwall022c": colors.black, // dark plaster, not fit for auto
	
	"brick/brickwall017a": colors.off_white,
	"brick/brickwall027a": colors.plaster_dark,
	
	// these are fucking mud
	"nature/sandfloor010a": colors.mud,
	"nature/canal_reeds": colors.mud,
	
	// very dead grass
	"nature/grassfloor003a": colors.sand,
	
	
	"nature/blendrockgravel001a": colors.concrete_dark,
	
	"metal/metalcombine002": 0x2c3239,
	"metal/citadel_metalwall078a": 0x1f2931,
	
	"effects/combine_binocoverlay": 0x80F6FF,
	"effects/com_shield002a": 0x80F6FF,
	
	"metal/metalhull010b": colors.white,
	"metal/metalwall003a": colors.off_white,
	
	"metal/metalwall004a": 0xE3D966,
	"metal/metalwall004c": 0xE3D966,
	"metal/metalwall004e": 0xE3D966,
	
	"metal/metalwall018a_cheap": 0xC4E7F2,
	"metal/metalwall018f_cheap": 0xC4E7F2,
	"metal/metalwall018e_cheap": 0xC4E7F2,
	
	"metal/metalwall021a_cheap": 0x6e534b,
	"metal/metalwall021b_cheap": 0x6e534b,
	"metal/metalwall021d": 0x6e534b,
	"metal/metalwall021d_cheap": 0x6e534b,
	"metal/metalwall021e_cheap": 0x6e534b,
	"metal/metalwall021f_cheap": 0x6e534b,
	
	
	"metal/metalwall070a_cheap": 0xFCFFAD,
	"metal/metalwall070e_cheap": 0xFCFFAD,
	"metal/metalwall070f_cheap": 0xFCFFAD,
	
	
	
	"metal/metalfloor008a": colors.concrete_dark,
	
	
	"tools/toolstrigger": 0xFFFFFFFF,
	"tools/toolsblack": 0,
	
	"shadertest/gooinglass": 0xFF7300,
	
	"building_template/building_template002cz": 0xFFFF00,
	"building_template/building_template003bz": 0xFFFF00,
	"building_template/building_template005bz": 0xFFFF00,
	"building_template/building_template005cz": 0xFFFF00, // dark plaster
	"building_template/building_template006az": 0xFFFF00, // same as below, but white (no windows!)
	"building_template/building_template006bz": 0xFFFF00, // dark windows on big towers
	"building_template/building_template012dz": 0xFFFF00,
	
	
	"building_template/building_template019cz": 0xFFFF00,
	"building_template/building_template019kz": 0xFFFF00,
	"building_template/building_template027cz": 0xFFFF00,
	"building_template/building_template002bz": 0xFFFF00,
	"building_template/building_template003ez": 0xFFFF00,
	"building_template/building_template004bz": 0xFFFF00,
	"building_template/building_template020bz": 0xFFFF00,
	"building_template/building_template001bz": 0xFFFF00,
	"building_template/building_template012fz": 0xFFFF00,
	"building_template/building_template002iz": 0xFFFF00,
	"building_template/building_template017kz": 0xFFFF00,
	"building_template/building_template017cz": 0xFFFF00,
	"building_template/building_template014bz": 0xFFFF00,
	"building_template/building_template019dz": 0xFFFF00,
	"building_template/building_template003nz": 0xFFFF00,
	"building_template/building_template001fz": 0xFFFF00,
	"building_template/courtyard_template003fz": 0xFFFF00,
	"building_template/building_template012hz": 0xFFFF00,
	"building_template/courtyard_template001gz": 0xFFFF00,
	"building_template/courtyard_template001fz": 0xFFFF00,
	"building_template/courtyard_template002gz": 0xFFFF00,
	"building_template/courtyard_template001cz": 0xFFFF00,
	"building_template/courtyard_template005fz": 0xFFFF00,
	"building_template/building_template003hz": 0xFFFF00,
	"building_template/building_template012cz": 0xFFFF00,
	"building_template/building_template012ez": 0xFFFF00,
	"building_template/building_template003dz": 0xFFFF00,
	
	"building_template/nukdoorsbz": 0xFFFF00,
	
	"building_template/courtyard_template003bz": 0xFFFF00,
	
	
	"building_template/building_trainstation_template002bz": 0xFFFF00,
	"building_template/building_trainstation_template002cz": 0xFFFF00,
	
	//"coalmines/blendgroundtowall_coalmines": 0xCC9C68, //TF2
};

function pick_color(name) {
	//console.log(name);
	
	if (name.indexOf("concrete") > -1)
		return colors.concrete;
		
	if (name.indexOf("cement") > -1)
		return colors.concrete;
		
	if (name.indexOf("pavement") > -1)
		return colors.concrete_dark;
		
	if (name.indexOf("plaster") > -1)
		return colors.plaster;
	
	if (name.indexOf("metal") > -1) {
		return 0x24201b; // good 4 now
	}
	
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
		
	if (name.indexOf("gravel") > -1)
		return colors.concrete_dark;
		
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
	
	//if (name.indexOf("building_template") > -1)
	//	return 0xFF00FF;
	
	console.log("> Can't guess color of \""+name+"\".");
	
	return 0xFF00FF;
}

//Module.load = Module.cwrap("load", "number", []);