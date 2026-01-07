shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;

// --- ADJUSTMENTS ---
// Lowers the overall light. 1.0 is normal, 0.8 is dimmer/cozier.
uniform float brightness : hint_range(0.0, 2.0) = 0.85;

// CRITICAL: Lowers the intense orange of your floor.
uniform float saturation : hint_range(0.0, 2.0) = 0.8; 

// The "Latte" tint. We will force this color more aggressively now.
uniform vec4 tint_color : source_color = vec4(0.95, 0.92, 0.85, 1.0);
uniform float tint_strength : hint_range(0.0, 1.0) = 0.5;

// Flatten the contrast (make darks lighter, brights darker)
uniform float contrast : hint_range(0.0, 1.5) = 0.8;

// Texture grain
uniform float grain_amount : hint_range(0.0, 0.1) = 0.04;
uniform bool animate_grain = true;

float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
    vec2 uv = SCREEN_UV;
    vec3 col = texture(screen_texture, uv).rgb;

    // 1. DIM BRIGHTNESS
    col *= brightness;

    // 2. REDUCE CONTRAST (Flattening)
    // Moves everything towards middle-grey (0.5)
    col = (col - 0.5) * contrast + 0.5;
    
    // 3. DESATURATE & TINT
    // First, calculate greyscale
    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 greyscale_col = vec3(grey);
    
    // Mix current color with greyscale (Desaturate)
    col = mix(greyscale_col, col, saturation);
    
    // Force the "Latte" Tint
    // We mix the tinted greyscale into the result to wash it out
    col = mix(col, greyscale_col * tint_color.rgb, tint_strength);

    // 4. GRAIN
    float noise = random(uv + (animate_grain ? vec2(TIME * 8.0, TIME) : vec2(0.0)));
    col = mix(col, col * (1.0 + (noise - 0.5) * 0.5), grain_amount);
    
    // 5. VIGNETTE (Darker corners for cozy feel)
    float dist = distance(uv, vec2(0.5));
    col *= 1.0 - (dist * 0.4);

    COLOR = vec4(col, 1.0);
}