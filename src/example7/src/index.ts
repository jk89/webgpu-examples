import shaders from "./shaders/shaders.wgsl";
import { mat4 } from "wgpu-matrix";

let frame_idx = 0;

/*

So what do we want for this pipeline?

we want a binding to define 3d points
we need a 4d camera matrix

 */

const main = async () => {

    const fov = 60 * Math.PI / 180;
    const near = 0.1;
    const far = 1000;
    const orbit_radius = 10;

    const canvas = document.querySelector("#webgpu") as HTMLCanvasElement;
    if (!navigator.gpu) return;
    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    const adaptor = await navigator.gpu?.requestAdapter() as GPUAdapter;
    if (!adaptor) return;
    const format = adaptor.features.has('bgra8unorm-storage')
      ? navigator.gpu.getPreferredCanvasFormat()
      : 'rgba8unorm';

    const device = await adaptor.requestDevice({
        requiredFeatures: format === 'bgra8unorm'
        ? ['bgra8unorm-storage']
        : [],
    }) as GPUDevice;   

    context.configure({device, format,  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING});

    const compute_shader_module = device.createShaderModule(
        {code: shaders}
    );

    const compute_pipeline = device.createComputePipeline({
        label: 'checkboard pipeline',
        layout: 'auto',
        compute: {
          module: compute_shader_module,
          entryPoint: 'write_screen',
        },
      });

      const tetrahedron_vertices = [
        // Base triangle
        0.0, 1.0, 0.0,
        0.942809, -0.333333, 0.0,
        -0.471405, -0.333333, -0.816497,
      
        // Side 1
        0.0, 1.0, 0.0,
        -0.471405, -0.333333, -0.816497,
        0.0, -0.333333, 0.816497,
      
        // Side 2
        0.0, 1.0, 0.0,
        0.0, -0.333333, 0.816497,
        0.942809, -0.333333, 0.0,
      
        // Side 3
        0.942809, -0.333333, 0.0,
        -0.471405, -0.333333, -0.816497,
        0.0, -0.333333, 0.816497,
      ];

    function paint() {


        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const aspect = width / height;
        const angle = frame_idx / 100;

        const eye = [
            Math.cos(angle) * orbit_radius, // x
            5, // y Fixed height 
            Math.sin(angle) * orbit_radius, // z
        ];

        const target = [0, 0, 0];
        const up = [0, 1, 0];
        const view = mat4.lookAt(eye, target, up);

        const perspective = mat4.perspective(fov, aspect, near, far);
        const view_projection_matrix = mat4.multiply(perspective, view);

        // Create buffers for projection matrix and vectors list
        const view_projection_buffer = device.createBuffer({
            size: view_projection_matrix.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        const vectors_buffer = device.createBuffer({
            size: tetrahedron_vertices.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        const canvas_texture = context.getCurrentTexture();

        const bind_group_layout = device.createBindGroupLayout({
            label: "compute_group_bind_layout",
            entries: [
                {
                    binding: 0, // Texture binding
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        sampleType: 'float', // Sample type based on your usage
                        viewDimension: '2d', // View dimension based on your texture
                        multisampled: false, // Multisampling flag
                    },
                    // storageTextureFormat: 'rgba8unorm', // Texture format
                },
                /*{
                    binding: 1, // Camera binding
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { 
                        type: 'storage'
                    }
                },
                {
                    binding: 2, // Verts binding
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { 
                        type: 'storage'
                    }
                }*/
            ]  
        });

        const bind_group = device.createBindGroup(
            {
                layout: compute_pipeline.getBindGroupLayout(0),//bind_group_layout,
                entries: [
                    { binding: 0, resource: canvas_texture.createView() },
                    /*{binding: 1, resource: {
                        buffer: view_projection_buffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * 16
                    }},
                    {binding: 2, resource: {
                        buffer: vectors_buffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * 16
                    }}*/
                ],
            }
        );
        // device.queue.writeBuffer(view_projection_buffer, 0, vectors_buffer);

        const command_encoder = device.createCommandEncoder();
        const compute_pass = command_encoder.beginComputePass();
        compute_pass.setPipeline(compute_pipeline);
        compute_pass.setBindGroup(0, bind_group);
        compute_pass.dispatchWorkgroups(canvas_texture.width, canvas_texture.height);
        compute_pass.end();
    
        const commandBuffer = command_encoder.finish();
        device.queue.submit([commandBuffer]);
        //frame_idx++;
        requestAnimationFrame(paint);        
    };
    setInterval(()=>frame_idx++,25);
    requestAnimationFrame(paint);
    
};

main();