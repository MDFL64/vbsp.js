function kvparse(data,callback) {
	// Time for a retarded state machine!
	
	var i=0;
	var s=0;
	var j=0;
	
	var o={};
	var k="";
	var v="";
	
	while (i<data.length) {
		if (s==0) {
			if (data[i] == "{") {
				s=1;
			}
		}
		else if (s==1) {
			if (data[i] == "\"") {
				s=2;
				j=i+1;
			} else if (data[i] == "}") {
				s=0;
				callback(o);
				o = {};
			}
		}
		else if (s==2) {
			if (data[i] == "\"") {
				s = 3;
				k += data.substring( j, i );
			}
			else if (data[i] == "\\") {
				throw "FAILURE A";	
			}
		}
		else if (s==3) {
			if (data[i] == "\"") {
				s=4;
				j=i+1;
			}
		}
		else if (s==4) {
			if (data[i] == "\"") {
				s = 1;
				v += data.substring( j, i );
				o[k] = v;
				k = "";
				v = "";
			}
			else if (data[i] == "\\") {
				throw "FAILURE B";	
			}
		}
		i++;
	}
}