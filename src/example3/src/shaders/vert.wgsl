struct Vertex {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
}

struct Time {
    time: f32
}

struct Rotation {
    matrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> time_buffer: Time;

@group(0) @binding(1) var<uniform> rotation: Rotation;

@vertex fn vert(@builtin(vertex_index) vert_idx: u32) -> Vertex {
    let current_time: f32 = time_buffer.time / 30;

    // square middle is at 0.0,0.0 -0.5 -> 0.5 both x and y
    var position = array<vec3f,6>(
        vec3f(-0.5, -0.5, 0.0), // a - bottom left
        vec3f(0.5, -0.5, 0.0), // b - bottom right
        vec3f(-0.5, 0.5, 0.0), // d - top left
        vec3f(-0.5, 0.5, 0.0), // d - top left
        vec3f(0.5, -0.5, 0.0), // b - bottom right
        vec3f(0.5, 0.5, 0.0), // c - top right
    );
    var color = array<vec4f,6>(
        vec4f(1.0,0.0,0.0,1.0), // a
        vec4f(0.0,1.0,0.0,1.0), // b
        vec4f(0.0,1.0,0.0,1.0), // d
        vec4f(0.0,1.0,0.0,1.0), // d
        vec4f(0.0,1.0,0.0,1.0), // b
        vec4f(0.0,0.0,1.0,1.0), // c
    );
    var vertex_mapper = array<u32, 6>(
        0,
        1,
        3,
        3,
        1,
        2
    );
    var vertex: Vertex;
    vertex.position = rotation.matrix * vec4f(position[vert_idx],1.0);
    // sin gives is -1 to +1 we need 0 -> 1.... so need to transform
    // sin output to (sin(x)+1)/2
    // then we want 3 phases for the color so 120 degrees apart
    // 120 deg is 2.0944 rad
    // then we want to have an offset for each vertex so they start at different colors
    // 90 deg is 1.5708 rad
    var offset: f32 = f32(vertex_mapper[vert_idx]) * 1.57;
    vertex.color = vec4f((sin(current_time + offset)+1.0)/2.0,(sin(current_time + offset + 2.09)+1.0)/2.0, (sin(current_time + offset + 4.18)+1.0)/2.0,1.0); // color[vert_idx]; //
    return vertex;
}