shader_type spatial;

// Mobile-optimized water shader
// Removed expensive DEPTH_TEXTURE sampling - uses wave height for depth approximation instead

uniform vec3 shallow_color : source_color = vec3(0.22, 0.66, 1.0);
uniform vec3 deep_color : source_color = vec3(0.0, 0.25, 0.45);

uniform float foam_amount : hint_range(0.0, 2.0) = 0.2;
uniform vec3 foam_color : source_color = vec3(1);

uniform float roughness : hint_range(0.0, 1.0) = 0.05;
uniform float water_alpha : hint_range(0.0, 1.0) = 0.85;

uniform sampler2D wave_texture;
uniform float wave_scale = 4.0;
uniform float height_scale = 0.15;
varying float wave_height;
varying vec3 uv_world_pos;

uniform sampler2D normal1;
uniform vec2 wave_dir1 = vec2(1.0, 0.0);
uniform sampler2D normal2;
uniform vec2 wave_dir2 = vec2(0.0, 1.0);
uniform float wave_speed : hint_range(0.0, 0.2) = 0.015;

vec3 screen(vec3 base, vec3 blend){
	return 1.0 - (1.0 - base) * (1.0 - blend);
}

void vertex() {
	// Vertex displacement for waves
	uv_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wave_height = texture(wave_texture, uv_world_pos.xz / wave_scale + TIME * wave_speed).r;
	VERTEX.y += wave_height * height_scale;
}

void fragment()
{
	// Use wave height as depth approximation (cheap alternative to depth texture)
	// Higher waves = shallower appearance, lower waves = deeper appearance
	float depth_approx = 1.0 - wave_height;
	
	// Color blend based on wave height (simulates depth variation)
	vec3 color_out = mix(shallow_color, deep_color, depth_approx * 0.6);
	
	// Foam on wave peaks (replaces depth-based foam)
	float foam_blend = smoothstep(0.5, 0.8, wave_height) * foam_amount;
	vec3 foam = foam_blend * foam_color;
	color_out = screen(color_out, foam);
	
	// Normal maps for surface detail (keep these - they're cheap and add a lot)
	vec2 normal_offset1 = (TIME * wave_dir1) * wave_speed;
	vec2 normal_offset2 = (TIME * wave_dir2) * wave_speed;
	vec3 normal_blend = mix(
		texture(normal1, uv_world_pos.xz / wave_scale + normal_offset1),
		texture(normal2, uv_world_pos.xz / wave_scale + normal_offset2),
		0.5
	).rgb;
	
	ALBEDO = color_out;
	ALPHA = water_alpha;
	ROUGHNESS = roughness;
	NORMAL_MAP = normal_blend;
}
