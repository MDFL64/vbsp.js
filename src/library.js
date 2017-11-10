
mergeInto(LibraryManager.library, {
	
	pick_color: function(name, x) {
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
			if (Array.isArray(color)) {
				var r0 = color[0] >> 16;
				var g0 = (color[0] >> 8) & 0xFF;
				var b0 = color[0] & 0xFF;
				
				var r1 = color[1] >> 16;
				var g1 = (color[1] >> 8) & 0xFF;
				var b1 = color[1] & 0xFF;
				
				r0 = Math.floor(r0 + (r1 - r0)*x);
				g0 = Math.floor(g0 + (g1 - g0)*x);
				b0 = Math.floor(b0 + (b1 - b0)*x);
				
				color = (r0<<16) | (g0<<8) | b0;	
			}

			return color;
		}
		
		return guess_color(name);
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
			} else if (ent.classname == "light_environment") {
				var color = ent._ambient.split(" ");
				_setAmbient(color[0]/255,color[1]/255,color[2]/255);

				var color = ent._light.split(" ");
				_setLight(color[0]/255,color[1]/255,color[2]/255);

				var yaw = ent.angles.split(" ")[1];
				_setLightAngle(ent.pitch,yaw);
			} else if (ent.classname == "worldspawn") {
				var color = sky_colors[ent.skyname];
				console.log(ent.skyname,color);
				if (color) {
					var r = color >> 16;
					var g = (color >> 8) & 0xFF;
					var b = color & 0xFF;
					_setSkyColor(r/255,g/255,b/255);
				}
				/*var color = color_table["skybox/"+ent.skyname+"up"];
				console.log(color);
				if (color)
					_setSkyColor(color >> 16,(color >> 8) & 0xF,color & 0xF);
				else
				_setSkyColor(.8,.2,.8);*/
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