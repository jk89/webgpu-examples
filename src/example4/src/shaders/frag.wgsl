struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) pos_intep: vec2<f32>
}


/*
    let length = length(vertex_input.pos_intep) * 10;
    let length = length(vertex_input.position.xy) / 5000;
    return vec4<f32>(length, length, length, 1.0);
*/

@fragment fn frag(vertex_input: Vertex) -> @location(0) vec4<f32> {    
    var position = array<vec3<f32>,3>(
        vec3<f32>(-0.5, -0.5, 0.0), // a
        vec3<f32>(0.5, -0.5, 0.0), // b
        vec3<f32>(0.5, 0.5, 0.0), // c
    );

    var min_length = 100.0;
    for (var i: u32 = 0; i < 4u; i = i + 1u) {
        var len = (length(position[i].xy - vertex_input.pos_intep) * 1.0);
        min_length = min(len,min_length);
    }

    return vec4<f32>(min_length, min_length, min_length, 1.0);
}