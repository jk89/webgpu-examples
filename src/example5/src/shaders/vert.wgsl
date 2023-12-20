struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) pos_intep: vec2<f32>
}

struct Time {
    time: f32
}

@group(0) @binding(0) var<uniform> time_buffer: Time;

@vertex fn vert(@builtin(vertex_index) vert_idx: u32) -> Vertex {
    // square middle is at 0.0,0.0 -0.5 -> 0.5 both x and y
    var position = array<vec3<f32>,3>(
        vec3<f32>(0.0, 0.7, 0.0),   // top center
        vec3<f32>(-0.7, -0.7, 0.0), // bottom left
        vec3<f32>(0.7, -0.7, 0.0)   // bottom right
    );
    let current_time: f32 = time_buffer.time / 200.0;
    var offset: f32 = f32(vert_idx) * 2.0944;
    var vertex: Vertex;
    vertex.position = vec4<f32>(position[vert_idx],1.0);
    vertex.color = vec4f((sin(current_time + offset)+1.0)/2.0,(sin(current_time + offset + 2.09)+1.0)/2.0, (sin(current_time + offset + 4.18)+1.0)/2.0,1.0);
    let x = position[vert_idx][0];
    let y = position[vert_idx][1];
    vertex.pos_intep = vec2<f32>(x,y);
    return vertex;
}