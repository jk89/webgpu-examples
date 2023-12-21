struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) pos_intep: vec2<f32>
}

struct Time {
    time: f32
}

@group(0) @binding(0) var<uniform> time_buffer: Time;

@fragment fn frag(vertex_input: Vertex) -> @location(0) vec4<f32> {    
    var position = array<vec3<f32>,6>(
        vec3f(-1.0, -1.0, 0.0), // a - bottom left
        vec3f(1.0, -1.0, 0.0), // b - bottom right
        vec3f(-1.0, 1.0, 0.0), // d - top left
        vec3f(-1.0, 1.0, 0.0), // d - top left
        vec3f(1.0, -1.0, 0.0), // b - bottom right
        vec3f(1.0, 1.0, 0.0), // c - top right
    );
    var vertex_mapper = array<u32, 6>(
        0,
        1,
        3,
        3,
        1,
        2
    );
    var min_length = 2000.0;
    for (var i: u32 = 0; i < 6u; i = i + 1u) {
        var len = (length(position[i].xy - vertex_input.pos_intep) * 1.0);
        min_length = min(len,min_length);
    }
    var luminosity = min(min_length,1.0) * 2.0;// + ((cos(time_buffer.time/100)+1.0) / 5.0);
    return vertex_input.color * luminosity;
}

    