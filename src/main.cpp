#include <stdio.h>
#include <math.h>
#include <string.h>
#include <vector>

#include <emscripten/emscripten.h>

#define GL_GLEXT_PROTOTYPES
#include <GL/glfw.h>

#include "glm/mat4x4.hpp"
#include "glm/gtc/matrix_transform.hpp"
#include "glm/gtx/rotate_vector.hpp"


// Structures from https://github.com/ValveSoftware/source-sdk-2013/blob/master/sp/src/public/bspfile.h
// See also https://developer.valvesoftware.com/wiki/Source_BSP_File_Format

#define	HEADER_LUMPS 64

#define LUMP_ENTITIES 0
#define LUMP_PLANES 1
#define LUMP_TEXDATA 2
#define LUMP_VERTS 3
#define LUMP_TEXINFO 6
#define LUMP_FACES 7
#define LUMP_EDGES 12
#define LUMP_EDGE_INDEX 13
#define LUMP_MODELS 14
#define LUMP_DISPINFO 26
#define LUMP_DISPVERTS 33
#define LUMP_TEXDATA_STRING_DATA 43
#define LUMP_TEXDATA_STRING_TABLE 44

#define PI_OVER_180 0.01745329251
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

struct vector_t {
	float x;
	float y;
	float z;
	
	vector_t operator+(const vector_t& right) const {
		vector_t result;
		result.y = y + right.y;
		result.x = x + right.x;
		result.z = z + right.z;
		return result;
	}
	
	vector_t operator-(const vector_t& right) const {
		vector_t result;
		result.x = x - right.x;
		result.y = y - right.y;
		result.z = z - right.z;
		return result;
	}
	
	vector_t operator*(const float right) const {
		vector_t result;
		result.x = x * right;
		result.y = y * right;
		result.z = z * right;
		return result;
	}
};

struct plane_t {
	vector_t	normal;
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
	vector_t	reflectivity;
	int	nameStringTableID;
	int	width, height;
	int	view_width, view_height;
};

struct model_t
{
	vector_t	mins, maxs;		// bounding box
	vector_t	origin;			// for sounds or lights
	int	headnode;		// index into node array
	int	firstface, numfaces;	// index into face array
};

struct dispinfo_t
{
	vector_t		startPosition;		// start position used for orientation
	int			DispVertStart;		// Index into LUMP_DISP_VERTS.
	int			DispTriStart;		// Index into LUMP_DISP_TRIS.
	int			power;			// power - indicates size of surface (2^power	1)
	int			minTess;		// minimum tesselation allowed
	float		smoothingAngle;		// lighting smoothing angle
	int			contents;		// surface contents
	unsigned short		MapFace;		// Which map face this displacement comes from.
	int			LightmapAlphaStart;	// Index into ddisplightmapalpha.
	int			LightmapSamplePositionStart;	// Index into LUMP_DISP_LIGHTMAP_SAMPLE_POSITIONS.
	//CDispNeighbor		EdgeNeighbors[4];	// Indexed by NEIGHBOREDGE_ defines.
	//CDispCornerNeighbors	CornerNeighbors[4];	// Indexed by CORNER_ defines.
	char neighbor_data[86];
	unsigned int		AllowedVerts[10];	// active verticies
};

struct dispvert_t {
	vector_t pos;
	float distance;
	float alpha;
};

struct gl_vert_t {
	vector_t pos;
	vector_t normal;
	float r;
	float g;
	float b;
};

GLuint h_vertexbuffer_opaque = 0;
GLuint h_vertexbuffer_trans = 0;
GLuint h_vertexbuffer_sky = 0;
int vert_count_opaque = 0;
int vert_count_trans = 0;
int vert_count_sky = 0;



