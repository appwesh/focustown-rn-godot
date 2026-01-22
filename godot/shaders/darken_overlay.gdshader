shader_type spatial;
render_mode blend_mul, unshaded, cull_disabled;

uniform vec4 darken_color : source_color = vec4(0.6, 0.6, 0.6, 1.0);

void fragment() {
	ALBEDO = darken_color.rgb;
	ALPHA = 1.0;
}
