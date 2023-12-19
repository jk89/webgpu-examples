struct Vertex {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
}

@fragment fn frag(vertex_input: Vertex) -> @location(0) vec4f {
    return vertex_input.color;
}