vector_t findNormal(const vector_t& a,const vector_t& b,const vector_t& c) {
	vector_t u = b - c;
	vector_t v = a - c;
	
	vector_t norm;
	norm.x = u.y*v.z - u.z*v.y;
	norm.y = u.z*v.x - u.x*v.z;
	norm.z = u.x*v.y - u.y*v.x;
	
	float len = sqrt(norm.x*norm.x + norm.y*norm.y + norm.z*norm.z);
	norm.x /= len;
	norm.y /= len;
	norm.z /= len;
	
	return norm;
}

glm::vec3 cam_pos(0,0,0);

float cam_pitch = 0;
float cam_yaw = 0;

bool skybox_active = false;
glm::vec3 skybox_pos;
float skybox_scale;

vector_t* model_offsets = 0;

extern "C" {
	extern int pick_color(char* name);
	extern int parse_ents(char* data);

	void setCam(float x, float y, float z, float pa, float ya) {
		cam_pos.x = x;
		cam_pos.y = y;
		cam_pos.z = z;
		
		cam_pitch = pa*PI_OVER_180;
		cam_yaw = ya *PI_OVER_180;
	}
	
	void setSkybox(float x, float y, float z, float scale) {
		skybox_active = true;
		
		skybox_pos.x = x;
		skybox_pos.y = y;
		skybox_pos.z = z;
		
		skybox_scale = scale;
	}
	
	void setModel(int model_id, float x, float y, float z) {

		model_offsets[model_id].x = x;
		model_offsets[model_id].y = y;
		model_offsets[model_id].z = z;
		
	}
}

