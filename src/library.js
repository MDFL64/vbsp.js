
mergeInto(LibraryManager.library, {
	
	pick_color: function(name) {
		name = Pointer_stringify(name).toLowerCase();
		
		var match = name.match(/maps\/[^/]*\/(.*)_.*_.*_.*/);
		
		if (match != null) {
			//console.log(name+" -> "+match[1]);
			name = match[1];
		}
		
		if (name == "tools/toolstrigger")
			return -1;
		
		var color = color_table[name];
		
		if (color != null) {
			return color;
		}
		
		console.log(">>> "+name);
		
		return 0xFFFFFF;
		
		/*color = pick_color(name);
		
		color_table[name] = color;
		
		return color;*/
	},
	parse_ents: function(data) {
		data = Pointer_stringify(data);
		
		var cam_placed = false;
		
		kvparse(data,function(ent) {
			if (!cam_placed && ent.classname.substr(0,17) == "info_player_start") {
				var pos = ent.origin.split(" ").map(parseFloat);
				var yaw = parseFloat(ent.angles.split(" ")[1]);
				
				Module.setCam(pos[0],pos[1],pos[2]+64,0,yaw);
				
				cam_placed = true;
			} else if (ent.classname == "sky_camera") {
				var pos = ent.origin.split(" ").map(parseFloat);
				var scale = parseFloat(ent.scale);
				_setSkybox(pos[0],pos[1],pos[2],scale);
			} else if (ent.model != null && ent.model[0]=="*") {
				var model_id = parseInt(ent.model.substr(1));
				var pos;
				if (ent.origin != null)
					pos = ent.origin.split(" ").map(parseFloat);
				else
					pos = [0,0,0];
				
				_setModel(model_id,pos[0],pos[1],pos[2]);
			}
		});
	}
});