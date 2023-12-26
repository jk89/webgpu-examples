@group(0) @binding(0) var screen: texture_storage_2d<bgra8unorm, write>;

@compute @workgroup_size(16, 16) fn write_screen(@builtin(global_invocation_id) id: vec3u) {
    let screen_dimensions = (textureDimensions(screen));
    let color = vec4f(fract(vec2f(id.xy) / 320.0), f32(screen_dimensions.y), 1);
    textureStore(screen, id.xy, color);
}