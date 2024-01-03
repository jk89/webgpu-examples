import shaders from "./shaders/shaders.wgsl";
import { mat4 } from "wgpu-matrix";

// forked from https://compute.toys/view/282

let frame_idx = 0;
let frame_count = 0;
let last_timestamp = 0;

/*

So what do we want for this pipeline?

we want a binding to define 3d points
we need a 4d camera matrix

 */

const main = async () => {

    const fov = 60 * Math.PI / 180;
    const near = 0.1;
    const far = 1000;
    const orbit_radius = 1;

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

    const bind_group_layout = device.createBindGroupLayout({
        label: "compute_group_bind_layout",
        entries: [
            {
                binding: 0, // Texture binding
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    viewDimension: '2d', // View dimension based on your texture
                    format: "bgra8unorm",
                    access: "write-only"
                },
            },
            {
                binding: 1, // Camera binding
                visibility: GPUShaderStage.COMPUTE,
                buffer: { 
                    type: 'read-only-storage'
                }
            },
            {
                binding: 2, // Verts binding
                visibility: GPUShaderStage.COMPUTE,
                buffer: { 
                    type: 'read-only-storage'
                }
            },
            {
                binding: 3, // Hist binding
                visibility: GPUShaderStage.COMPUTE,
                buffer: { 
                    type: 'storage'
                }
            },
            {
                binding: 4, // Frame index binding
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            },
            
        ]  
    });
    

    const pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [bind_group_layout]
    });

    const compute_splat_pipeline = device.createComputePipeline({
        label: 'splat pipeline',
        layout: pipeline_layout,
        compute: {
          module: compute_shader_module,
          entryPoint: 'splat',
        },
      });

    const compute_screen_pipeline = device.createComputePipeline({
        label: 'write screen pipeline',
        layout: pipeline_layout,
        compute: {
          module: compute_shader_module,
          entryPoint: 'write_screen',
        },
      });

      const vertices = [
        0.0, 1.0, 0.0,  // Apex
        -1.0, -0.5, 0.5,  // Bottom left
        1.0, -0.5, 0.5,   // Bottom right
        0.0, -0.5, -1.0   // Bottom back
      ];

    function paint() {
        const timestamp = performance.now()
        const delta =  timestamp - last_timestamp;
        

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const aspect = width / height;
        const angle = frame_idx / 100;

        let eye = [
            Math.sin(angle) * orbit_radius, // x
            Math.cos(angle) * orbit_radius, // y
            3 // z
        ];

        const target = [0.0, 0, 0.0];
        const up = [0, 0, 1];
        const view = mat4.lookAt(eye, target, up);

        const perspective = mat4.perspective(fov, aspect, near, far);
        const view_projection_matrix = mat4.multiply(perspective, view);

        const view_projection_buffer = device.createBuffer({
            size: view_projection_matrix.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });

        new Float32Array(view_projection_buffer.getMappedRange()).set(view_projection_matrix);
        view_projection_buffer.unmap();
        
        const vectors_buffer = device.createBuffer({
            size: vertices.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });

        new Float32Array(vectors_buffer.getMappedRange()).set(vertices);
        vectors_buffer.unmap();

        const hist_size = width * height;
        const hist_buffer = device.createBuffer({
            size: hist_size * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        const frame_idx_buffer = device.createBuffer({
            size: Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        const canvas_texture = context.getCurrentTexture();

        const bind_group = device.createBindGroup(
            {
                layout:  bind_group_layout,
                entries: [
                    { binding: 0, resource: canvas_texture.createView() },
                    {binding: 1, resource: {
                        buffer: view_projection_buffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * view_projection_matrix.length
                    }},
                    {binding: 2, resource: {
                        buffer: vectors_buffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * vertices.length
                    }},
                    {binding: 3, resource: {
                        buffer: hist_buffer,
                        offset: 0,
                        size: Int32Array.BYTES_PER_ELEMENT * hist_size
                    }},
                    { 
                        binding: 4, 
                        resource: {
                            buffer: frame_idx_buffer,
                            offset: 0,
                            size: Uint32Array.BYTES_PER_ELEMENT
                        }
                    },
                ],
            }
        );

        // Manually map and fill hist_buffer after creation
        device.queue.writeBuffer(
            hist_buffer,
            0,
            new Int32Array(hist_size).fill(0).buffer,
            0,
            hist_size * 4
        );

        device.queue.writeBuffer(
            frame_idx_buffer,
            0,
            new Float32Array([frame_idx]).buffer,
        );

        const splat_command_encoder = device.createCommandEncoder();
        const splat_compute_pass = splat_command_encoder.beginComputePass();
        splat_compute_pass.setPipeline(compute_splat_pipeline);
        splat_compute_pass.setBindGroup(0, bind_group);
        splat_compute_pass.dispatchWorkgroups(64, 64, 1); // 64, 64, 12
        splat_compute_pass.end();
        const command_splat_buffer = splat_command_encoder.finish();
        

        const screen_command_encoder = device.createCommandEncoder();
        const screen_compute_pass = screen_command_encoder.beginComputePass();
        screen_compute_pass.setPipeline(compute_screen_pipeline);
        screen_compute_pass.setBindGroup(0, bind_group);
        screen_compute_pass.dispatchWorkgroups(canvas_texture.width, canvas_texture.height);
        screen_compute_pass.end();    
        const command_screen_buffer = screen_command_encoder.finish();
        device.queue.submit([command_splat_buffer, command_screen_buffer]);
        //frame_idx++;
        frame_count++;

        if (delta > 1000) {
            console.log(`FPS: ${(frame_count)}`);
            frame_count = 0;
            last_timestamp = timestamp;
        }
        requestAnimationFrame(paint);        
    };
    setInterval(()=>frame_idx++,25);
    requestAnimationFrame(paint);
    
};

main();