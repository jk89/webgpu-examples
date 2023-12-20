struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) pos_intep: vec2<f32>
}

@vertex fn vert(@builtin(vertex_index) vert_idx: u32) -> Vertex {
    // square middle is at 0.0,0.0 -0.5 -> 0.5 both x and y
    var position = array<vec3<f32>,3>(
        vec3<f32>(-0.5, -0.5, 0.0), // a
        vec3<f32>(0.5, -0.5, 0.0), // b
        vec3<f32>(0.5, 0.5, 0.0), // c
    );
    var color = array<vec4<f32>,3>(
        vec4<f32>(1.0,0.0,0.0,1.0), // a
        vec4<f32>(0.0,1.0,0.0,1.0), // b
        vec4<f32>(0.0,0.0,1.0,1.0), // c
    );
    var vertex: Vertex;
    vertex.position = vec4<f32>(position[vert_idx],1.0);
    vertex.color = color[vert_idx];
    let x = position[vert_idx][0];
    let y = position[vert_idx][1];
    vertex.pos_intep = vec2<f32>(x,y);
    return vertex;
}