extern "C"
int loadMap(bsp_header_t* bsp_file) {
	if (bsp_file->bsp_ident!=1347633750) {
		printf("Not a BSP!\n");
		return 1;
	}
	printf("Format V%i\n",bsp_file->bsp_version);
	
	// Models!
	model_t* models = reinterpret_cast<model_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_MODELS].offset);
	int model_count = bsp_file->lumps[LUMP_MODELS].size / sizeof(model_t);
	
	if (model_offsets != 0)
		delete[] model_offsets;
		
	model_offsets = new vector_t[model_count];
	model_offsets[0].x = 0;
	model_offsets[0].y = 0;
	model_offsets[0].z = 0;
	
	
	// Parse the entities to get model offsets, spawn position, skybox settings...
	skybox_active = false;
	
	char* ent_data = reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_ENTITIES].offset;
	parse_ents(ent_data);
	
	
	// Mesh
	face_t* faces = reinterpret_cast<face_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_FACES].offset);
	int* edge_index = reinterpret_cast<int*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_EDGE_INDEX].offset);
	edge_t* edges = reinterpret_cast<edge_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_EDGES].offset);
	vector_t* verts = reinterpret_cast<vector_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_VERTS].offset);
	
	// Need for normals
	plane_t* planes = reinterpret_cast<plane_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_PLANES].offset);
	
	// Material flags, names
	texture_info_t* texture_info = reinterpret_cast<texture_info_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXINFO].offset);
	texture_data_t* texture_data = reinterpret_cast<texture_data_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXDATA].offset);
	int* texture_string_table = reinterpret_cast<int*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXDATA_STRING_TABLE].offset);
	char* texture_string_data = reinterpret_cast<char*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_TEXDATA_STRING_DATA].offset);
	
	// Displacements!
	dispinfo_t* displacements = reinterpret_cast<dispinfo_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_DISPINFO].offset);
	dispvert_t* disp_verts = reinterpret_cast<dispvert_t*>(reinterpret_cast<char*>(bsp_file)+bsp_file->lumps[LUMP_DISPVERTS].offset);
	
	std::vector<gl_vert_t> mesh_opaque;
	std::vector<gl_vert_t> mesh_trans;
	std::vector<gl_vert_t> mesh_sky;
	
	
	
	for (int i=0; i < model_count; i++) {
		int start_face = models[i].firstface;
		int last_face = models[i].firstface + models[i].numfaces;
		
		for (int j= start_face; j < last_face; j++) {

			bool nodraw = texture_info[faces[j].texinfo].flags & 0x280; // todo need more?
			
			if (nodraw)
				continue;
			
			bool sky = texture_info[faces[j].texinfo].flags & 6;
			bool transparent = texture_info[faces[j].texinfo].flags & 0x18;
			
			std::vector<gl_vert_t>& mesh = transparent ? mesh_trans : (sky ? mesh_sky : mesh_opaque);
			
			
			
			
			
			//texture_data[texture_info[faces[j].texinfo].texdata].nameStringTableID;
			
			char* texture_name = &texture_string_data[texture_string_table[texture_data[texture_info[faces[j].texinfo].texdata].nameStringTableID]];
			
			//printf("ch %s %i\n",texture_name,texture_info[faces[j].texinfo].flags);
			
			float tex_r;
			float tex_g;
			float tex_b;
			
			if (sky) { //7AC3FF
				tex_r = 0.47;
				tex_g = 0.76;
				tex_b = 1;
			} else {
				int color = pick_color(texture_name);
				if (color==-1) // no-draw hinting
					continue;
				tex_r = ((color >> 16) & 255) / 255.0f;;
				tex_g = ((color >> 8) & 255) / 255.0f;
				tex_b = (color & 255) / 255.0f;
			}
			
			gl_vert_t vert;
						
			vert.r=tex_r;
			vert.g=tex_g;
			vert.b=tex_b;
			
			if (faces[j].dispinfo != -1) {
				vector_t low_base = displacements[faces[j].dispinfo].startPosition;
				
				if (faces[j].numedges!=4) {
					printf("Bad displacement!\n");
					return 1;
				}
				
				
				vector_t corner_verts[4];
				int base_i = -1;
				float base_dist = INFINITY;
				for (int k=0;k<4;k++) {
					int edge_i = edge_index[faces[j].firstedge+k];
					int vert_i;
				
					if (edge_i<0)
						vert_i = edges[-edge_i].v[1];
					else
						vert_i = edges[edge_i].v[0];
					
					corner_verts[k] = verts[vert_i];
					
					float this_dist = std::abs(verts[vert_i].x - low_base.x) + std::abs(verts[vert_i].y - low_base.y) + std::abs(verts[vert_i].z - low_base.z);
					
					if (this_dist < base_dist) {
						base_dist = this_dist;
						base_i = k;
					}
				}
				
				if (base_i==-1) {
					printf("Bad base in displacement!\n");
					return 1;
				}
				
				vector_t high_base = corner_verts[ (base_i+3)%4 ];
				vector_t high_ray = corner_verts[ (base_i+2)%4 ] - high_base;
				vector_t low_ray = corner_verts[ (base_i+1)%4 ] - low_base;
				
				int verts_wide = (2<<(displacements[faces[j].dispinfo].power-1)) + 1;
				
				vector_t base_verts[289];
				
				int base_dispvert_index = displacements[faces[j].dispinfo].DispVertStart;
				
				for (int y = 0; y< verts_wide; y++) {
					float fy = y / (verts_wide-(float)1);
					
					vector_t mid_base = low_base + low_ray * fy;
					vector_t mid_ray = high_base + high_ray * fy - mid_base;
					
					for (int x = 0; x< verts_wide; x++) {
						float fx = x / (verts_wide-(float)1);
						int i = x+y*verts_wide;
						
						vector_t offset = disp_verts[base_dispvert_index+i].pos;
						float scale = disp_verts[base_dispvert_index+i].distance;
						
						base_verts[i] = mid_base + mid_ray*fx + offset*scale;
					}
				}
				

				
				
				
				for (int y = 0; y< verts_wide-1; y++) {
					
					for (int x = 0; x< verts_wide-1; x++) {
						
						int i = x+y*verts_wide;
						
						vector_t v1 = base_verts[i];
						vector_t v2 = base_verts[i+1];
						vector_t v3 = base_verts[i+verts_wide];
						vector_t v4 = base_verts[i+verts_wide+1];
						
						if (i%2) {
							vert.normal = findNormal(v1,v3,v2);
							
							vert.pos = v1;
							mesh.push_back(vert);
							
							vert.pos = v3;
							mesh.push_back(vert);
							
							vert.pos = v2;
							mesh.push_back(vert);
							
							vert.normal = findNormal(v2,v3,v4);
							
							vert.pos = v2;
							mesh.push_back(vert);
							
							vert.pos = v3;
							mesh.push_back(vert);
							
							vert.pos = v4;
							mesh.push_back(vert);
						} else {
							vert.normal = findNormal(v1,v3,v4);
							
							vert.pos = v1;
							mesh.push_back(vert);
							
							vert.pos = v3;
							mesh.push_back(vert);
							
							vert.pos = v4;
							mesh.push_back(vert);
							
							vert.normal = findNormal(v1,v4,v2);
							
							vert.pos = v2;
							mesh.push_back(vert);
							
							vert.pos = v1;
							mesh.push_back(vert);
							
							vert.pos = v4;
							mesh.push_back(vert);
						}
					}
				}
				
				
				
				
			} else {
				
				if (sky) {
					vert.normal.x = 0;
					vert.normal.y = 0;
					vert.normal.z = 1;
				} else
					vert.normal = planes[faces[j].planenum].normal;
				
				int triangle_vert = 0;
				vector_t triangle[3];
				for (int v=faces[j].firstedge;v<faces[j].firstedge+faces[j].numedges;v++) {

					int edge_i = edge_index[v]; //should be #1->#2->base (todo account for reverse)
					int vert_i;
				
					if (edge_i<0)
						vert_i = edges[-edge_i].v[1];
					else
						vert_i = edges[edge_i].v[0];
					
					triangle[triangle_vert++] = verts[vert_i] + model_offsets[i];
					
					if (triangle_vert>2) {

						vert.pos=triangle[0];
						mesh.push_back(vert);
						
						vert.pos=triangle[1];
						mesh.push_back(vert);
						
						vert.pos=triangle[2];
						mesh.push_back(vert);
						
						triangle[1] = triangle[2];
						triangle_vert=2;
					}
				}
			}
		}
	}
	
	vert_count_opaque = mesh_opaque.size();
	vert_count_trans = mesh_trans.size();
	vert_count_sky = mesh_sky.size();
	
	if (vert_count_opaque) {
		glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer_opaque);
		glBufferData(GL_ARRAY_BUFFER, vert_count_opaque*sizeof(gl_vert_t), mesh_opaque.data(), GL_STATIC_DRAW);
	}
	
	if (vert_count_trans) {
		glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer_trans);
		glBufferData(GL_ARRAY_BUFFER, vert_count_trans*sizeof(gl_vert_t), mesh_trans.data(), GL_STATIC_DRAW);
	}
	
	if (vert_count_sky) {
		glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer_sky);
		glBufferData(GL_ARRAY_BUFFER, vert_count_sky*sizeof(gl_vert_t), mesh_sky.data(), GL_STATIC_DRAW);
	}
	
	return 0;
}

