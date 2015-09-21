#include <stdio.h>
#include <math.h>
#include <string.h>

#include <emscripten/emscripten.h>

#define GL_GLEXT_PROTOTYPES
#include <GL/glfw.h>

#include "glm/mat4x4.hpp"
#include "glm/gtc/matrix_transform.hpp"
#include "glm/gtx/rotate_vector.hpp"


// Structures from https://github.com/ValveSoftware/source-sdk-2013/blob/master/sp/src/public/bspfile.h
// See also https://developer.valvesoftware.com/wiki/Source_BSP_File_Format

#define	HEADER_LUMPS 64

#define LUMP_PLANES 1
#define LUMP_TEXDATA 2
#define LUMP_VERTS 3
#define LUMP_TEXINFO 6
#define LUMP_FACES 7
#define LUMP_EDGES 12
#define LUMP_EDGE_LIST 13
#define LUMP_TEXDATA_STRING_DATA 43
#define LUMP_TEXDATA_STRING_TABLE 44


#define PI_OVER_360 0.00872664625
#define CAM_MOVE_SPEED 10.0f
#define CAM_FAST_SPEED 50.0f
#define CAM_ROT_SPEED 3

struct header_lump_t {
	int		offset;
	int		size;
	int		version;
	int		_unused;
};

struct bsp_header_t {
	int				bsp_ident;
	int				bsp_version;
	header_lump_t	lumps[HEADER_LUMPS];
	int				map_version;
};

struct face_t {
	unsigned short	planenum;		// the plane number
	char			side;			// faces opposite to the node's plane direction
	char			onNode;			// 1 of on node, 0 if in leaf
	int				firstedge;		// index into surfedges
	short			numedges;		// number of surfedges
	short			texinfo;		// texture info
	short			dispinfo;		// displacement info
	short			surfaceFogVolumeID;	// ?
	char			styles[4];		// switchable lighting info
	int				lightofs;		// offset into lightmap lump
	float			area;			// face area in units^2
	int				LightmapTextureMinsInLuxels[2];	// texture lighting info
	int				LightmapTextureSizeInLuxels[2];	// texture lighting info
	int				origFace;		// original face this was split from
	unsigned short	numPrims;		// primitives
	unsigned short	firstPrimID;
	unsigned int	smoothingGroups;	// lightmap smoothing group
};

struct edge_t {
	unsigned short	v[2];
};

struct vert_t {
	float x;
	float y;
	float z;
};

struct plane_t {
	vert_t	normal;
	float	dist;
	int		type;
};

struct texture_info_t
{
	float	textureVecs[2][4];
	float	lightmapVecs[2][4];
	int	flags;
	int	texdata;
};

struct texture_data_t
{
	vert_t	reflectivity;
	int	nameStringTableID;
	int	width, height;
	int	view_width, view_height;
};

struct gl_vert_t {
	vert_t pos;
	vert_t normal;
	float r;
	float g;
	float b;
};

void load_verts(void* verts,int size);
//void load_indexs(void* indexs,int size);

int vert_count;
//int index_count;

#define FACES_TO_ADD face_count
//10000

glm::vec3 cam_pos(0,0,0);

float cam_pitch = 0;
float cam_yaw = 0;

