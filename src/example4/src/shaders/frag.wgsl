struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) pos_intep: vec2<f32>
}

@fragment fn frag(vertex_input: Vertex) -> @location(0) vec4<f32> {    
    let length = length(vertex_input.pos_intep);
    return vec4<f32>(length, length, length, 1.0);
}