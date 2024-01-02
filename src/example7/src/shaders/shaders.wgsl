@group(0) @binding(0) var screen: texture_storage_2d<bgra8unorm, write>;

@group(0) @binding(1) var<storage, read_write> camera_matrix: mat4x4<f32>;

@group(0) @binding(3) var<storage, read_write> hist_atomic: array<atomic<i32>>;

@group(0) @binding(4) var<storage, read_write> frame_idx: f32;



@compute @workgroup_size(16, 16) fn write_screen(@builtin(global_invocation_id) id: vec3u) {
    let screen_dimensions = (textureDimensions(screen));
    let hist_id = id.x + screen_dimensions.x * id.y;
    let histogram_value = atomicLoad(&hist_atomic[hist_id]);
    let color = vec4f(f32(histogram_value), f32(histogram_value), f32(histogram_value), f32(histogram_value));
    //vec4f(fract(vec2f(id.xy) / 320.0), f32(screen_dimensions.y), 1);
    textureStore(screen, id.xy, color);
}



var<private> seed: u32;

fn hash_u(_a: u32) -> u32{ var a = _a; a ^= a >> 16;a *= 0x7feb352du;a ^= a >> 15;a *= 0x846ca68bu;a ^= a >> 16;return a; }
fn hash_f() -> f32{ var s = hash_u(seed); seed = s;return ( f32( s ) / f32( 0xffffffffu ) ); }
fn hash_v2() -> vec2<f32>{ 
    var h1: f32 = f32(hash_f());
    var h2: f32 = f32(hash_f());
    return vec2<f32>(h1, h2); 
}
fn hash_v3() -> vec3<f32>{ 
    var h1: f32 = f32(hash_f());
    var h2: f32 = f32(hash_f());
    var h3: f32 = f32(hash_f());
    return vec3<f32>(h1, h2, h3); 
}
fn hash_v4() -> vec4<f32>{ 
    var h1: f32 = f32(hash_f());
    var h2: f32 = f32(hash_f());
    var h3: f32 = f32(hash_f());
    var h4: f32 = f32(hash_f());
    return vec4<f32>(h1, h2, h3, h4); 
}

@compute @workgroup_size(256, 1,1)
fn splat(@builtin(global_invocation_id) id: vec3<u32>) {
    let screen_dimensions = vec2<u32>(textureDimensions(screen));
    if (id.x >= screen_dimensions.x || id.y >= screen_dimensions.y) { return; }

    var proj_matrix_element = camera_matrix[0][0] + camera_matrix[0][1] + camera_matrix[0][2] + camera_matrix[0][3] +
    camera_matrix[1][0] + camera_matrix[1][1] + camera_matrix[1][2] + camera_matrix[1][3] +
    camera_matrix[2][0] + camera_matrix[2][1] + camera_matrix[2][2] + camera_matrix[2][3] +
    camera_matrix[1][0] + camera_matrix[1][1] + camera_matrix[2][2] + camera_matrix[3][3];

    // + hash_u(u32(proj_matrix_element))

    // get a random point.
    seed = hash_u(id.x + hash_u(screen_dimensions.x*id.y*200u)*20u + hash_u(id.x)*250u + hash_u(id.z)*250u + hash_u(u32(frame_idx))*250u  );
    seed = hash_u(seed);
    var p = hash_v3()*2. - 1.;
    var transformed_point = camera_matrix * vec4<f32>(p,1);
    var normalized_point: vec3<f32> = transformed_point.xyz / transformed_point.w;

    

    // Calculate the pixel index from the point 'p' in the range [-1, -1] to [1, 1]
    var pixelX = i32((normalized_point.x + 1.0) * 0.5 * f32(screen_dimensions.x));
    var pixelY = i32((normalized_point.y + 1.0) * 0.5 * f32(screen_dimensions.y));

    if (pixelX < 0 || pixelX >= i32(screen_dimensions.x) || pixelY < 0 || pixelY >= i32(screen_dimensions.y) || normalized_point.z < 0) {
        return; // Exit the computation early if outside the screen dimensions
    }

    // Combine 'pixelX' and 'pixelY' into a single index
    var idx = pixelY * i32(screen_dimensions.x) + pixelX;
    atomicAdd(&hist_atomic[idx],1);
}