extern "C"
int loadMap(bsp_header_t* bsp_file) {
	if (bsp_file->bsp_ident!=1347633750) {
		// Fail, not a BSP.
		return 1;
	}
	printf("Format V%i\n",bsp_file->bsp_version);
	
	
	//vert_count = bsp_file->lumps[LUMP_VERTS].size/12;
	
	//load_verts(verts,vert_count*12);
	
	int face_count = bsp_file->lumps[LUMP_FACES].size/sizeof(face_t);
	face_t* faces = reinterpret_cast<face_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_FACES].offset);
	
	int* edge_list = reinterpret_cast<int*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_EDGE_LIST].offset);
	
	edge_t* edges = reinterpret_cast<edge_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_EDGES].offset);
	
	vert_t* verts = reinterpret_cast<vert_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_VERTS].offset);
	
	plane_t* planes = reinterpret_cast<plane_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_PLANES].offset);
	
	texture_info_t* texture_info = reinterpret_cast<texture_info_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXINFO].offset);
	
	texture_data_t* texture_data = reinterpret_cast<texture_data_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXDATA].offset);
	
	int* texture_string_table = reinterpret_cast<int*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXDATA_STRING_TABLE].offset);
	
	char* texture_string_data = reinterpret_cast<char*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXDATA_STRING_DATA].offset);
	
	printf("Face Count: %i\n",face_count);
	
	vert_count=0;
	
	for (int i=0;i<FACES_TO_ADD;i++) {
		vert_count+=(faces[i].numedges-2)*3;
	}
	
	gl_vert_t* mesh = new gl_vert_t[vert_count];
	
	int n=0;
	
	for (int i=0;i<FACES_TO_ADD;i++) {
		bool sky = texture_info[faces[i].texinfo].flags & 6;
		
		//texture_data[texture_info[faces[i].texinfo].texdata].nameStringTableID;
		
		char* texture_name = &texture_string_data[texture_string_table[texture_data[texture_info[faces[i].texinfo].texdata].nameStringTableID]];
		
		//lowercase - http://stackoverflow.com/a/2661917
		// (dont worry that we're writing to the bsp data) -- TODO do this all in one go?
		for(char *p = texture_name;*p;++p) *p=*p>0x40&&*p<0x5b?*p|0x60:*p;
		
		float tex_r = 1;
		float tex_g = 1;
		float tex_b = 1;
		
		bool invis = false;
		
		if (sky) {
			tex_r = .5;
			tex_g = .8;
			tex_b = 1;
		} else if (strstr(texture_name,"metal")) { //this is by far the most common, also hardest to guess color :(
			tex_r = .4;
			tex_g = .4;
			tex_b = .4;
		} else if (strstr(texture_name,"cement") || strstr(texture_name,"concrete")) {
			tex_r = .6;
			tex_g = .6;
			tex_b = .6;
		} else if (strstr(texture_name,"stone")) {
			tex_r = .8;
			tex_g = .6;
			tex_b = .4;
		} else if (strstr(texture_name,"brick")) {
			tex_r = .6;
			tex_g = .1;
			tex_b = .1;
		} else if (strstr(texture_name,"carpet") || strstr(texture_name,"plaster") || strstr(texture_name,"ceiling")) {
			tex_r = 1;
			tex_g = .9;
			tex_b = .9;
		} else if (strstr(texture_name,"wood") || strstr(texture_name,"mud")) {
			tex_r = .5;
			tex_g = .4;
			tex_b = .3;
		} else if (strstr(texture_name,"grass")) {
			tex_r = .2;
			tex_g = .6;
			tex_b = .2;
		} else if (strstr(texture_name,"gravel")) {
			tex_r = .6;
			tex_g = .5;
			tex_b = .6;
		} else if (strstr(texture_name,"glass") || strstr(texture_name,"water")) {
			tex_r = .5;
			tex_g = .6;
			tex_b = .7;
		} else if (strstr(texture_name,"tile")) {
			tex_r = 0;
			tex_g = .5;
			tex_b = .5;
		} else if (strstr(texture_name,"template")) {
			tex_r = 1;
			tex_g = 1;
			tex_b = 0;
		} else if (strstr(texture_name,"black")) {
			tex_r = 0;
			tex_g = 0;
			tex_b = 0;
		} else if (strstr(texture_name,"tool")) {
			invis=true;
		} else { //dbg
			//printf("Unknown texture: %s\n",texture_name);
		}
		
		vert_t normal;

		if (sky) {
			normal.x = 0;
			normal.y = 0;
			normal.z = 1;
		} else
			normal = planes[faces[i].planenum].normal;
		
		int vi = 0;
		vert_t triangle[3];
		for (int v=faces[i].firstedge;v<faces[i].firstedge+faces[i].numedges;v++) {
			int e = edge_list[v]; //should be #1->#2->base (todo account for reverse)
			int vnum;
		
			if (e<0)
				vnum = edges[-e].v[1];
			else
				vnum = edges[e].v[0];
			
			if (invis) {
				triangle[vi].x=0;
				triangle[vi].y=0;
				triangle[vi].z=0;
			} else
				triangle[vi++] = verts[vnum];
			
			if (vi>2) {
				mesh[n].pos=triangle[0];
				mesh[n].normal=normal;
				mesh[n].r=tex_r;
				mesh[n].g=tex_g;
				mesh[n++].b=tex_b;
				
				mesh[n].pos=triangle[1];
				mesh[n].normal=normal;
				mesh[n].r=tex_r;
				mesh[n].g=tex_g;
				mesh[n++].b=tex_b;
				
				mesh[n].pos=triangle[2];
				mesh[n].normal=normal;
				mesh[n].r=tex_r;
				mesh[n].g=tex_g;
				mesh[n++].b=tex_b;
				
				triangle[1] = triangle[2];
				vi=2;
			}
		}
		
		//reset cam pos
		cam_pos = glm::vec3(0,0,0);

		cam_pitch = 0;
		cam_yaw = 0;
	}
	
	printf("Vert Count: %i\n",vert_count);
	
	load_verts(mesh,vert_count*sizeof(gl_vert_t));
	
	delete[] mesh;
	
	return 1;
}

int renderer_on = 0;

GLuint h_vertexbuffer = 0;
GLuint h_matrix;

void load_verts(void* verts,int size) {
	glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer);
	glBufferData(GL_ARRAY_BUFFER, size, verts, GL_STATIC_DRAW);
}

bool was_clicked = false;
int old_cx = 0;
int old_cy = 0;

