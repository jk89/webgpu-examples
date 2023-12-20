struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) pos_intep: vec2<f32>
}

// Two possible methods coordinates differ.
//    let length = length(vertex_input.pos_intep) * 10;
//    let length = length(vertex_input.position.xy) / 5000;
//    return vec4<f32>(length, length, length, 1.0);

@fragment fn frag(vertex_input: Vertex) -> @location(0) vec4<f32> {    
    var position = array<vec3<f32>,3>(
        vec3<f32>(0.0, 0.577, 0.0),   // top center
        vec3<f32>(-0.5, -0.289, 0.0), // bottom left
        vec3<f32>(0.5, -0.289, 0.0)   // bottom right
    );

    // we want when length is zero then we want luminosity 1
    // when the length is max then we want luminosity 0
    var min_length = 2000.0;
    for (var i: u32 = 0; i < 4u; i = i + 1u) {
        var len = (length(position[i].xy - vertex_input.pos_intep) * 2.0);
        min_length = min(len,min_length);
    }
    var luminosity = min(1.0 - min_length,1.0);// * 2.7;

    return vertex_input.color * luminosity; //vec4<f32>(luminosity, luminosity, luminosity, 1.0);
}

    