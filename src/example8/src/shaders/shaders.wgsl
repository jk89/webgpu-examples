@group(0) @binding(0) var screen: texture_storage_2d<bgra8unorm, write>;
@group(0) @binding(1) var<storage, read_write> camera_matrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read_write> verticies: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read_write> hist_atomic: array<atomic<i32>>;
@group(0) @binding(4) var<storage, read_write> frame_idx: f32;
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

    // seed rng
    seed = hash_u(id.x + hash_u(screen_dimensions.x*id.y*200u)*20u + hash_u(id.x)*250u + hash_u(id.z)*250u + hash_u(u32(frame_idx))*250u  );
    seed = hash_u(seed);


    let verts = array<vec3f,4>(
        vec3<f32>(0.0, 1.0, 0.0),  // Apex
        vec3<f32>(-1.0, -0.5, 0.5),  // Bottom left
        vec3<f32>(1.0, -0.5, 0.5),   // Bottom right
        vec3<f32>(0.0, -0.5, -1.0)   // Bottom back
    );

    // random 3d point
    var p = hash_v3()*2. - 1.;

    for (var i = 0; i < 60; i++) {
        // find a random vertex
        var vertex_id = i32(floor(hash_f() * 4.0 ));

        var help = verts[vertex_id] == verticies[vertex_id]; 

        // Extract vertex from verts or verticies
        var vertex_p = verts[vertex_id];

        // move point p towards the randomly chosen verteex
        var mixed_point = mix(vertex_p, p, 0.5);
        p = mixed_point;

        // transform the point based on the camera matrix
        var transformed_point = camera_matrix * vec4<f32>(mixed_point,1);
        var normalized_point: vec3<f32> = transformed_point.xyz / transformed_point.w;

        // Calculate the pixel index from the point 'mixed_point' in the range [-1, -1] to [1, 1], convert to screen space.
        var pixel_x = i32((normalized_point.x + 1.0) * 0.5 * f32(screen_dimensions.x));
        var pixel_y = i32((normalized_point.y + 1.0) * 0.5 * f32(screen_dimensions.y));

        if (pixel_x < 0 || pixel_x >= i32(screen_dimensions.x) || pixel_y < 0 || pixel_y >= i32(screen_dimensions.y)) {
            continue; // Exit the computation early if outside the screen dimensions
        }

        // Combine 'pixel_x' and 'pixel_y' into a single index
        var idx = pixel_y * i32(screen_dimensions.x) + pixel_x;
        // add this to the histogram
        atomicAdd(&hist_atomic[idx],1);
    }    
}

@compute @workgroup_size(16, 16) fn write_screen(@builtin(global_invocation_id) id: vec3u) {
    let screen_dimensions = (textureDimensions(screen));
    let hist_id = id.x + screen_dimensions.x * id.y;
    let histogram_value = atomicLoad(&hist_atomic[hist_id]);
    let modified_hist = log(f32(histogram_value/100));
    let color = vec4f(f32(modified_hist), f32(modified_hist), f32(modified_hist), f32(modified_hist));
    textureStore(screen, id.xy, color);
}