bool renderer_active = false;

GLuint h_matrix;

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
			
			if (glfwGetKey(340)) {
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
	
	//glClearStencil(0);
	glClearColor(.2,.2,.2,0);
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
	
	double fov = 70;
	
	glm::mat4 matrix = glm::perspective(fov*PI_OVER_180,aspect,1.0,1000000.0);
	
	matrix*= glm::lookAt(cam_pos, cam_pos+fwd,glm::vec3(0,0,1));
	glUniformMatrix4fv(h_matrix,1,GL_FALSE,reinterpret_cast<float*>(&matrix));
	
	int passes = skybox_active ? 2 : 1;

	for (int pass=1;pass<=passes;pass++) {
		if (vert_count_opaque) {
			glDisable(GL_BLEND);
			
			glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer_opaque);
			glVertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, pos)));
			glVertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, normal)));
			glVertexAttribPointer(2,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, r)));
			
			glDrawArrays(GL_TRIANGLES,0,vert_count_opaque);
		}
		
		
		if (vert_count_sky) {
			glDisable(GL_BLEND);
			
			if (pass != passes) {
				glEnable(GL_STENCIL_TEST);

				glStencilFunc(GL_ALWAYS, 1, 0xFF);
				glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
			}
			
			glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer_sky);
			glVertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, pos)));
			glVertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, normal)));
			glVertexAttribPointer(2,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, r)));
			
			glDrawArrays(GL_TRIANGLES,0,vert_count_sky);
			
			if (pass != passes)
				glDisable(GL_STENCIL_TEST);
		}
		
		if (vert_count_trans) {
			glEnable(GL_BLEND);
			
			glBindBuffer(GL_ARRAY_BUFFER, h_vertexbuffer_trans);
			glVertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, pos)));
			glVertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, normal)));
			glVertexAttribPointer(2,3,GL_FLOAT,GL_FALSE,sizeof(gl_vert_t),reinterpret_cast<void*>(offsetof(gl_vert_t, r)));
			
			glDrawArrays(GL_TRIANGLES,0,vert_count_trans);
			
			if (pass != passes) {
				glEnable(GL_STENCIL_TEST);
				
				glStencilFunc(GL_EQUAL, 1, 0xFF);
				glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
				glClear(GL_DEPTH_BUFFER_BIT);
			} else if (pass==2) {
				glDisable(GL_STENCIL_TEST);
			}
		}
		
		if (pass != passes) {
			matrix = glm::scale(matrix, glm::vec3(skybox_scale,skybox_scale,skybox_scale));
			matrix = glm::translate(matrix, -skybox_pos);
			glUniformMatrix4fv(h_matrix,1,GL_FALSE,reinterpret_cast<float*>(&matrix));
		}
	}
	
	glfwSwapBuffers();
}