void doFrame() {
	int w, h;
	glfwGetWindowSize(&w, &h);
	h = h > 0 ? h : 1;
	glViewport(0, 0, w, h);
	
	double aspect = w/static_cast<double>(h);
	
	glm::vec3 fwd = glm::rotateZ(glm::rotateY(glm::vec3(1,0,0),cam_pitch),cam_yaw);
	glm::vec3 left = glm::rotateZ(glm::vec3(0,1,0),cam_yaw);
	
	if (glfwGetMouseButton(0)) {
		int cx,cy;
		glfwGetMousePos(&cx,&cy);
		
		if (was_clicked) {
			double dx = (cx-old_cx) / static_cast<double>(w);
			double dy = (cy-old_cy) / static_cast<double>(h);
			
			cam_yaw -= dx*CAM_ROT_SPEED*aspect;
			cam_pitch += dy*CAM_ROT_SPEED;
			
			if (cam_pitch<-1.57) cam_pitch = -1.57;
			if (cam_pitch>1.57) cam_pitch = 1.57;
			
			float speed = CAM_MOVE_SPEED;
			
			if (glfwGetKey('F')) {
				speed = CAM_FAST_SPEED;
			}
			
			if (glfwGetKey('W')) {
				cam_pos+=fwd*speed;
			} else if (glfwGetKey('S')) {
				cam_pos-=fwd*speed;
			}
			
			if (glfwGetKey('A')) {
				cam_pos+=left*speed;
			} else if (glfwGetKey('D')) {
				cam_pos-=left*speed;
			}
		} else {
			was_clicked = true;
		}
		
		old_cx = cx;
		old_cy = cy;
	} else if (was_clicked) {
		was_clicked=false;
	}
	
	glClearColor(0,0,0,0);
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
	
	if (h_vertexbuffer) {
		double fov = 90;
		
		glm::mat4 matrix = glm::perspective(fov*PI_OVER_360,aspect,1.0,40000.0);
		
		matrix*= glm::lookAt(cam_pos, cam_pos+fwd,glm::vec3(0,0,1));
		glUniformMatrix4fv(h_matrix,1,GL_FALSE,reinterpret_cast<float*>(&matrix));
		
		glEnableVertexAttribArray(0);
		glEnableVertexAttribArray(1);
		glEnableVertexAttribArray(2);
		
		glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer);
		glVertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, pos)));
		glVertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, normal)));
		glVertexAttribPointer(2,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, r)));
		
		glDrawArrays(GL_TRIANGLES,0,vert_count);
		
		glDisableVertexAttribArray(0);
		glDisableVertexAttribArray(1);
		glDisableVertexAttribArray(2);
	}
	
	glfwSwapBuffers();
}

extern "C"
const char* initRenderer(int w, int h) {
    if (renderer_on) {
		return "Renderer is already running!.";
	}
	
	if (glfwInit() != GL_TRUE) {
		glfwTerminate();
		return "OpenGL failed to init.";
	}
	
	if (glfwOpenWindow(w, h, 8, 8, 8, 8, 16, 0, GLFW_WINDOW) != GL_TRUE) {
		glfwTerminate();
		return "OpenGL failed to open viewport.";
    }
	
	// Turn on things that should be on by default.
	glEnable(GL_DEPTH_TEST);
	
	glEnable(GL_CULL_FACE);
	glFrontFace(GL_CW);
	
	// Shaders
	const char* vertex_shader =
	"precision mediump float;"
	
	"uniform mat4 matrix;"
	"attribute vec4 vPos;"
	"attribute vec3 vNorm;"
	"attribute vec4 baseColor;"
	"varying vec4 color;"
    "void main()"
    "{"
	"	float f = max(dot(vNorm,vec3(.8,.9,1)),.0) + max(dot(vNorm,vec3(-.7,-.6,-.5)),.0);"
	"	color = f*baseColor;"
    "	gl_Position =  matrix*vPos;"
    "}";
	
	const char* fragment_shader =
	"precision mediump float;"
	
	"varying vec4 color;"
	"void main () {"
	"	gl_FragColor = color;"
	"}";
	
	GLuint vs = glCreateShader(GL_VERTEX_SHADER);
	glShaderSource(vs, 1, &vertex_shader, NULL);
	glCompileShader(vs);
	
	GLuint fs = glCreateShader (GL_FRAGMENT_SHADER);
	glShaderSource(fs, 1, &fragment_shader, NULL);
	glCompileShader(fs);
	
	GLuint prog = glCreateProgram();
	glAttachShader(prog, fs);
	glAttachShader(prog, vs);
	glLinkProgram(prog);
	glUseProgram(prog);
	
	h_matrix = glGetUniformLocation(prog, "matrix");
	
	// Start Loop
	emscripten_set_main_loop(doFrame,0,0);
	
	glGenBuffers(1, &h_vertexbuffer);
	
	renderer_on = 1;
 
    return 0;
}