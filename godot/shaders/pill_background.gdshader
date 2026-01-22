shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled;

uniform vec4 bg_color : source_color = vec4(0.98, 0.96, 0.93, 1.0);
uniform vec4 border_color : source_color = vec4(0.85, 0.82, 0.78, 1.0);
uniform float border_width : hint_range(0.0, 0.1) = 0.03;
uniform float corner_radius : hint_range(0.0, 0.5) = 0.4;

float rounded_box_sdf(vec2 p, vec2 size, float radius) {
    vec2 q = abs(p) - size + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void vertex() {
    // Billboard - make quad face camera
    MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
        vec4(normalize(cross(vec3(0.0, 1.0, 0.0), INV_VIEW_MATRIX[2].xyz)), 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(normalize(cross(INV_VIEW_MATRIX[0].xyz, vec3(0.0, 1.0, 0.0))), 0.0),
        MODEL_MATRIX[3]
    );
    MODELVIEW_MATRIX = MODELVIEW_MATRIX * mat4(
        vec4(length(MODEL_MATRIX[0].xyz), 0.0, 0.0, 0.0),
        vec4(0.0, length(MODEL_MATRIX[1].xyz), 0.0, 0.0),
        vec4(0.0, 0.0, length(MODEL_MATRIX[2].xyz), 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

void fragment() {
    vec2 uv = UV * 2.0 - 1.0; // Center UV to -1 to 1
    
    // Aspect ratio adjustment (pill is wider than tall)
    vec2 size = vec2(1.0, 1.0);
    
    // Calculate signed distance
    float dist = rounded_box_sdf(uv, size - corner_radius, corner_radius);
    
    // Anti-aliased edges
    float aa = fwidth(dist) * 1.5;
    
    // Background fill
    float fill = 1.0 - smoothstep(-aa, aa, dist);
    
    // Border
    float border = 1.0 - smoothstep(-aa, aa, abs(dist) - border_width);
    
    // Combine colors
    vec4 color = mix(bg_color, border_color, border * step(dist, 0.0));
    
    ALBEDO = color.rgb;
    ALPHA = fill * color.a;
}