extern "C"
const char* initRenderer(int w, int h) {
    if (renderer_active) {
		return "Renderer is already running!.";
	}
	
	if (glfwInit() != GL_TRUE) {
		glfwTerminate();
		return "OpenGL failed to init.";
	}
	
	if (glfwOpenWindow(w, h, 8, 8, 8, 8, 16, 8, GLFW_WINDOW) != GL_TRUE) {
		glfwTerminate();
		return "OpenGL failed to open viewport.";
    }
	
	// Turn on things that should be on by default.
	glEnable(GL_DEPTH_TEST);
	
	glEnable(GL_CULL_FACE);
	glFrontFace(GL_CW);
	
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	
	glEnableVertexAttribArray(0);
	glEnableVertexAttribArray(1);
	glEnableVertexAttribArray(2);
	
	// Shaders
	const char* vertex_shader = R"(
	precision mediump float;
	
	uniform mat4 matrix;
	attribute vec4 vPos;
	attribute vec3 vNorm;
	attribute vec4 baseColor;
	varying vec4 color;
    void main()
    {
		float f = max(dot(vNorm,vec3(.8,.9,1)),.0) + max(dot(vNorm,vec3(-.7,-.6,-.5)),.0);
		color = f*baseColor;
    	gl_Position =  matrix*vPos;
    })";

	const char* fragment_shader = R"(
	precision mediump float;
	
	varying vec4 color;
	void main () {
		gl_FragColor = color;
		gl_FragColor.w = 0.5;
	})";
	
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
	
	renderer_active = true;
	
	glGenBuffers(1, &h_vertexbuffer_opaque);
	glGenBuffers(1, &h_vertexbuffer_trans);
	glGenBuffers(1, &h_vertexbuffer_sky);
 
    return 0;
}

extern "C"
int main() {
	printf("ready\n");
	return 0;
}